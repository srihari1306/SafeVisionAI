import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, Model
from collections import deque
import time
import requests
import base64
import threading
import csv

MODEL_PATH = 'accident_video_model.h5'
VIDEO_SOURCE = 'accident_video.mp4'

SEQUENCE_LENGTH = 50
IMG_SIZE = 256
CONFIDENCE_THRESHOLD = 0.90

ALERT_SERVER_URL = "http://127.0.0.1:5001/alert"
ALERT_COOLDOWN = 300
last_alert_time = 0

latency_log = []
frame_times = []
start_overall = time.time()
total_frames = 0


CSV_FILE = "metrics.csv"
with open(CSV_FILE, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["frame_number", "inference_ms", "fps"])


def MobileNetV2_LSTM(input_shape=(SEQUENCE_LENGTH, IMG_SIZE, IMG_SIZE, 3), num_classes=1):
    inputs = tf.keras.Input(shape=input_shape)
    cnn_base = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights=None
    )
    cnn_base.trainable = False

    x = layers.TimeDistributed(cnn_base)(inputs)
    x = layers.TimeDistributed(layers.GlobalAveragePooling2D())(x)
    x = layers.LSTM(64, dropout=0.3)(x)
    x = layers.Dense(32, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation='sigmoid')(x)

    return Model(inputs, outputs)


print("Building model...")
model = MobileNetV2_LSTM()
model.compile(optimizer='adam', loss="binary_crossentropy")

print("Loading weights...")
model.load_weights(MODEL_PATH)
print("Model loaded successfully!")


def send_alert_async(frame, confidence):
    try:
        _, buffer = cv2.imencode('.jpg', frame)
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')

        payload = {
            "camera_id": "CCTV-01",
            "location": "Main Highway",
            "confidence": f"{confidence*100:.1f}",
            "image": jpg_as_text
        }
        requests.post(ALERT_SERVER_URL, json=payload)
        print("\n>> Alert sent!")
    except:
        pass


cap = cv2.VideoCapture(VIDEO_SOURCE)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
frame_queue = deque(maxlen=SEQUENCE_LENGTH)

print("Starting detection... (press 'q' to exit)")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    total_frames += 1
    frame_times.append(time.time())

    frame_times = [t for t in frame_times if time.time() - t <= 1]
    current_fps = len(frame_times)

    resized = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB) / 255.0
    frame_queue.append(rgb)

    label = "Buffering..."
    color = (0, 255, 255)
    inference_ms = 0
    prob = 0

    if len(frame_queue) == SEQUENCE_LENGTH:
        seq = np.expand_dims(np.array(frame_queue), axis=0)

        t0 = time.time()
        pred = model.predict(seq, verbose=0)[0][0]
        t1 = time.time()

        inference_ms = (t1 - t0) * 1000
        latency_log.append(inference_ms)
        prob = pred

        with open(CSV_FILE, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([total_frames, inference_ms, current_fps])

        if prob > CONFIDENCE_THRESHOLD:
            label = f"ACCIDENT! ({prob*100:.1f}%)"
            color = (0, 0, 255)

            now = time.time()
            if now - last_alert_time > ALERT_COOLDOWN:
                threading.Thread(target=send_alert_async, args=(frame.copy(), prob)).start()
                last_alert_time = now
        else:
            label = f"Normal ({prob*100:.1f}%)"
            color = (0, 255, 0)

    cv2.rectangle(frame, (0, 0), (width, 60), (0, 0, 0), -1)
    cv2.putText(frame, label, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    cv2.putText(frame, f"Inference: {inference_ms:.1f}ms | FPS: {current_fps}", 
                (20, height - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

    cv2.imshow("Real-Time Accident Detector", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

print("\n========= METRICS SUMMARY =========")
if latency_log:
    print(f"Frames processed: {total_frames}")
    print(f"Average FPS: {total_frames / (time.time() - start_overall):.2f}")
    print(f"Average Inference Latency: {np.mean(latency_log):.2f} ms")
    print(f"Min Latency: {np.min(latency_log):.2f} ms")
    print(f"Max Latency: {np.max(latency_log):.2f} ms")
    print(f"P95 Latency: {np.percentile(latency_log, 95):.2f} ms")
    print(f"Saved CSV to: {CSV_FILE}")
else:
    print("No inference metrics collected.")
