import os
from datetime import timedelta

class Config:
    """Flask configuration"""
    
    # Base directory
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    # Database
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_DIR, "accident_dashboard.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session-based auth (Flask-Login)
    SECRET_KEY = os.environ.get('SECRET_KEY', 'naan_thaan_da_maasu')
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    # Media storage
    MEDIA_FOLDER = os.path.join(BASE_DIR, 'media')
    SNAPSHOTS_FOLDER = os.path.join(MEDIA_FOLDER, 'snapshots')
    VIDEOS_FOLDER = os.path.join(MEDIA_FOLDER, 'videos')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size
    
    # CORS
    CORS_SUPPORTS_CREDENTIALS = True
    # CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']
    CORS_ORIGINS = ['*']
    
    # SocketIO
    # SOCKETIO_CORS_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']
    SOCKETIO_CORS_ALLOWED_ORIGINS = ['*']
    
    @staticmethod
    def init_app(app):
        """Initialize application directories"""
        os.makedirs(Config.MEDIA_FOLDER, exist_ok=True)
        os.makedirs(Config.SNAPSHOTS_FOLDER, exist_ok=True)
        os.makedirs(Config.VIDEOS_FOLDER, exist_ok=True)