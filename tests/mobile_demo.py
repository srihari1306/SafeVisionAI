"""
Example Python code for mobile app to report accidents
This simulates how a mobile app would send accident data to the dashboard
"""
import requests
import json
from datetime import datetime, timezone

def report_accident_from_mobile(
    lat, 
    lng, 
    acc_peak, 
    gyro_peak, 
    speed, 
    sensor_data_dict,
    user_id='mobile_user',
    snapshot_path=None,
    video_path=None
):

    url = 'http://localhost:5000/api/mobile/report'
    
    from datetime import timezone
    local_time = datetime.now()
    utc_time = datetime.now(timezone.utc)
    
    data = {
        'user_id': user_id,
        'lat': lat,
        'lng': lng,
        'timestamp': utc_time.isoformat(),
        'acc_peak': acc_peak,
        'gyro_peak': gyro_peak,
        'speed': speed,
        'sensor_data': json.dumps(sensor_data_dict)
    }
    
    files = {}
    if snapshot_path:
        files['snapshot'] = open(snapshot_path, 'rb')
    if video_path:
        files['video'] = open(video_path, 'rb')
    
    try:
        response = requests.post(url, data=data, files=files)
        response.raise_for_status()
        
        result = response.json()
        print(f"✓ Accident reported successfully!")
        print(f"  Incident ID: {result['incident_id']}")
        print(f"  Mobile Report ID: {result['mobile_report_id']}")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"✗ Error reporting accident: {e}")
        return None
        
    finally:
        for file in files.values():
            file.close()


if __name__ == '__main__':
    sensor_data = {
        'ax': 5.2,  # Acceleration X-axis (g)
        'ay': 2.8,  # Acceleration Y-axis (g)
        'az': -1.5, # Acceleration Z-axis (g)
        'gx': 220,  # Gyroscope X-axis (deg/s)
        'gy': 65,   # Gyroscope Y-axis (deg/s)
        'gz': 15,   # Gyroscope Z-axis (deg/s)
        'timestamp': datetime.utcnow().isoformat()
    }
    
    report_accident_from_mobile(
        lat=13.0350,
        lng=80.1580,
        acc_peak=5.2,
        gyro_peak=220.5,
        speed=75.0,
        sensor_data_dict=sensor_data,
        user_id='mobile_test_user',
    )
    
    print("\n✓ Report sent to dashboard!")
    print("Check the dashboard to see the real-time alert.")