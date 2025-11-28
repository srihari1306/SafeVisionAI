import sys
from dotenv import load_dotenv
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
backend_dir = os.path.join(project_root, 'admin_backend_server')

sys.path.append(backend_dir)

import json
import threading
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sklearn.utils import shuffle
from sklearn.model_selection import train_test_split

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from extensions import db
from models import db, FalsePositive

import model_pipeline as model_pipeline

load_dotenv()

base_dir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
CORS(app)


app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)


MODEL_VERSION = 1
LATEST_MODEL_FILE = f"accident_model_v{MODEL_VERSION}.tflite"
training_in_progress = False

@app.route("/")
def home():
    return "Feedback Server is running. Ready for database connections and retraining."

@app.route("/api/feedback", methods=["POST", "OPTIONS"])
def handle_feedback():

    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    print("\n--- NEW FEEDBACK RECEIVED ---")
    try:
        data = request.json
        timestamp = data.get('timestamp')
        phone_model = data.get('phone_model')
        sensor_window = data.get('sensor_window') 

        if not isinstance(sensor_window, list) or len(sensor_window) < 10:
             print("Invalid data received (too small). Rejecting.")
             return jsonify({"status": "error", "message": "Invalid sensor data"}), 400
        # -----------------
        
        new_feedback = FalsePositive(
            event_timestamp=timestamp,
            phone_model=phone_model,
            sensor_data=sensor_window
        )
        db.session.add(new_feedback)
        db.session.commit()
        
        print(f"Successfully saved event {new_feedback.id} to the database.")
        
        response = {
            "status": "success",
            "message": f"Feedback event {new_feedback.id} saved to database."
        }
        return jsonify(response), 200

    except Exception as e:
        print(f"Error processing request: {e}")
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route("/api/model/version", methods=["GET"])
def get_model_version():
    global MODEL_VERSION, LATEST_MODEL_FILE
    
    print(f"\n--- MODEL VERSION CHECK ---")
    print(f"App requested model version. Current version is {MODEL_VERSION}.")
    
    return jsonify({
        "version": MODEL_VERSION,
        "filename": LATEST_MODEL_FILE
    })

@app.route("/api/model/download/<string:filename>", methods=["GET"])
def download_model(filename):
    global LATEST_MODEL_FILE
    if not os.path.exists(os.path.join(base_dir, filename)) or not filename.startswith("accident_model_v"):
         return jsonify({"error": "File not found"}), 404
        
    print(f"\n--- MODEL DOWNLOAD REQUEST ---")
    print(f"App downloading model: {filename}")
    
    return send_from_directory(directory=base_dir, path=filename, as_attachment=True)


@app.route("/api/retrain", methods=["POST"])
def trigger_retraining():
    global training_in_progress
    
    if training_in_progress:
        print("\n--- RETRAINING JOB REJECTED ---")
        print("Reason: A training job is already in progress.")
        return jsonify({
            "status": "error",
            "message": "A training job is already in progress. Please wait."
        }), 409
        
    print("\n--- RETRAINING JOB TRIGGERED ---")
    
    thread = threading.Thread(target=run_retraining_pipeline, args=(app.app_context(),))
    thread.start()
    
    return jsonify({
        "status": "success",
        "message": "Retraining job started in the background. This will take 20-30 minutes."
    }), 202



def run_retraining_pipeline(app_context):

    global MODEL_VERSION, LATEST_MODEL_FILE, training_in_progress
    
    training_in_progress = True 
    
    with app_context:
        try:
            print("[Retrain] --- Loading base V9 data from .npy files ---")

            base_X = np.load("base_X_data.npy")
            base_y = np.load("base_y_data.npy")
            
            print("[Retrain] --- Loading new feedback data from database ---")
            feedback_data = FalsePositive.query.all()
            print(f"[Retrain] --- Found {len(feedback_data)} new feedback samples. ---")
            
            new_X_data_list = []
            for event in feedback_data:
                if isinstance(event.sensor_data, list) and len(event.sensor_data) == model_pipeline.TIMESTEPS:
                    if np.array(event.sensor_data).shape == (model_pipeline.TIMESTEPS, model_pipeline.FEATURES):
                        new_X_data_list.append(event.sensor_data)
            
            if not new_X_data_list:
                print("[Retrain] No valid new feedback data to train on. Exiting.")
                training_in_progress = False
                return

            new_X = np.array(new_X_data_list)
            new_y = np.zeros(len(new_X))
            
            new_version = MODEL_VERSION + 1

            new_model_filename = model_pipeline.run_full_pipeline(
                base_data_X=base_X,
                base_data_y=base_y,
                new_feedback_X=new_X,
                new_feedback_y=new_y,
                new_version=new_version
            )
            
            MODEL_VERSION = new_version
            LATEST_MODEL_FILE = new_model_filename
            
            print(f"\n[Retrain] --- SUCCESS! ---")
            print(f"[Retrain] --- New model v{MODEL_VERSION} is now live: {LATEST_MODEL_FILE} ---")

        except FileNotFoundError:
            print("[Retrain] --- CRITICAL ERROR ---")
            print("[Retrain] 'base_X_data.npy' or 'base_y_data.npy' not found.")
            print("[Retrain] Please run 'python model_pipeline.py' once to generate them.")
        except Exception as e:
            print(f"[Retrain] --- ERROR ---")
            print(f"[Retrain] Failed to retrain model: {e}")
        training_in_progress = False

if __name__ == "__main__":
    if not os.path.exists("base_X_data.npy"):
        print("\n--- WARNING ---")
        print("Base data files (base_X_data.npy) not found.")
        print("Please run 'python model_pipeline.py' once by itself to generate the initial data and model.")
        print("Exiting.")
    else:
        try:
            files = [f for f in os.listdir(base_dir) if f.startswith("accident_model_v") and f.endswith(".tflite")]
            if files:
                files.sort(key=lambda x: int(x.split('_v')[1].split('.tflite')[0]))
                LATEST_MODEL_FILE = files[-1]
                MODEL_VERSION = int(LATEST_MODEL_FILE.split('_v')[1].split('.tflite')[0])
        except Exception as e:
            print(f"Could not parse model version: {e}. Defaulting to v1.")
            MODEL_VERSION = 1
            LATEST_MODEL_FILE = "accident_model_v1.tflite"

        print(f"\n--- Server starting with model: {LATEST_MODEL_FILE} (Version {MODEL_VERSION}) ---")
        app.run(host="0.0.0.0", port=5002, debug=False)




