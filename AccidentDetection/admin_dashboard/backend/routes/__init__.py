from flask import Blueprint

def register_routes(app):
    """Register all route blueprints"""
    from routes.auth import auth_bp
    from routes.incidents import incidents_bp
    from routes.reports import reports_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(incidents_bp, url_prefix='/api/incidents')
    app.register_blueprint(reports_bp, url_prefix='/api')