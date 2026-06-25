import os
import joblib
import numpy as np
import pandas as pd
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report

class FallDetector:
    def __init__(self, threshold=4.0):
        self.threshold = threshold
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('svm', SVC(kernel='rbf', probability=True, random_state=42))
        ])
        self.is_trained = False
        
    def extract_features(self, ax, ay, az):
        """Extract features from accelerometer axes."""
        # Simple signal magnitude area / vector for demo purposes
        # Assuming ax, ay, az are scalar values for a single point in time
        sma = abs(ax) + abs(ay) + abs(az)
        smv = np.sqrt(ax**2 + ay**2 + az**2)
        return [sma, smv, ax, ay, az]
        
    def rule_based_predict(self, smv):
        """Baseline rule-based detection using threshold."""
        return 1 if smv > self.threshold else 0

    def fit(self, X, y):
        """Train the SVM model."""
        self.model.fit(X, y)
        self.is_trained = True
        return self

    def predict(self, ax, ay, az):
        """Ensemble prediction: Rule-based OR SVM."""
        features = self.extract_features(ax, ay, az)
        smv = features[1]
        
        rule_pred = self.rule_based_predict(smv)
        
        svm_pred = 0
        svm_prob = 0.0
        if self.is_trained:
            # Reshape for single sample prediction
            X = np.array([features])
            svm_pred = self.model.predict(X)[0]
            svm_prob = self.model.predict_proba(X)[0][1] # Probability of class 1 (FALL)
            
        final_pred = rule_pred or svm_pred
        confidence = max(svm_prob, 1.0 if rule_pred else 0.0)
        
        return {
            "prediction": "FALL" if final_pred else "SAFE",
            "confidence": confidence,
            "rule_triggered": bool(rule_pred),
            "svm_triggered": bool(svm_pred)
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

# Quick test if run directly
if __name__ == "__main__":
    detector = FallDetector()
    print("Test Normal:", detector.predict(0.1, 1.0, 0.0))
    print("Test Fall:", detector.predict(4.5, 4.2, 4.1))
