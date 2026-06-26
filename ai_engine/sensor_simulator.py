import argparse
import csv
import json
import os
import random
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

class SensorSimulator:
    def __init__(self, num_workers, rows_per_worker, output_dir):
        self.num_workers = num_workers
        self.rows_per_worker = rows_per_worker
        self.output_dir = output_dir
        self.worker_profiles = ["construction", "warehouse", "factory"]
        
        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)

    def _generate_worker_data(self, worker_id, start_time):
        profile = random.choice(self.worker_profiles)
        data = []
        current_time = start_time
        
        # Base stats depending on profile
        base_hr = 72 if profile != "construction" else 80
        base_temp = 36.5
        
        # Track ongoing states
        fatigue_factor = 0.0
        
        for i in range(self.rows_per_worker):
            # Time advances 1 second per row
            current_time += timedelta(seconds=1)
            
            # Simulate fatigue increasing over time
            fatigue_factor = (i / self.rows_per_worker) * 0.5 
            
            # Heart Rate: normal with occasional spikes and fatigue drift
            hr = int(np.random.normal(base_hr + (fatigue_factor * 15), 5))
            if random.random() < 0.05: # 5% chance of HR anomaly (high exertion)
                hr += random.randint(30, 60)
                
            # Temperature: normal with occasional heat stress
            temp = np.random.normal(base_temp + (fatigue_factor * 0.5), 0.2)
            if random.random() < 0.02: # 2% chance of heat stress
                temp += random.uniform(1.0, 3.0)
                
            # Accelerometer: walking/working
            ax = np.random.normal(0, 0.5)
            ay = np.random.normal(1.0, 0.5) # gravity + some movement
            az = np.random.normal(0, 0.5)
            
            # Fall simulation
            is_fall = 0
            if random.random() < 0.005: # 0.5% chance of fall
                is_fall = 1
                ax = np.random.normal(4.0, 1.0) # sudden spike
                ay = np.random.normal(4.0, 1.0)
                az = np.random.normal(4.0, 1.0)
                
            # SOS Button
            sos = 1 if random.random() < 0.001 else 0
            
            row = {
                "worker_id": worker_id,
                "profile": profile,
                "timestamp": current_time.isoformat(),
                "heart_rate": hr,
                "temperature": round(temp, 2),
                "accel_x": round(ax, 3),
                "accel_y": round(ay, 3),
                "accel_z": round(az, 3),
                "is_fall": is_fall,
                "sos_active": sos
            }
            data.append(row)
            
        return data

    def generate(self):
        print(f"Generating data for {self.num_workers} workers, {self.rows_per_worker} rows each...")
        all_data = []
        base_time = datetime.now() - timedelta(days=7) # Start 7 days ago
        
        for w in range(1, self.num_workers + 1):
            worker_id = f"W{w:03d}"
            worker_data = self._generate_worker_data(worker_id, base_time)
            all_data.extend(worker_data)
            
            # Save individual JSON stream (simulating websocket)
            json_file = os.path.join(self.output_dir, f"stream_{worker_id}.json")
            with open(json_file, 'w') as f:
                json.dump(worker_data, f, indent=2)
                
        # Save consolidated CSV for batch training
        csv_file = os.path.join(self.output_dir, "synthetic_dataset.csv")
        df = pd.DataFrame(all_data)
        df.to_csv(csv_file, index=False)
        
        print(f"Generated {len(all_data)} total records.")
        print(f"Saved CSV to {csv_file}")
        print(f"Saved {self.num_workers} JSON stream files to {self.output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SafeSphere Sensor Simulator")
    parser.add_argument("--workers", type=int, default=10, help="Number of workers to simulate")
    parser.add_argument("--rows-per-worker", type=int, default=10000, help="Rows per worker")
    parser.add_argument("--output", type=str, default="data/synthetic/", help="Output directory")
    
    args = parser.parse_args()
    
    simulator = SensorSimulator(args.workers, args.rows_per_worker, args.output)
    simulator.generate()
