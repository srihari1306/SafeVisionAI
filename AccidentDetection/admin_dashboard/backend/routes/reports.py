from flask import Blueprint, request, jsonify
from models import Incident, MobileReport, Media
from extensions import db, socketio
from utils import save_media_file
from datetime import datetime, timezone
import json

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/accidents/report', methods=['POST'])
def report_cctv_accident():
    """
    CCTV AI server reports accident
    Accepts: multipart/form-data
    Fields:
      - camera_id (string)
      - lat (float)
      - lng (float)
      - occurred_at (ISO datetime)
      - confidence (float, optional)
      - severity (string, optional)
      - snapshot (file)
      - video (file, optional)
    """
    try:
        # Parse form data
        camera_id = request.form.get('camera_id')
        lat = float(request.form.get('lat', 0))
        lng = float(request.form.get('lng', 0))
        occurred_at_str = request.form.get('occurred_at')
        confidence = request.form.get('confidence', type=float)
        severity = request.form.get('severity', 'medium')
        
        if not camera_id or not occurred_at_str:
            return jsonify({'error': 'camera_id and occurred_at required'}), 400
        
        # Parse datetime
        # try:
            # occurred_at = datetime.fromisoformat(occurred_at_str.replace('Z', '+00:00'))
        # except:
            # occurred_at = datetime.utcnow()
        occurred_at = datetime.utcnow()
        
        # Create incident
        incident = Incident(
            source='CCTV',
            camera_id=camera_id,
            lat=lat,
            lng=lng,
            occurred_at=occurred_at,
            confidence=confidence,
            severity=severity,
            status='new'
        )
        
        db.session.add(incident)
        db.session.flush()  # Get incident ID
        
        # Save snapshot
        if 'snapshot' in request.files:
            snapshot_file = request.files['snapshot']
            snapshot_path = save_media_file(snapshot_file, 'snapshot')
            if snapshot_path:
                media = Media(
                    incident_id=incident.id,
                    media_type='snapshot',
                    file_path=snapshot_path
                )
                db.session.add(media)
        
        # Save video if present
        if 'video' in request.files:
            video_file = request.files['video']
            video_path = save_media_file(video_file, 'video')
            if video_path:
                media = Media(
                    incident_id=incident.id,
                    media_type='video',
                    file_path=video_path
                )
                db.session.add(media)
        
        db.session.commit()
        
        # Emit WebSocket event
        socketio.emit('new_incident', incident.to_dict())
        
        return jsonify({
            'message': 'Accident reported successfully',
            'incident_id': incident.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reports_bp.route('/mobile/report', methods=['POST'])
def report_mobile_accident():
    print("FORM DATA RECEIVED:", request.form)
    print("FILES RECEIVED:", request.files)
    """
    Mobile app reports accident
    Accepts: multipart/form-data
    Fields:
      - user_id (string, optional)
      - lat (float)
      - lng (float)
      - timestamp (ISO datetime)
      - acc_peak (float, optional)
      - gyro_peak (float, optional)
      - speed (float, optional)
      - sensor_data (JSON string, optional)
      - snapshot (file, optional)
      - video (file, optional)
    """
    try:
        # Parse form data
        user_id = request.form.get('user_id')
        lat = float(request.form.get('lat', 0))
        lng = float(request.form.get('lng', 0))
        timestamp_str = request.form.get('timestamp')
        acc_peak = request.form.get('acc_peak', type=float)
        gyro_peak = request.form.get('gyro_peak', type=float)
        speed = request.form.get('speed', type=float)
        sensor_data = request.form.get('sensor_data')
        
        if not timestamp_str:
            return jsonify({'error': 'timestamp required'}), 400
        
        # # Parse datetime
        # try:
        #     timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        # except:
        #     timestamp = datetime.utcnow()
        timestamp = datetime.now()
        # Create mobile report
        mobile_report = MobileReport(
            user_id=user_id,
            lat=lat,
            lng=lng,
            timestamp=timestamp,
            acc_peak=acc_peak,
            gyro_peak=gyro_peak,
            speed=speed,
            raw_json=sensor_data
        )
        
        db.session.add(mobile_report)
        db.session.flush()
        
        # Create incident
        incident = Incident(
            source='MOBILE',
            mobile_report_id=mobile_report.id,
            lat=lat,
            lng=lng,
            occurred_at=timestamp,
            severity='high',  # Mobile reports often indicate serious incidents
            status='new'
        )
        
        db.session.add(incident)
        db.session.flush()
        
        # Save media files if present
        if 'snapshot' in request.files:
            snapshot_file = request.files['snapshot']
            snapshot_path = save_media_file(snapshot_file, 'snapshot')
            if snapshot_path:
                media = Media(
                    incident_id=incident.id,
                    media_type='snapshot',
                    file_path=snapshot_path
                )
                db.session.add(media)
        
        if 'video' in request.files:
            video_file = request.files['video']
            video_path = save_media_file(video_file, 'video')
            if video_path:
                media = Media(
                    incident_id=incident.id,
                    media_type='video',
                    file_path=video_path
                )
                db.session.add(media)
        
        db.session.commit()
        
        # Emit WebSocket event
        socketio.emit('new_incident', incident.to_dict())
        
        return jsonify({
            'message': 'Mobile accident reported successfully',
            'incident_id': incident.id,
            'mobile_report_id': mobile_report.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
    