import os
import joblib
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
import warnings
warnings.filterwarnings('ignore')

class TrendForecaster:
    def __init__(self):
        self.model = None
        self.is_trained = False
        
    def fit(self, historical_data):
        """
        Train ARIMA model on historical incident counts.
        historical_data: pd.Series of daily/weekly incident counts.
        """
        if len(historical_data) < 14:
            print("Warning: Not enough data for ARIMA. Need at least 14 days.")
            return False
            
        # Simple ARIMA(1,1,1) for demo
        # In reality, parameters would be tuned via grid search
        self.model = ARIMA(historical_data, order=(1, 1, 1))
        self.model = self.model.fit()
        self.is_trained = True
        return True
        
    def forecast(self, steps=7):
        """Forecast future incident trends."""
        if not self.is_trained:
            # Return dummy flat forecast if not trained
            return {
                "forecast": [0] * steps,
                "lower_ci": [0] * steps,
                "upper_ci": [0] * steps
            }
            
        forecast = self.model.get_forecast(steps=steps)
        pred_mean = forecast.predicted_mean.values
        pred_ci = forecast.conf_int()
        
        # Ensure no negative counts
        pred_mean = np.maximum(0, pred_mean)
        lower_ci = np.maximum(0, pred_ci.iloc[:, 0].values)
        upper_ci = np.maximum(0, pred_ci.iloc[:, 1].values)
        
        return {
            "forecast": pred_mean.round(2).tolist(),
            "lower_ci": lower_ci.round(2).tolist(),
            "upper_ci": upper_ci.round(2).tolist()
        }
        
    def save_model(self, path):
        if self.is_trained:
            joblib.dump(self.model, path)
            
    def load_model(self, path):
        if os.path.exists(path):
            self.model = joblib.load(path)
            self.is_trained = True
