import os
import joblib
import numpy as np

class TempAlertModel:
    """
    Heat Stress / Temperature Alert Model.
    Currently rule-based using OSHA/NIOSH threshold concepts.
    Can be extended with ML to learn custom thresholds per profile.
    """
    def __init__(self):
        self.history = []
        self.history_limit = 15 # Rolling 15 readings
        self.is_trained = True # Rule-based doesn't need training by default
        
    def add_reading(self, temp):
        self.history.append(temp)
        if len(self.history) > self.history_limit:
            self.history.pop(0)

    def get_rolling_avg(self, current_temp):
        if not self.history:
            return current_temp
        return np.mean(self.history)

    def calculate_heat_index(self, env_temp, humidity=50):
        """Simplified Heat Index calculation if humidity is known."""
        # Using a simplified formula for demo; a real one would use Rothfusz regression
        c1 = -42.379
        c2 = 2.04901523
        c3 = 10.14333127
        c4 = -0.22475541
        c5 = -6.83783 * (10**-3)
        c6 = -5.481717 * (10**-2)
        c7 = 1.22874 * (10**-3)
        c8 = 8.5282 * (10**-4)
        c9 = -1.99 * (10**-6)

        # Assuming env_temp is in Celsius, convert to Fahrenheit for formula
        T = (env_temp * 9/5) + 32
        R = humidity

        HI = c1 + (c2 * T) + (c3 * R) + (c4 * T * R) + (c5 * T**2) + (c6 * R**2) + \
             (c7 * T**2 * R) + (c8 * T * R**2) + (c9 * T**2 * R**2)
             
        # Convert back to Celsius
        HI_C = (HI - 32) * 5/9
        return HI_C

    def predict(self, body_temp, env_temp=25.0, humidity=50.0):
        """
        Evaluate heat stress risk.
        Body temp > 38.5C is high risk.
        Body temp 37.5-38.5C is medium risk.
        """
        rolling_temp = self.get_rolling_avg(body_temp)
        self.add_reading(body_temp)
        
        heat_index = self.calculate_heat_index(env_temp, humidity)
        
        # High Risk
        if body_temp > 38.5 or env_temp > 40.0 or heat_index > 40.0:
            level = "HIGH"
            score = min(100, 90 + (body_temp - 38.5) * 10)
        # Medium Risk
        elif 37.5 <= body_temp <= 38.5 or 30.0 <= env_temp <= 40.0 or heat_index > 32.0:
            level = "MEDIUM"
            score = 50 + (body_temp - 37.5) * 40
        # Low Risk
        else:
            level = "LOW"
            score = max(0, 10 + (body_temp - 36.5) * 10)
            
        return {
            "level": level,
            "risk_score": round(score, 2),
            "rolling_body_temp": round(rolling_temp, 2),
            "heat_index": round(heat_index, 2)
        }

    def fit(self, X, y):
        # Stub for future ML expansion
        pass

    def save_model(self, path):
        joblib.dump({"thresholds": {"high": 38.5, "med": 37.5}}, path)
        print(f"Model saved to {path}")

    def load_model(self, path):
        if os.path.exists(path):
            data = joblib.load(path)
            print(f"Model loaded from {path}")
        else:
            print(f"Model file not found at {path}")

if __name__ == "__main__":
    model = TempAlertModel()
    print("Normal:", model.predict(36.8, 25.0))
    print("Warning:", model.predict(37.8, 32.0))
    print("Danger:", model.predict(39.1, 42.0))
