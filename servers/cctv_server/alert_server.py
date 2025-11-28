from flask import Flask, request, jsonify
import datetime
import time
import os
import cv2
import numpy as np
import base64
import requests

app = Flask(__name__)


ADMIN_BACKEND_URL = "http://127.0.0.1:5000/api/accidents/report"

EVIDENCE_DIR = "accident_evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)


last_alert_times = {}
ALERT_COOLDOWN = 300

CAMERA_LOCATIONS = {
    "CCTV-01": {"lat": 12.9229, "lng": 80.1275},
    "CCTV-02": {"lat": 28.7041, "lng": 77.1025},
    "DEFAULT": {"lat": 0.0, "lng": 0.0}
}

@app.route('/alert', methods=['POST'])
def receive_alert():
    data = request.json
    camera_id = data.get('camera_id', 'Unknown')
    confidence = float(data.get('confidence', 0))
    
    print(f"\n📨 Signal Received from {camera_id} (Conf: {confidence}%)")

    current_time = time.time()
    last_time = last_alert_times.get(camera_id, 0)
    
    if (current_time - last_time) < ALERT_COOLDOWN:
        print(f"⏳ SKIPPING: Alert suppressed (Cooldown active for {int(ALERT_COOLDOWN - (current_time - last_time))}s)")
        return jsonify({"status": "Skipped", "reason": "Cooldown active"}), 200

    last_alert_times[camera_id] = current_time

    image_data = data.get('image')
    if not image_data:
        return jsonify({"error": "No image data"}), 400

    img_bytes = base64.b64decode(image_data)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    local_filename = f"{EVIDENCE_DIR}/accident_{timestamp}.jpg"
    with open(local_filename, "wb") as f:
        f.write(img_bytes)
    print(f"📸 Local backup saved: {local_filename}")

    print(f"🚀 Forwarding to Admin Dashboard: {ADMIN_BACKEND_URL}...")
    
    try:
        loc = CAMERA_LOCATIONS.get(camera_id, CAMERA_LOCATIONS["DEFAULT"])
        
        files = {
            'snapshot': (f'alert_{timestamp}.jpg', img_bytes, 'image/jpeg')
        }
        
        form_data = {
            'camera_id': camera_id,
            'lat': loc['lat'],
            'lng': loc['lng'],
            'occurred_at': datetime.datetime.utcnow().isoformat(),
            'confidence': confidence,
            'severity': 'high' if confidence > 85 else 'medium'
        }

        response = requests.post(ADMIN_BACKEND_URL, data=form_data, files=files)
        
        if response.status_code in [200, 201]:
            print("✅ Admin Dashboard updated successfully!")
            return jsonify({"status": "Forwarded", "backend_response": response.json()}), 201
        else:
            print(f"❌ Admin Backend Error: {response.status_code} - {response.text}")
            return jsonify({"status": "Backend Failed", "error": response.text}), 500

    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return jsonify({"status": "Connection Error", "error": str(e)}), 500

@app.route('/')
def home():
    return "<h1>Alert Gateway is Online 🟢</h1>"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)