import csv
import random
import os
from datetime import datetime, timedelta

def generate_synthetic_csv(output_path, num_records=600):
    """
    Generates a CSV file containing realistic telemetry streams for wearable devices,
    including heart rate, temperature, accelerometer readings, and SOS status.
    Injects anomalies representing falls, heat stress, tachycardia, and emergency SOS requests.
    """
    headers = [
        "timestamp", 
        "worker_id", 
        "heart_rate_bpm", 
        "body_temp_c", 
        "accel_x", 
        "accel_y", 
        "accel_z", 
        "sos_pressed"
    ]
    
    workers = ["W001", "W002", "W003", "W004", "W005"]
    start_time = datetime.now() - timedelta(hours=2)
    
    with open(output_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        
        for i in range(num_records):
            # Calculate incrementing timestamps (every 10 seconds per record)
            record_time = (start_time + timedelta(seconds=i * 10)).strftime('%Y-%m-%dT%H:%M:%SZ')
            worker_id = workers[i % len(workers)]
            
            # Generate healthy baseline metrics
            hr = random.normalvariate(74.0, 3.5)
            temp = random.normalvariate(36.7, 0.15)
            ax = random.normalvariate(0.0, 0.3)
            ay = random.normalvariate(0.0, 0.3)
            az = random.normalvariate(9.8, 0.15)  # normal gravity pull
            sos = 0

            # 5% chance of anomaly injection
            anomaly_chance = random.random()
            
            if anomaly_chance < 0.01:
                # 1. Fall Anomaly (high acceleration spikes across all axes)
                ax = random.uniform(-16.0, 16.0)
                ay = random.uniform(-16.0, 16.0)
                az = random.uniform(-16.0, 16.0)
            elif anomaly_chance < 0.02:
                # 2. Tachycardia / Elevated HR Anomaly
                hr = random.uniform(125.0, 150.0)
            elif anomaly_chance < 0.03:
                # 3. Heat Stress / Hyperthermia Anomaly
                temp = random.uniform(38.5, 40.0)
            elif anomaly_chance < 0.04:
                # 4. SOS manual alert trigger
                sos = 1

            writer.writerow([
                record_time,
                worker_id,
                round(hr, 1),
                round(temp, 1),
                round(ax, 2),
                round(ay, 2),
                round(az, 2),
                sos
            ])

if __name__ == "__main__":
    output_file = "synthetic_sensor_data.csv"
    print(f"Starting generator to create {output_file}...")
    generate_synthetic_csv(output_file, 600)
    print(f"Success: Generated 600 records of synthetic wearable telemetry in {output_file}")
