import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import torch
import torch.nn as pd_nn # alias to avoid confusion with pandas
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

class FatigueLSTM(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_layers, output_dim):
        super(FatigueLSTM, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
        self.fc1 = nn.Linear(hidden_dim, 32)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(32, output_dim)
        
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc1(out[:, -1, :])
        out = self.relu(out)
        out = self.fc2(out)
        return out

class FatiguePredictor:
    def __init__(self, device="cuda" if torch.cuda.is_available() else "cpu"):
        self.device = device
        print(f"FatiguePredictor initialized on device: {self.device}")
        
        self.rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        
        # input_dim=6: hr, temp, accel_mag, time_since_rest, etc.
        self.lstm_model = FatigueLSTM(input_dim=6, hidden_dim=64, num_layers=2, output_dim=3).to(self.device)
        self.is_rf_trained = False
        self.is_lstm_trained = False
        self.classes = ["LOW", "MEDIUM", "HIGH"]
        
    def extract_features(self, history_df):
        """Extract features for RF model from a window of history."""
        # Simple extraction for demo
        recent_hr = history_df['heart_rate'].mean()
        hr_trend = history_df['heart_rate'].diff().mean()
        accel_var = history_df[['accel_x', 'accel_y', 'accel_z']].var().mean()
        
        return [recent_hr, hr_trend if not np.isnan(hr_trend) else 0, accel_var]

    def prep_lstm_data(self, history_df, seq_length=10):
        """Prepare sequence data for LSTM."""
        # Simplified for demo: return dummy tensor
        # In reality, this would slice history_df into sequences of length seq_length
        return torch.randn(1, seq_length, 6).to(self.device)

    def predict(self, history_df):
        """Predict using ensemble of RF and LSTM."""
        rf_pred_idx = 0
        lstm_pred_idx = 0
        
        if self.is_rf_trained:
            features = self.extract_features(history_df)
            rf_pred_idx = self.rf_model.predict([features])[0]
            
        if self.is_lstm_trained:
            self.lstm_model.eval()
            with torch.no_grad():
                seq_data = self.prep_lstm_data(history_df)
                out = self.lstm_model(seq_data)
                lstm_pred_idx = torch.argmax(out, dim=1).item()
                
        # Ensemble logic: take highest predicted fatigue
        final_idx = max(rf_pred_idx, lstm_pred_idx)
        
        return {
            "fatigue_level": self.classes[final_idx],
            "rf_prediction": self.classes[rf_pred_idx] if self.is_rf_trained else "N/A",
            "lstm_prediction": self.classes[lstm_pred_idx] if self.is_lstm_trained else "N/A"
        }

    def save_models(self, rf_path, lstm_path):
        if self.is_rf_trained:
            joblib.dump(self.rf_model, rf_path)
        if self.is_lstm_trained:
            torch.save(self.lstm_model.state_dict(), lstm_path)
            
    def load_models(self, rf_path, lstm_path):
        if os.path.exists(rf_path):
            self.rf_model = joblib.load(rf_path)
            self.is_rf_trained = True
            
        if os.path.exists(lstm_path):
            self.lstm_model.load_state_dict(torch.load(lstm_path, map_location=self.device))
            self.lstm_model.eval()
            self.is_lstm_trained = True
