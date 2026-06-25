import os
import sys
import pytest
import numpy as np
import pandas as pd
import torch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.fall_detector import FallDetector
from models.hr_anomaly import HRAnomalyDetector
from models.temp_alert import TempAlertModel
from models.fatigue_predictor import FatiguePredictor
from models.risk_engine import RiskEngine
from models.trend_forecast import TrendForecaster

def test_fall_detector():
    detector = FallDetector()
    # Test normal movement
    safe_pred = detector.predict(0.1, 1.0, 0.1)
    assert safe_pred["prediction"] == "SAFE"
    
    # Test fall movement (high acceleration)
    fall_pred = detector.predict(4.5, 4.0, 4.0)
    assert fall_pred["prediction"] == "FALL"

def test_hr_anomaly():
    detector = HRAnomalyDetector(z_threshold=3.0)
    # Build normal history
    for _ in range(30):
        detector.predict(75)
    
    # Normal reading
    normal = detector.predict(76)
    assert normal["prediction"] == "OK"
    
    # Anomalous spike
    anomaly = detector.predict(150)
    assert anomaly["prediction"] == "ANOMALY"

def test_temp_alert():
    model = TempAlertModel()
    
    low = model.predict(body_temp=36.5, env_temp=25.0)
    assert low["level"] == "LOW"
    
    med = model.predict(body_temp=38.0, env_temp=30.0)
    assert med["level"] == "MEDIUM"
    
    high = model.predict(body_temp=39.0, env_temp=42.0)
    assert high["level"] == "HIGH"

def test_fatigue_predictor():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    predictor = FatiguePredictor(device=device)
    
    # Ensure LSTM model initialized properly and can do a forward pass
    seq_data = torch.randn(1, 10, 6).to(device)
    out = predictor.lstm_model(seq_data)
    assert out.shape == (1, 3) # 3 classes

def test_risk_engine():
    engine = RiskEngine()
    
    # Mock model outputs
    fall = {"prediction": "SAFE", "confidence": 0.0}
    hr = {"anomaly_score": 0.1}
    temp = {"level": "LOW"}
    fatigue = {"fatigue_level": "LOW"}
    
    # Test low risk scenario
    low_risk = engine.calculate_risk(fall, hr, temp, fatigue, zone_hazard=1.0, sos_active=False)
    assert low_risk["composite_score"] < 30
    assert low_risk["risk_level"] == "LOW"
    
    # Test high risk scenario (SOS active)
    sos_risk = engine.calculate_risk(fall, hr, temp, fatigue, zone_hazard=1.0, sos_active=True)
    assert sos_risk["composite_score"] > low_risk["composite_score"]

def test_trend_forecast():
    forecaster = TrendForecaster()
    # Need at least 14 days
    data = pd.Series([5] * 20) 
    
    success = forecaster.fit(data)
    assert success == True
    
    forecast = forecaster.forecast(7)
    assert len(forecast["forecast"]) == 7
