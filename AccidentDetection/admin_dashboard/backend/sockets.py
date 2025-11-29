from flask_socketio import emit, disconnect
from flask_login import current_user
from extensions import socketio
from flask import request

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection - check authentication"""
    if not current_user.is_authenticated:
        print('WebSocket connection rejected: User not authenticated')
        disconnect()
        return False
    
    print(f'WebSocket connected: {current_user.username}')
    emit('connection_status', {'status': 'connected', 'user': current_user.username})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    if current_user.is_authenticated:
        print(f'WebSocket disconnected: {current_user.username}')


@socketio.on('ping')
def handle_ping():
    """Handle ping for connection keepalive"""
    emit('pong', {'timestamp': 'alive'})