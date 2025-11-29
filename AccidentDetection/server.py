import json
import os
import threading
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sklearn.utils import shuffle
from sklearn.model_selection import train_test_split

# --- IMPORT YOUR NEW PIPELINE ---
import model_pipeline

# --- 1. SETUP ---
base_dir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
CORS(app)

# --- 2. DATABASE CONFIGURATION ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(base_dir, 'feedback.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- 3. GLOBAL VARIABLES (for model management) ---
MODEL_VERSION = 1
LATEST_MODEL_FILE = f"accident_model_v{MODEL_VERSION}.tflite"
# We need to lock this variable when retraining
training_in_progress = False

# --- 4. DATABASE MODEL (TABLE) ---
class FalsePositive(db.Model):
# ... (same as before) ...
    id = db.Column(db.Integer, primary_key=True)
    event_timestamp = db.Column(db.String(100), nullable=False)
    phone_model = db.Column(db.String(100))
    sensor_data = db.Column(db.JSON, nullable=False)

    def __repr__(self):
        return f'<Event {self.id} at {self.event_timestamp}>'

# --- 5. API ENDPOINTS ---
# ... ( / , /api/feedback, /api/model/version, /api/model/download are same as before) ...
@app.route("/")
def home():
# ... (same as before) ...
    return "Feedback Server is running. Ready for database connections and retraining."

@app.route("/api/feedback", methods=["POST", "OPTIONS"])
def handle_feedback():
# ... (same as before) ...
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    print("\n--- NEW FEEDBACK RECEIVED ---")
    try:
        data = request.json
        timestamp = data.get('timestamp')
        phone_model = data.get('phone_model')
        sensor_window = data.get('sensor_window') 

        # --- VALIDATION ---
        # Ensure the data looks like a real 150x7 sample
        # This is a basic check; you can make it more robust
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
# ... (same as before) ...
    global MODEL_VERSION, LATEST_MODEL_FILE
    
    print(f"\n--- MODEL VERSION CHECK ---")
    print(f"App requested model version. Current version is {MODEL_VERSION}.")
    
    return jsonify({
        "version": MODEL_VERSION,
        "filename": LATEST_MODEL_FILE
    })

@app.route("/api/model/download/<string:filename>", methods=["GET"])
def download_model(filename):
# ... (same as before) ...
    global LATEST_MODEL_FILE
    
    # Security check: only allow downloading the *latest* model
    # Or any model file that exists in the directory
    if not os.path.exists(os.path.join(base_dir, filename)) or not filename.startswith("accident_model_v"):
         return jsonify({"error": "File not found"}), 404
        
    print(f"\n--- MODEL DOWNLOAD REQUEST ---")
    print(f"App downloading model: {filename}")
    
    return send_from_directory(directory=base_dir, path=filename, as_attachment=True)


@app.route("/api/retrain", methods=["POST"])
def trigger_retraining():
# ... (updated to check status) ...
    global training_in_progress
    
    if training_in_progress:
        print("\n--- RETRAINING JOB REJECTED ---")
        print("Reason: A training job is already in progress.")
        return jsonify({
            "status": "error",
            "message": "A training job is already in progress. Please wait."
        }), 409 # 409 = Conflict
        
    print("\n--- RETRAINING JOB TRIGGERED ---")
    
    thread = threading.Thread(target=run_retraining_pipeline, args=(app.app_context(),))
    thread.start()
    
    return jsonify({
        "status": "success",
        "message": "Retraining job started in the background. This will take 20-30 minutes."
    }), 202


# --- 6. RETRAINING LOGIC (NOW CALLS THE PIPELINE) ---

def run_retraining_pipeline(app_context):
    """
    This is the "Active Learning" function.
    It now calls the real model pipeline.
    """
    global MODEL_VERSION, LATEST_MODEL_FILE, training_in_progress
    
    # Set flag to prevent new jobs
    training_in_progress = True 
    
    with app_context:
        try:
            print("[Retrain] --- Loading base V9 data from .npy files ---")
            # 1. Load the original v9 synthetic data
            # These files MUST exist.
            base_X = np.load("base_X_data.npy")
            base_y = np.load("base_y_data.npy")
            
            print("[Retrain] --- Loading new feedback data from database ---")
            # 2. Get all "false positive" events from the DB
            feedback_data = FalsePositive.query.all()
            print(f"[Retrain] --- Found {len(feedback_data)} new feedback samples. ---")
            
            # 3. Convert feedback data to numpy format
            # We must validate this data!
            new_X_data_list = []
            for event in feedback_data:
                # Basic validation
                if isinstance(event.sensor_data, list) and len(event.sensor_data) == model_pipeline.TIMESTEPS:
                    if np.array(event.sensor_data).shape == (model_pipeline.TIMESTEPS, model_pipeline.FEATURES):
                        new_X_data_list.append(event.sensor_data)
            
            if not new_X_data_list:
                print("[Retrain] No valid new feedback data to train on. Exiting.")
                training_in_progress = False
                return

            new_X = np.array(new_X_data_list)
            new_y = np.zeros(len(new_X)) # All are Label = 0
            
            # 4. Define new model version
            new_version = MODEL_VERSION + 1
            
            # 5. RUN THE REAL PIPELINE
            new_model_filename = model_pipeline.run_full_pipeline(
                base_data_X=base_X,
                base_data_y=base_y,
                new_feedback_X=new_X,
                new_feedback_y=new_y,
                new_version=new_version
            )
            
            # 6. Update global variables
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
        
        # Always unlock the training flag
        training_in_progress = False


# --- 7. SERVER STARTUP ---
if __name__ == "__main__":
    with app.app_context():
        print("Initializing database...")
        db.create_all()
        print("Database tables created.")
        
    # Check if base data exists. If not, tell user to run the pipeline.
    if not os.path.exists("base_X_data.npy"):
        print("\n--- WARNING ---")
        print("Base data files (base_X_data.npy) not found.")
        print("Please run 'python model_pipeline.py' once by itself to generate the initial data and model.")
        print("Exiting.")
    else:
        # Set the LATEST_MODEL_FILE to the highest version on disk
        # This makes the server "remember" its version after a restart
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
        app.run(host="0.0.0.0", port=5000, debug=False)