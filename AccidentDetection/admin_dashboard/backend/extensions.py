from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO
from flask_cors import CORS

# Initialize extensions (without binding to app yet)
db = SQLAlchemy()
login_manager = LoginManager()
socketio = SocketIO(cors_allowed_origins="*", manage_session=False)
cors = CORS()

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    from models import User
    return User.query.get(int(user_id))