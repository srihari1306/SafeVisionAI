import numpy as np
import tensorflow as tf
from keras.models import Model
from keras.layers import (
    Input, Conv1D, MaxPooling1D, LSTM, Dense, 
    Dropout, BatchNormalization, GaussianNoise, SpatialDropout1D
)
from keras.optimizers import Adam
from sklearn.model_selection import train_test_split
from sklearn.utils import shuffle
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix
)
import time
import os

TIMESTEPS = 150
FEATURES = 7
RANDOM_STATE = 42

np.random.seed(RANDOM_STATE)
tf.random.set_seed(RANDOM_STATE)


def create_gravity_vector():
    vec = np.random.normal(size=3)
    vec /= np.linalg.norm(vec)
    return vec

def create_base_noise(duration_timesteps, scale=0.15):
    return np.random.normal(scale=scale, size=(duration_timesteps, 6))

def get_new_rest_state(duration_timesteps):
    data = np.zeros((duration_timesteps, 6))
    new_gravity = create_gravity_vector()
    post_noise = create_base_noise(duration_timesteps, scale=0.01)
    data[:, :3] = new_gravity + post_noise[:, :3]
    data[:, 3:6] = post_noise[:, 3:6]
    return data

def create_just_noise():
    data = np.zeros((TIMESTEPS, FEATURES))
    gravity = create_gravity_vector()
    noise = create_base_noise(TIMESTEPS)
    data[:, :3] = noise[:, :3] + gravity
    data[:, 3:6] = noise[:, 3:6]
    data[:, 6] = np.random.uniform(30, 80)
    return data

def create_hard_brake(ends_at_zero_speed=False):
    data = create_just_noise()
    start_time = np.random.randint(10, 50)
    duration = np.random.randint(50, 75)
    amplitude = np.random.uniform(1.0, 3.0)
    data[start_time : start_time + duration, 1] += amplitude
    start_speed = data[0, 6]
    end_speed = 0.0 if ends_at_zero_speed else max(5.0, start_speed - np.random.uniform(15, 30))
    data[:, 6] = np.linspace(start_speed, end_speed, TIMESTEPS) 
    return data

def create_pothole():
    data = create_just_noise()
    start_time = np.random.randint(20, 100)
    duration = np.random.randint(10, 25)
    amplitude = np.random.uniform(2.0, 6.0)
    data[start_time : start_time + duration, 2] += amplitude
    data[start_time + duration : start_time + duration*2, 2] -= amplitude * 0.5
    return data

def create_dropped_phone(is_stopped=False):
    if is_stopped:
        data = create_hard_brake(ends_at_zero_speed=True)
        data[:, 6] = 0.0
    else:
        data = create_just_noise()
        data[:, 6] = np.random.uniform(1, 5)
    
    start_time = np.random.randint(20, 100)
    impact_duration = np.random.randint(5, 10)
    tumble_duration = np.random.randint(50, 100)
    impact_amp = np.random.uniform(5, 25) 
    gyro_scale = np.random.uniform(200, 500) 
    
    data[start_time : start_time + impact_duration, np.random.randint(0, 3)] += impact_amp
    tumble_end = min(TIMESTEPS, start_time + tumble_duration)
    tumble_len = tumble_end - start_time
    if tumble_len > 0:
        data[start_time : tumble_end, 3:6] += np.random.normal(scale=gyro_scale, size=(tumble_len, 3))

    rest_start = start_time + impact_duration
    rest_len = TIMESTEPS - rest_start
    if rest_len > 0:
        data[rest_start:, :6] = get_new_rest_state(rest_len)
    return data

def create_drop_while_braking_to_stop():
    data = create_just_noise()
    start_speed = data[0, 6]
    start_time = np.random.randint(70, 100) 
    impact_duration = np.random.randint(5, 10)
    tumble_duration = np.random.randint(50, 100)
    impact_amp = np.random.uniform(5, 25) 
    gyro_scale = np.random.uniform(200, 500)
    
    data[start_time : start_time + impact_duration, np.random.randint(0, 3)] += impact_amp
    tumble_end = min(TIMESTEPS, start_time + tumble_duration)
    tumble_len = tumble_end - start_time
    if tumble_len > 0:
        data[start_time : tumble_end, 3:6] += np.random.normal(scale=gyro_scale, size=(tumble_len, 3))

    data[:start_time, 6] = start_speed
    data[start_time:, 6] = 0.0
    
    rest_start = start_time + impact_duration
    rest_len = TIMESTEPS - rest_start
    if rest_len > 0:
        data[rest_start:, :6] = get_new_rest_state(rest_len)
    return data
    
