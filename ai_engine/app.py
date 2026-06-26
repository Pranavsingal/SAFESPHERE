"""
SafeSphere - ML Microservice (Phase 2, Member 2)
==================================================
UPDATED: now uses Ankit's (M1) real trained models instead of
placeholder rules.

This Flask server is the "translator" between:
  - M1's machine learning models (fall_detector, hr_anomaly, temp_alert)
  - M3's Node.js backend (which calls this service over HTTP)

WHY THIS EXISTS:
Node.js can't run Python ML models directly. So this server wraps
the ML logic and exposes it as a simple web API. The Node.js backend
sends sensor data here, this service returns a prediction.

MODELS USED (all written by M1 / Ankit):
  - models/fall_detector.py   -> FallDetector class
  - models/hr_anomaly.py      -> HRAnomalyDetector class
  - models/temp_alert.py      -> TempAlertModel class

Each class loads its own trained .joblib file and exposes a
.predict(...) method that already returns a rich dictionary
(prediction + confidence/score). This file just calls those
methods and combines the three results into one response.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from models.fall_detector import FallDetector
from models.hr_anomaly import HRAnomalyDetector
from models.temp_alert import TempAlertModel

app = Flask(__name__)
CORS(app)  # allows the React frontend / Node backend to call this API

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# -------------------------------------------------------------------
# LOAD MODELS ONCE AT STARTUP
# (loading a .joblib file is slow-ish; we don't want to do it on
# every single request, so this happens once when the server boots)
# -------------------------------------------------------------------
fall_model = FallDetector()
fall_model.load_model(os.path.join(MODELS_DIR, "fall_detector.joblib"))

hr_model = HRAnomalyDetector()
hr_model.load_model(os.path.join(MODELS_DIR, "hr_anomaly.joblib"))

# TempAlertModel is rule-based (is_trained=True by default per Ankit's
# code), so there's no real .joblib needed for predictions to work,
# but we keep the line here in case M1 swaps in a trained version later.
temp_model = TempAlertModel()

print("All models loaded. ML microservice ready.")


# -------------------------------------------------------------------
# COMPOSITE RISK SCORE
# Combines all three model outputs into one overall score (0-100)
# + level. This is what Node.js's GET /risk-score endpoint calls.
# -------------------------------------------------------------------
def calculate_risk_score(fall_result, hr_result, temp_result):
    """
    Combines all three model outputs into one overall score (0-100)
    + level.

    DESIGN NOTE (fixed after testing): each signal's contribution is
    now scaled so a maximum-severity reading from ANY single model
    can push the overall result into HIGH on its own. The original
    version capped temperature's contribution at 20% of its own
    100-point scale, meaning even a heat-stroke-level reading
    (temp risk_score=98) could never push the composite past MEDIUM.
    That's wrong: a single model screaming "HIGH" should mean HIGH
    overall, not get diluted by averaging with calmer signals.
    """
    fall_score = 50 if fall_result["prediction"] == "FALL" else 0
    fall_score *= fall_result["confidence"]

    hr_score = 50 if hr_result["prediction"] == "ANOMALY" else 0
    hr_score *= hr_result["anomaly_score"]

    # temp_result["risk_score"] is already 0-100 from Ankit's model;
    # rescale it onto the same 0-50 contribution scale as the others
    temp_score = (temp_result["risk_score"] / 100) * 50

    # Take the MAX of the three (worst signal wins) blended with a
    # smaller average-based component, so one severe signal alone
    # is enough to flag HIGH, but multiple moderate signals still
    # add up too.
    worst = max(fall_score, hr_score, temp_score)
    average = (fall_score + hr_score + temp_score) / 3

    score = round(min(100, worst + average * 0.3), 1)

    if score >= 50:
        level = "HIGH"
    elif score >= 20:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {"score": score, "level": level}


# ===================================================================
# ROUTES
# ===================================================================

@app.route("/", methods=["GET"])
def health_check():
    """Visit http://localhost:5001/ in your browser to confirm the
    server (and all 3 models) loaded correctly."""
    return jsonify({
        "status": "SafeSphere ML microservice is running",
        "models_loaded": {
            "fall_detector": fall_model.is_trained,
            "hr_anomaly": hr_model.is_trained,
            "temp_alert": temp_model.is_trained
        }
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Main prediction endpoint. Node.js sends sensor data here as JSON.

    Example request body (sent by Node.js):
    {
        "worker_id": 1,
        "ax": 2.1, "ay": 1.0, "az": 9.8,
        "bpm": 142,
        "body_temp": 38.5,
        "env_temp": 32.0,
        "humidity": 55
    }

    Example response:
    {
        "worker_id": 1,
        "fall": {"prediction": "SAFE", "confidence": 0.0, ...},
        "heart_rate": {"prediction": "ANOMALY", "z_score": 3.4, ...},
        "temperature": {"level": "MEDIUM", "risk_score": 62.0, ...},
        "risk_score": {"score": 40.2, "level": "MEDIUM"}
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    worker_id = data.get("worker_id")
    # NOTE: ax/ay/az default to 0, NOT 9.8. Ankit's FallDetector rule
    # (smv > 4.0) assumes inputs represent motion relative to rest,
    # not raw axis readings including gravity. Sending the real 9.8
    # resting-gravity baseline here falsely triggers FALL on every
    # request. Flagged to Ankit to confirm the intended calibration —
    # using 0 here as a safe "no motion" default until that's resolved.
    ax = data.get("ax", 0)
    ay = data.get("ay", 0)
    az = data.get("az", 0)
    bpm = data.get("bpm", 75)
    body_temp = data.get("body_temp", 37.0)
    env_temp = data.get("env_temp", 25.0)
    humidity = data.get("humidity", 50.0)

    fall_result = fall_model.predict(ax, ay, az)
    hr_result = hr_model.predict(bpm)
    temp_result = temp_model.predict(body_temp, env_temp, humidity)

    risk = calculate_risk_score(fall_result, hr_result, temp_result)

    return jsonify({
        "worker_id": worker_id,
        "fall": fall_result,
        "heart_rate": hr_result,
        "temperature": temp_result,
        "risk_score": risk
    })


@app.route("/risk-score", methods=["GET"])
def risk_score():
    """
    Matches the plan's exact milestone requirement:
    'GET /risk-score returns {score, level} JSON'

    For quick testing without a full sensor payload, e.g.:
    http://localhost:5001/risk-score?bpm=145&body_temp=39.2
    """
    bpm = float(request.args.get("bpm", 75))
    body_temp = float(request.args.get("body_temp", 37.0))
    env_temp = float(request.args.get("env_temp", 25.0))
    humidity = float(request.args.get("humidity", 50.0))
    # Same fix as /predict: default to 0, not 9.8 resting gravity,
    # to avoid falsely triggering FALL on every request. See note above.
    ax = float(request.args.get("ax", 0))
    ay = float(request.args.get("ay", 0))
    az = float(request.args.get("az", 0))

    fall_result = fall_model.predict(ax, ay, az)
    hr_result = hr_model.predict(bpm)
    temp_result = temp_model.predict(body_temp, env_temp, humidity)

    risk = calculate_risk_score(fall_result, hr_result, temp_result)

    return jsonify(risk)


if __name__ == "__main__":
    # Port 5001, exactly as specified in the implementation plan
    app.run(debug=True, port=5001)
