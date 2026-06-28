"""
SafeSphere - ML Microservice (Phase 2 + Phase 3, Member 2)
=============================================================
UPDATED (Phase 3): now uses Ankit's (M1) real RiskEngine for the
composite score, instead of the simpler hand-built formula from
Phase 2. The Phase 2 formula is gone — RiskEngine replaces it
entirely, since it does the same job better (it already solves
the "one severe signal should dominate" problem via multipliers,
which is exactly what we patched manually back in Phase 2).

This Flask server is the "translator" between:
  - M1's machine learning models (fall, hr, temp, risk_engine)
  - M3's Node.js backend (which calls this service over HTTP)

MODELS USED (all written by M1 / Ankit):
  - models/fall_detector.py   -> FallDetector class
  - models/hr_anomaly.py      -> HRAnomalyDetector class
  - models/temp_alert.py      -> TempAlertModel class
  - models/risk_engine.py     -> RiskEngine class (NEW, Phase 3)

FATIGUE NOTE: RiskEngine.calculate_risk() also accepts fatigue_data,
but Ankit's FatiguePredictor needs a history of past readings (a
pandas DataFrame), not a single live reading — and its own ML models
are untrained (is_rf_trained/is_lstm_trained = False), so there's no
real fatigue prediction to plug in yet. We pass a safe LOW placeholder
for now (matching RiskEngine's own default), and will wire in the
real FatiguePredictor once Ankit finishes training it and the
history-tracking story is sorted out. This is intentional, not an
oversight — see /predict route comments for the exact spot to change.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from models.fall_detector import FallDetector
from models.hr_anomaly import HRAnomalyDetector
from models.temp_alert import TempAlertModel
from models.risk_engine import RiskEngine

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
# code), so there's no real .joblib needed for predictions to work.
temp_model = TempAlertModel()

# RiskEngine: loads its trained gradient-boosting model if available,
# otherwise falls back to its own sensible weighted-rules formula
# (is_trained=False by default — that's fine, the rule-based path
# already handles severity correctly via weights + multipliers).
risk_engine = RiskEngine()
risk_engine_path = os.path.join(MODELS_DIR, "risk_engine.joblib")
risk_engine.load_model(risk_engine_path)

print("All models loaded. ML microservice ready.")
print(f"RiskEngine using {'trained ML model' if risk_engine.is_trained else 'rule-based weighted formula'}.")


# ===================================================================
# ROUTES
# ===================================================================

@app.route("/", methods=["GET"])
def health_check():
    """Visit http://localhost:5001/ in your browser to confirm the
    server (and all models) loaded correctly."""
    return jsonify({
        "status": "SafeSphere ML microservice is running",
        "models_loaded": {
            "fall_detector": fall_model.is_trained,
            "hr_anomaly": hr_model.is_trained,
            "temp_alert": temp_model.is_trained,
            "risk_engine": True,
            "risk_engine_uses_ml": risk_engine.is_trained
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
        "humidity": 55,
        "zone_hazard": 1.2,
        "sos_pressed": false
    }

    Example response:
    {
        "worker_id": 1,
        "fall": {...}, "heart_rate": {...}, "temperature": {...},
        "risk_score": {
            "composite_score": 62.4,
            "risk_level": "HIGH",
            "components": {
                "fall_contribution": 0,
                "hr_contribution": 51.2,
                "heat_contribution": 98.0,
                "fatigue_contribution": 10
            }
        }
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

    # New for Phase 3 / RiskEngine:
    # zone_hazard is a multiplier (1.0 = normal zone, >1.0 = a zone
    # the team has flagged as inherently more dangerous, e.g. near
    # heavy machinery). Defaults to 1.0 (no extra hazard) until the
    # team defines real per-zone hazard values.
    zone_hazard = data.get("zone_hazard", 1.0)
    sos_pressed = data.get("sos_pressed", False)

    fall_result = fall_model.predict(ax, ay, az)
    hr_result = hr_model.predict(bpm)
    temp_result = temp_model.predict(body_temp, env_temp, humidity)

    # TODO: REPLACE WITH REAL FATIGUE PREDICTION
    # Once Ankit's FatiguePredictor is trained AND we have a way to
    # track each worker's reading history over time, swap this for:
    #   fatigue_result = fatigue_model.predict(worker_history_df)
    # For now, LOW is a safe, honest placeholder — it matches
    # RiskEngine's own default and doesn't fabricate a fatigue
    # reading we have no real basis for.
    fatigue_result = {"fatigue_level": "LOW"}

    risk = risk_engine.calculate_risk(
        fall_data=fall_result,
        hr_data=hr_result,
        temp_data=temp_result,
        fatigue_data=fatigue_result,
        zone_hazard=zone_hazard,
        sos_active=sos_pressed
    )

    return jsonify({
        "worker_id": worker_id,
        "fall": fall_result,
        "heart_rate": hr_result,
        "temperature": temp_result,
        "fatigue": fatigue_result,
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
    ax = float(request.args.get("ax", 0))
    ay = float(request.args.get("ay", 0))
    az = float(request.args.get("az", 0))
    zone_hazard = float(request.args.get("zone_hazard", 1.0))
    sos_pressed = request.args.get("sos_pressed", "false").lower() == "true"

    fall_result = fall_model.predict(ax, ay, az)
    hr_result = hr_model.predict(bpm)
    temp_result = temp_model.predict(body_temp, env_temp, humidity)
    fatigue_result = {"fatigue_level": "LOW"}

    risk = risk_engine.calculate_risk(
        fall_data=fall_result,
        hr_data=hr_result,
        temp_data=temp_result,
        fatigue_data=fatigue_result,
        zone_hazard=zone_hazard,
        sos_active=sos_pressed
    )

    # Keep the response shape consistent with what the plan's
    # milestone expects: {score, level}
    return jsonify({
        "score": risk["composite_score"],
        "level": risk["risk_level"]
    })


if __name__ == "__main__":
    # Port 5001, exactly as specified in the implementation plan
    app.run(debug=True, port=5001)