def create_crash_event():
    if np.random.rand() < 0.5:
        data = create_just_noise()
    else:
        data = create_hard_brake(ends_at_zero_speed=False)
        
    start_speed = data[0, 6]
    impact_start = np.random.randint(70, 100)
    impact_duration = np.random.randint(5, 15)
    accel_amp = np.random.uniform(15, 60) 
    gyro_amp = np.random.uniform(250, 1000) 
    
    data[impact_start : impact_start + impact_duration, 0] += np.random.normal(scale=accel_amp / 2, size=impact_duration)
    data[impact_start : impact_start + impact_duration, 1] += np.random.normal(scale=accel_amp, size=impact_duration)
    data[impact_start : impact_start + impact_duration, 2] += np.random.normal(scale=accel_amp / 2, size=impact_duration)
    data[impact_start : impact_start + impact_duration, 3:6] += np.random.normal(scale=gyro_amp, size=(impact_duration, 3))

    post_impact_start = impact_start + impact_duration
    post_impact_len = TIMESTEPS - post_impact_start
    
    if post_impact_len > 0:
        data[post_impact_start:, :6] = get_new_rest_state(post_impact_len)
        if np.random.rand() > 0.7:
            tumble_duration = min(50, post_impact_len)
            tumble_end = post_impact_start + tumble_duration
            data[post_impact_start : tumble_end, 3:6] += np.random.normal(scale=250, size=(tumble_duration, 3))

    data[:impact_start, 6] = start_speed
    data[impact_start:, 6] = 0.0 
    return data

def generate_v9_data(total_samples=50000):
    print(f"Generating dataset (Total Samples: {total_samples})...")
    X_data_list = []
    y_data_list = []
    non_accident_types = [
        'noise', 'brake_slow', 'brake_stop', 'pothole', 
        'drop_crawl', 'drop_stop', 'drop_while_braking'
    ]
    for i in range(total_samples):
        if np.random.rand() < 0.5:
            event_type = np.random.choice(non_accident_types)
            if event_type == 'noise': sample = create_just_noise()
            elif event_type == 'brake_slow': sample = create_hard_brake(ends_at_zero_speed=False)
            elif event_type == 'brake_stop': sample = create_hard_brake(ends_at_zero_speed=True)
            elif event_type == 'pothole': sample = create_pothole()
            elif event_type == 'drop_crawl': sample = create_dropped_phone(is_stopped=False)
            elif event_type == 'drop_stop': sample = create_dropped_phone(is_stopped=True) 
            elif event_type == 'drop_while_braking': sample = create_drop_while_braking_to_stop()
            X_data_list.append(sample)
            y_data_list.append(0)
        else:
            sample = create_crash_event()
            X_data_list.append(sample)
            y_data_list.append(1)

    X_data = np.array(X_data_list)
    y_data = np.array(y_data_list)
    X_data, y_data = shuffle(X_data, y_data, random_state=RANDOM_STATE)
    return X_data, y_data


def build_v8_robust_model(input_shape):
    inputs = Input(shape=input_shape)
    x = GaussianNoise(0.3)(inputs) 
    x = SpatialDropout1D(0.3)(x)
    x = Conv1D(filters=32, kernel_size=3, activation='relu')(x)
    x = BatchNormalization()(x)
    x = MaxPooling1D(pool_size=2)(x)
    x = Conv1D(filters=64, kernel_size=3, activation='relu')(x)
    x = BatchNormalization()(x)
    x = MaxPooling1D(pool_size=2)(x)
    x = LSTM(units=64, return_sequences=False)(x)
    x = Dropout(0.4)(x)
    x = Dense(units=64, activation='relu')(x)
    x = Dropout(0.4)(x)
    outputs = Dense(units=1, activation='sigmoid')(x)
    model = Model(inputs=inputs, outputs=outputs)
    
    METRICS = [
        'accuracy',
        tf.keras.metrics.Precision(name='precision'),
        tf.keras.metrics.Recall(name='recall')
    ]
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=METRICS
    )
    return model


