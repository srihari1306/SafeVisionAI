from datetime import datetime
from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

class User(UserMixin, db.Model):
    """User model for authentication"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='operator')  # admin, operator
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    action_logs = db.relationship('ActionLog', backref='user', lazy=True)
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify password"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }


class Incident(db.Model):
    """Main incident model"""
    __tablename__ = 'incidents'
    
    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(20), nullable=False)  # CCTV, MOBILE, BOTH
    camera_id = db.Column(db.String(50), nullable=True)
    mobile_report_id = db.Column(db.Integer, db.ForeignKey('mobile_reports.id'), nullable=True)
    
    # Location
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    
    # Timestamps
    occurred_at = db.Column(db.DateTime, nullable=False)
    reported_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Detection metadata
    confidence = db.Column(db.Float, nullable=True)  # AI confidence score
    severity = db.Column(db.String(20), nullable=True)  # low, medium, high
    
    # Status tracking
    status = db.Column(db.String(20), nullable=False, default='new', index=True)
    # Possible values: new, acknowledged, dispatched, resolved, false_alarm
    
    # Relationships
    media = db.relationship('Media', backref='incident', lazy=True, cascade='all, delete-orphan')
    action_logs = db.relationship('ActionLog', backref='incident', lazy=True, cascade='all, delete-orphan')
    mobile_report = db.relationship('MobileReport', backref='incident', uselist=False)
    
    def to_dict(self, include_media=True, include_mobile=True):
        data = {
            'id': self.id,
            'source': self.source,
            'camera_id': self.camera_id,
            'lat': self.lat,
            'lng': self.lng,
            'occurred_at': self.occurred_at.isoformat(),
            'reported_at': self.reported_at.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'confidence': self.confidence,
            'severity': self.severity,
            'status': self.status,
        }
        
        if include_media:
            data['media'] = [m.to_dict() for m in self.media]
        
        if include_mobile and self.mobile_report:
            data['mobile_report'] = self.mobile_report.to_dict()
        
        return data


class MobileReport(db.Model):
    """Mobile app sensor data report"""
    __tablename__ = 'mobile_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=True)  # Mobile user identifier
    
    # Sensor readings
    acc_peak = db.Column(db.Float, nullable=True)  # Peak acceleration (g)
    gyro_peak = db.Column(db.Float, nullable=True)  # Peak gyroscope (deg/s)
    speed = db.Column(db.Float, nullable=True)  # Speed at impact (km/h)
    
    # Location at time of report
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    
    timestamp = db.Column(db.DateTime, nullable=False)
    raw_json = db.Column(db.Text, nullable=True)  # Store complete sensor JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'acc_peak': self.acc_peak,
            'gyro_peak': self.gyro_peak,
            'speed': self.speed,
            'lat': self.lat,
            'lng': self.lng,
            'timestamp': self.timestamp.isoformat(),
            'created_at': self.created_at.isoformat()
        }


class Media(db.Model):
    """Media files associated with incidents"""
    __tablename__ = 'media'
    
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey('incidents.id'), nullable=False)
    media_type = db.Column(db.String(20), nullable=False)  # snapshot, video
    file_path = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'incident_id': self.incident_id,
            'media_type': self.media_type,
            'file_path': self.file_path,
            'url': f'/api/media/{self.id}',
            'created_at': self.created_at.isoformat()
        }


class ActionLog(db.Model):
    """Log of actions taken on incidents"""
    __tablename__ = 'action_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey('incidents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)
    # acknowledge, dispatch, resolve, false_alarm
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'incident_id': self.incident_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'action_type': self.action_type,
            'note': self.note,
            'created_at': self.created_at.isoformat()
        }