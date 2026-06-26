import os
import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

class RiskEngine:
    def __init__(self):
        # Default weights if ML model is not trained
        self.weights = {
            "fall": 0.30,
            "hr": 0.25,
            "heat": 0.25,
            "fatigue": 0.20
        }
        self.gb_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.is_trained = False
        
    def _map_level_to_score(self, level, risk_type="generic"):
        """Map categorical levels to 0-100 scores."""
        level = str(level).upper()
        if level == "HIGH" or level == "ANOMALY" or level == "FALL":
            return 90
        elif level == "MEDIUM":
            return 50
        elif level == "LOW" or level == "OK" or level == "SAFE":
            return 10
        return 0

    def calculate_risk(self, fall_data, hr_data, temp_data, fatigue_data, zone_hazard=1.0, sos_active=False):
        """
        Calculate dynamic risk score.
        Input data should be dicts returned from the respective models.
        """
        # Extract base scores
        fall_score = fall_data.get('confidence', 0) * 100 if fall_data.get('prediction') == 'FALL' else 0
        hr_score = hr_data.get('anomaly_score', 0) * 100
        heat_score = temp_data.get('risk_score', self._map_level_to_score(temp_data.get('level')))
        fatigue_score = self._map_level_to_score(fatigue_data.get('fatigue_level', 'LOW'))
        
        # ML Prediction if available
        if self.is_trained:
            features = np.array([[fall_score, hr_score, heat_score, fatigue_score, float(zone_hazard), float(sos_active)]])
            final_score = self.gb_model.predict(features)[0]
        else:
            # Weighted rule-based calculation
            base_score = (
                self.weights['fall'] * fall_score +
                self.weights['hr'] * hr_score +
                self.weights['heat'] * heat_score +
                self.weights['fatigue'] * fatigue_score
            )
            
            # Multipliers
            sos_mult = 2.0 if sos_active else 1.0
            final_score = base_score * zone_hazard * sos_mult
            
        # Bound between 0 and 100
        final_score = max(0.0, min(100.0, final_score))
        
        # Categorize
        if final_score >= 80:
            level = "CRITICAL"
        elif final_score >= 60:
            level = "HIGH"
        elif final_score >= 30:
            level = "MEDIUM"
        else:
            level = "LOW"
            
        return {
            "composite_score": round(final_score, 2),
            "risk_level": level,
            "components": {
                "fall_contribution": round(fall_score, 2),
                "hr_contribution": round(hr_score, 2),
                "heat_contribution": round(heat_score, 2),
                "fatigue_contribution": round(fatigue_score, 2)
            }
        }
        
    def save_model(self, path):
        if self.is_trained:
            joblib.dump(self.gb_model, path)
            
    def load_model(self, path):
        if os.path.exists(path):
            self.gb_model = joblib.load(path)
            self.is_trained = True
