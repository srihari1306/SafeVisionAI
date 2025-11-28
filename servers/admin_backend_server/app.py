from flask import Flask, jsonify
from config import Config
from extensions import db, login_manager, socketio, cors
from routes import register_routes
import sockets

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    config_class.init_app(app)
    
    db.init_app(app)
    login_manager.init_app(app)
    cors.init_app(app, 
                  resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}},
                  supports_credentials=True)
    socketio.init_app(app, 
                      cors_allowed_origins=config_class.SOCKETIO_CORS_ALLOWED_ORIGINS,
                      manage_session=False)
    
    register_routes(app)

    with app.app_context():
        # db.drop_all()
        db.create_all()
    
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'accident-dashboard'}), 200

    @app.route('/')
    def index():
        return jsonify({
            'service': 'Accident Authority Dashboard API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth/*',
                'incidents': '/api/incidents/*',
                'reports': '/api/accidents/report, /api/mobile/report'
            }
        }), 200
    
    return app


if __name__ == '__main__':
    app = create_app()
    socketio.run(app, 
                 host='0.0.0.0', 
                 port=5000, 
                 debug=True,
                 allow_unsafe_werkzeug=True)