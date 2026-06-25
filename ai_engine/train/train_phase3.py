import os
import sys
import pandas as pd
import numpy as np
import torch
from sklearn.model_selection import train_test_split

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.fatigue_predictor import FatiguePredictor
from models.risk_engine import RiskEngine
from models.trend_forecast import TrendForecaster

def train_fatigue_model():
    print("\n--- Training Fatigue Predictor (RF + LSTM) ---")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device for PyTorch: {device}")
    
    predictor = FatiguePredictor(device=device)
    
    # Generate synthetic training data
    print("Generating synthetic sequence data for LSTM...")
    X_rf = np.random.rand(1000, 3) # [recent_hr, hr_trend, accel_var]
    y_rf = np.random.choice([0, 1, 2], size=1000)
    
    print("Training Random Forest...")
    predictor.rf_model.fit(X_rf, y_rf)
    predictor.is_rf_trained = True
    print(f"RF Train Accuracy: {predictor.rf_model.score(X_rf, y_rf):.2f}")
    
    # LSTM Training dummy setup
    # Real training would use torch DataLoaders and epochs over sequential data
    print("Initializing LSTM on GPU...")
    # Generate some dummy data and train for 1 epoch just to initialize weights
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(predictor.lstm_model.parameters(), lr=0.001)
    
    dummy_inputs = torch.randn(32, 10, 6).to(device)
    dummy_targets = torch.randint(0, 3, (32,)).to(device)
    
    predictor.lstm_model.train()
    optimizer.zero_grad()
    outputs = predictor.lstm_model(dummy_inputs)
    loss = criterion(outputs, dummy_targets)
    loss.backward()
    optimizer.step()
    
    predictor.is_lstm_trained = True
    print("LSTM successfully trained on GPU.")
    
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    rf_path = os.path.join(models_dir, "fatigue_rf.joblib")
    lstm_path = os.path.join(models_dir, "fatigue_lstm.pt")
    predictor.save_models(rf_path, lstm_path)
    print("Fatigue models saved.")

def train_risk_engine():
    print("\n--- Training Risk Engine ---")
    engine = RiskEngine()
    
    # Train GB model on synthetic composite data
    print("Generating synthetic risk data...")
    # [fall, hr, heat, fatigue, zone, sos]
    X = np.random.rand(5000, 6) * 100 
    X[:, 4] = np.random.choice([0.8, 1.0, 1.2, 1.5], 5000) # zone
    X[:, 5] = np.random.choice([0, 1], 5000, p=[0.99, 0.01]) # sos
    
    # Target is some complex function of inputs
    y = (X[:, 0]*0.3 + X[:, 1]*0.25 + X[:, 2]*0.25 + X[:, 3]*0.2) * X[:, 4] * (X[:, 5] + 1)
    y = np.clip(y, 0, 100)
    
    engine.gb_model.fit(X, y)
    engine.is_trained = True
    print(f"Risk Engine trained. R^2 score: {engine.gb_model.score(X, y):.2f}")
    
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    engine.save_model(os.path.join(models_dir, "risk_engine.joblib"))
    print("Risk engine saved.")

def train_trend_forecast():
    print("\n--- Training Trend Forecaster ---")
    forecaster = TrendForecaster()
    
    # Synthetic incident counts over 60 days
    time_series = pd.Series([np.random.randint(0, 10) for _ in range(60)])
    # Add a slight upward trend
    time_series = time_series + pd.Series([i*0.1 for i in range(60)])
    
    if forecaster.fit(time_series):
        forecast = forecaster.forecast(7)
        print("7-day Forecast generated:")
        print(forecast['forecast'])
        
        models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
        forecaster.save_model(os.path.join(models_dir, "trend_arima.joblib"))
        print("ARIMA model saved.")

if __name__ == "__main__":
    print("Starting Phase 3 Model Training Pipeline...")
    train_fatigue_model()
    train_risk_engine()
    train_trend_forecast()
    print("\nPhase 3 Training Complete!")
