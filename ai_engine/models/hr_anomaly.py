import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

class HRAnomalyDetector:
    def __init__(self, contamination=0.05, z_threshold=3.0):
        self.contamination = contamination
        self.z_threshold = z_threshold
        self.model = IsolationForest(contamination=self.contamination, random_state=42)
        self.is_trained = False
        self.history = []
        self.history_limit = 60 # Keep last 60 readings
        
    def add_reading(self, bpm):
        """Add a reading to history."""
        self.history.append(bpm)
        if len(self.history) > self.history_limit:
            self.history.pop(0)
            
    def get_features(self, current_bpm):
        """Extract features from current bpm and history."""
        if len(self.history) < 5:
            # Not enough history
            return [current_bpm, current_bpm, 0, 0]
            
        rolling_mean = np.mean(self.history)
        rolling_std = np.std(self.history)
        
        # Avoid division by zero and tiny stds inflating z-scores
        if rolling_std < 1.0:
            rolling_std = 1.0
            
        z_score = (current_bpm - rolling_mean) / rolling_std
        rate_of_change = current_bpm - self.history[-1] if len(self.history) > 0 else 0
        
        return [current_bpm, rolling_mean, z_score, rate_of_change]
        
    def rule_based_predict(self, z_score):
        """Baseline rule-based detection using Z-score."""
        return 1 if abs(z_score) > self.z_threshold else 0

    def fit(self, X):
        """Train the Isolation Forest model. X should be an array of feature vectors."""
        self.model.fit(X)
        self.is_trained = True
        return self

    def predict(self, current_bpm):
        """Ensemble prediction: Z-score OR Isolation Forest."""
        features = self.get_features(current_bpm)
        z_score = features[2]
        
        rule_pred = self.rule_based_predict(z_score)
        self.add_reading(current_bpm)
        
        iso_pred = 0
        anomaly_score = 0.0
        if self.is_trained:
            # Reshape for single sample prediction
            X = np.array([features])
            # Isolation forest returns -1 for anomaly, 1 for normal
            pred = self.model.predict(X)[0]
            iso_pred = 1 if pred == -1 else 0
            
            # Decision function: lower is more anomalous
            score = self.model.decision_function(X)[0] 
            # Normalize to 0-1 (higher = more anomalous)
            anomaly_score = 1.0 - (1.0 / (1.0 + np.exp(-score)))
            
        final_pred = rule_pred or iso_pred
        # If untrained, base confidence entirely on z_score magnitude relative to threshold
        confidence = anomaly_score if self.is_trained else min(1.0, abs(z_score) / (self.z_threshold * 2))
        
        return {
            "prediction": "ANOMALY" if final_pred else "OK",
            "anomaly_score": confidence,
            "rule_triggered": bool(rule_pred),
            "ml_triggered": bool(iso_pred),
            "z_score": round(z_score, 2)
        }

    def save_model(self, path):
        if self.is_trained:
            joblib.dump(self.model, path)
            print(f"Model saved to {path}")
        else:
            print("Model is not trained yet. Cannot save.")

    def load_model(self, path):
        if os.path.exists(path):
            self.model = joblib.load(path)
            self.is_trained = True
            print(f"Model loaded from {path}")
        else:
            print(f"Model file not found at {path}")

# Quick test
if __name__ == "__main__":
    detector = HRAnomalyDetector()
    # Build history
    for _ in range(30):
        detector.predict(75)
    print("Normal reading:", detector.predict(76))
    print("Spike reading:", detector.predict(150))
