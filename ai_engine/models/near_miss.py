import os
import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression

class NearMissPredictor:
    """
    Near-Miss Prediction Prototype.
    Predicts incidents BEFORE they happen based on rising risk patterns.
    """
    def __init__(self):
        self.model = LogisticRegression(random_state=42)
        self.is_trained = False
        
    def extract_features(self, risk_history, fatigue_level, hours_worked):
        """
        Extract predictive features from a window of risk scores.
        """
        if len(risk_history) < 2:
            return [0, 0, fatigue_level, hours_worked]
            
        current_risk = risk_history[-1]
        risk_trend = current_risk - risk_history[0]
        
        # Convert categorical fatigue to numeric
        fatigue_num = 0
        if fatigue_level == "HIGH": fatigue_num = 2
        elif fatigue_level == "MEDIUM": fatigue_num = 1
        
        return [current_risk, risk_trend, fatigue_num, hours_worked]

    def fit(self, X, y):
        self.model.fit(X, y)
        self.is_trained = True
        return self

    def predict(self, risk_history, fatigue_level, hours_worked):
        features = self.extract_features(risk_history, fatigue_level, hours_worked)
        
        if self.is_trained:
            prob = self.model.predict_proba([features])[0][1]
        else:
            # Prototype rule: rising risk + high fatigue + long hours = near miss
            current_risk, risk_trend, fatigue_num, hrs = features
            if current_risk > 60 and risk_trend > 10 and fatigue_num == 2 and hrs > 6:
                prob = 0.85
            else:
                prob = 0.1
                
        return {
            "near_miss_probability": round(prob, 2),
            "alert": prob > 0.7
        }

    def save_model(self, path):
        if self.is_trained:
            joblib.dump(self.model, path)
            print(f"Model saved to {path}")

    def load_model(self, path):
        if os.path.exists(path):
            self.model = joblib.load(path)
            self.is_trained = True
            print(f"Model loaded from {path}")