def convert_and_save_tflite(model, output_filename):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS,
        tf.lite.OpsSet.SELECT_TF_OPS 
    ]
    converter._experimental_lower_tensor_list_ops = False
    
    tflite_model = converter.convert()
    
    with open(output_filename, 'wb') as f:
        f.write(tflite_model)
    print(f"Successfully saved TFLite model to {output_filename}")


def run_full_pipeline(base_data_X, base_data_y, new_feedback_X, new_feedback_y, new_version):
    print(f"STARTING PIPELINE FOR V{new_version}")
    
    print(f"Combining {len(base_data_X)} base samples with {len(new_feedback_X)} new feedback samples.")
    X_full = np.concatenate((base_data_X, new_feedback_X))
    y_full = np.concatenate((base_data_y, new_feedback_y))
    
    X_full, y_full = shuffle(X_full, y_full, random_state=RANDOM_STATE)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_full, y_full, test_size=0.2, random_state=RANDOM_STATE, stratify=y_full
    )
    
    input_shape = (TIMESTEPS, FEATURES)
    model = build_v8_robust_model(input_shape)
    
    EPOCHS = 20
    BATCH_SIZE = 64
    history = model.fit(
        X_train,
        y_train,
        batch_size=BATCH_SIZE,
        epochs=EPOCHS,
        validation_data=(X_test, y_test),
        verbose=1
    )

    results = evaluate_model(model, X_test, y_test)

    print("\n--- Test Results (Raw) ---")
    print(f"Accuracy: {results['accuracy']:.4f}")
    print(f"Precision: {results['precision']:.4f}")
    print(f"Recall: {results['recall']:.4f}")
    print(f"F1-Score: {results['f1']:.4f}")
    print(f"ROC-AUC: {results['roc_auc']:.4f}")
    print(f"Avg Latency: {results['avg_latency_ms']:.4f} ms/video")

    y_pred_probs = model.predict(X_test)
    y_pred_classes = (y_pred_probs > 0.5).astype(int)

    print("\n--- Confusion Matrix ---")
    cm = confusion_matrix(y_test, y_pred_classes)
    print(cm)

    keras_filename = f"accident_detection_model_v{new_version}.keras"
    tflite_filename = f"accident_model_v{new_version}.tflite"
    
    model.save(keras_filename)
    convert_and_save_tflite(model, tflite_filename)
    return tflite_filename

def evaluate_model(model, X_test, y_test, batch_size=256):
    print("="*70)
    print("MODEL EVALUATION ON TEST SET")
    print("="*70)

    # ---- Measure Inference Latency ----
    start = time.time()
    preds = model.predict(X_test, batch_size=batch_size, verbose=0)
    end = time.time()

    avg_latency_ms = ((end - start) / len(X_test)) * 1000

    # Threshold predictions
    pred_classes = (preds > 0.5).astype(int)

    # ---- Metrics ----
    acc = accuracy_score(y_test, pred_classes)
    precision = precision_score(y_test, pred_classes, zero_division=0)
    recall = recall_score(y_test, pred_classes, zero_division=0)
    f1 = f1_score(y_test, pred_classes, zero_division=0)
    roc_auc = roc_auc_score(y_test, preds)

    # ---- Print Results ----
    print(f"Accuracy: {acc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1-Score: {f1:.4f}")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print(f"Average Inference Latency: {avg_latency_ms:.2f} ms/video")

    return {
        "accuracy": acc,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "roc_auc": roc_auc,
        "avg_latency_ms": avg_latency_ms,
        "preds": preds,
        "pred_classes": pred_classes
    }



if __name__ == "__main__":
    
    X_data, y_data = generate_v9_data(total_samples=50000)
    
    print("Saving base data to disk...")
    np.save("base_X_data.npy", X_data)
    np.save("base_y_data.npy", y_data)
    
    run_full_pipeline(
        base_data_X=X_data, 
        base_data_y=y_data, 
        new_feedback_X=np.array([]).reshape(0, TIMESTEPS, FEATURES), 
        new_feedback_y=np.array([]), 
        new_version=1
    )