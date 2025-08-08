"""
Socket.IO events for real-time dashboard updates
"""
import logging
from flask_socketio import join_room, leave_room, emit
from datetime import datetime

logger = logging.getLogger(__name__)

def setup_socket_events(socketio_app, bot):
    """Setup Socket.IO events for real-time dashboard updates"""
    
    @socketio_app.on('connect')
    def on_connect():
        logger.info("Client connected to Socket.IO")
    
    @socketio_app.on('disconnect')
    def on_disconnect():
        logger.info("Client disconnected from Socket.IO")
    
    @socketio_app.on('join_guild_room')
    def on_join_guild_room(data):
        """Join a guild-specific room for updates"""
        guild_id = data.get('guild_id')
        if guild_id:
            room_name = f"guild_{guild_id}"
            join_room(room_name)
            logger.info(f"Client joined guild room: {room_name}")
            emit('joined_room', {'room': room_name, 'guild_id': guild_id})
        else:
            logger.warning("join_guild_room called without guild_id")
    
    @socketio_app.on('leave_guild_room')
    def on_leave_guild_room(data):
        """Leave a guild-specific room"""
        guild_id = data.get('guild_id')
        if guild_id:
            room_name = f"guild_{guild_id}"
            leave_room(room_name)
            logger.info(f"Client left guild room: {room_name}")
            emit('left_room', {'room': room_name, 'guild_id': guild_id})
    
    # Function to emit filter actions to dashboard
    def emit_filter_action(guild_id: int, violation_data: dict):
        """Emit filter action to dashboard clients in real-time"""
        try:
            room_name = f"guild_{guild_id}"
            
            # Ensure all required fields are present
            formatted_data = {
                'id': violation_data.get('id', str(int(datetime.utcnow().timestamp() * 1000))),
                'user_id': str(violation_data.get('user_id', '')),
                'user_name': violation_data.get('user_name', 'Unknown User'),
                'user_avatar': violation_data.get('user_avatar'),
                'channel_name': violation_data.get('channel_name', 'Unknown Channel'),
                'blocked_words': violation_data.get('blocked_words', []),
                'action_taken': violation_data.get('action_taken', 'delete_only'),
                'timestamp': violation_data.get('timestamp', datetime.utcnow().isoformat()),
                'guild_id': str(guild_id)
            }
            
            # Emit to all clients in the guild room
            socketio_app.emit('filter_action_logged', formatted_data, room=room_name)
            logger.info(f"✅ Emitted filter action to dashboard for guild {guild_id} in room {room_name}")
            
        except Exception as e:
            logger.error(f"❌ Error emitting filter action to dashboard: {e}")
    
    def emit_settings_update(guild_id: int, settings_data: dict):
        """Emit settings update to dashboard clients"""
        try:
            room_name = f"guild_{guild_id}"
            
            formatted_data = {
                'guild_id': str(guild_id),
                'settings': settings_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            socketio_app.emit('settings_updated', formatted_data, room=room_name)
            logger.info(f"✅ Emitted settings update to dashboard for guild {guild_id}")
            
        except Exception as e:
            logger.error(f"❌ Error emitting settings update: {e}")
    
    def emit_stats_update(guild_id: int, stats_data: dict):
        """Emit statistics update to dashboard clients"""
        try:
            room_name = f"guild_{guild_id}"
            
            formatted_data = {
                'guild_id': str(guild_id),
                'stats': stats_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            socketio_app.emit('stats_updated', formatted_data, room=room_name)
            logger.info(f"✅ Emitted stats update to dashboard for guild {guild_id}")
            
        except Exception as e:
            logger.error(f"❌ Error emitting stats update: {e}")
    
    # Store the emit functions globally so other modules can use them
    import __main__
    __main__.emit_filter_action = emit_filter_action
    __main__.emit_settings_update = emit_settings_update
    __main__.emit_stats_update = emit_stats_update
    
    logger.info("✅ Socket.IO events setup completed")
    
    return {
        'emit_filter_action': emit_filter_action,
        'emit_settings_update': emit_settings_update,
        'emit_stats_update': emit_stats_update
    }
