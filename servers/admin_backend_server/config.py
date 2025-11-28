import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SECRET_KEY = os.getenv('SECRET_KEY')
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    MEDIA_FOLDER = os.path.join(BASE_DIR, 'media')
    SNAPSHOTS_FOLDER = os.path.join(MEDIA_FOLDER, 'snapshots')
    VIDEOS_FOLDER = os.path.join(MEDIA_FOLDER, 'videos')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    
    CORS_SUPPORTS_CREDENTIALS = True
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']

    SOCKETIO_CORS_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']
    
    @staticmethod
    def init_app(app):
        os.makedirs(Config.MEDIA_FOLDER, exist_ok=True)
        os.makedirs(Config.SNAPSHOTS_FOLDER, exist_ok=True)
        os.makedirs(Config.VIDEOS_FOLDER, exist_ok=True)