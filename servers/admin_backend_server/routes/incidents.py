from flask import Blueprint, request, jsonify, send_file
from flask_login import login_required, current_user
from models import Incident, ActionLog, Media
from extensions import db, socketio
from utils import get_media_full_path
from datetime import datetime
import os

incidents_bp = Blueprint('incidents', __name__)

@incidents_bp.route('', methods=['GET'])
@login_required
def list_incidents():
    status = request.args.get('status')
    source = request.args.get('source')
    limit = request.args.get('limit', 100, type=int)
    
    query = Incident.query
    
    if status:
        query = query.filter_by(status=status)
    if source:
        query = query.filter_by(source=source)
    
    incidents = query.order_by(Incident.created_at.desc()).limit(limit).all()
    
    return jsonify({
        'incidents': [inc.to_dict() for inc in incidents],
        'total': len(incidents)
    }), 200


@incidents_bp.route('/<int:incident_id>', methods=['GET'])
@login_required
def get_incident(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    
    # Include action logs
    incident_data = incident.to_dict()
    incident_data['action_logs'] = [log.to_dict() for log in incident.action_logs]
    
    return jsonify(incident_data), 200


@incidents_bp.route('/<int:incident_id>/action', methods=['POST'])
@login_required
def take_action(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    data = request.get_json()
    
    if not data or not data.get('action_type'):
        return jsonify({'error': 'action_type required'}), 400
    
    action_type = data['action_type']
    allowed_actions = ['acknowledge', 'dispatch', 'resolve', 'false_alarm']
    
    if action_type not in allowed_actions:
        return jsonify({'error': f'Invalid action_type. Must be one of: {allowed_actions}'}), 400
    
    # Update incident status based on action
    status_map = {
        'acknowledge': 'acknowledged',
        'dispatch': 'dispatched',
        'resolve': 'resolved',
        'false_alarm': 'false_alarm'
    }
    
    incident.status = status_map[action_type]
    incident.updated_at = datetime.utcnow()
    
    # Create action log
    action_log = ActionLog(
        incident_id=incident.id,
        user_id=current_user.id,
        action_type=action_type,
        note=data.get('note', '')
    )
    
    db.session.add(action_log)
    db.session.commit()
    

    socketio.emit('incident_update', {
        'incident': incident.to_dict(),
        'action': action_log.to_dict()
    })
    
    return jsonify({
        'message': f'Action {action_type} completed',
        'incident': incident.to_dict()
    }), 200


@incidents_bp.route('/media/<int:media_id>', methods=['GET'])
@login_required
def get_media(media_id):
    media = Media.query.get_or_404(media_id)
    full_path = get_media_full_path(media.file_path)
    
    if not os.path.exists(full_path):
        return jsonify({'error': 'Media file not found'}), 404
    
    return send_file(full_path)