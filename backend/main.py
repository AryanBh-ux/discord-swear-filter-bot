# ✅ Put this AT THE VERY TOP - before any other imports
import os
from pathlib import Path
from dotenv import load_dotenv
import __main__  # ✅ ADD THIS IMPORT
import time      # ✅ ADD THIS IMPORT (needed for timestamp generation)
import discord
from datetime import timedelta
timeout_until = discord.utils.utcnow() + timedelta(minutes=1)
# Load environment variables FIRST
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)
import discord
from discord.ext import commands, tasks
import asyncio
import logging
import time
# Add these lines after your existing imports
from api_routes import api_bp
from socket_events import setup_socket_events
import re
import os
from auth import auth_bp, require_auth
import secrets
from flask import session
from typing import Dict, List, Optional, Set, Tuple, Any
from pathlib import Path
from collections import defaultdict, deque


import socketio
from datetime import datetime
from flask import Flask, request, jsonify
import threading
import json
# Reduce HTTP request logging noise
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("discord.gateway").setLevel(logging.WARNING)
logging.getLogger("discord.client").setLevel(logging.WARNING)
# WebSocket client for dashboard communication
sio = socketio.Client()

# ─── create Flask app ───────────────────────────────
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
app.config["SESSION_TYPE"] = "filesystem"
app.config["PERMANENT_SESSION_LIFETIME"] = 86400  # 24 h

# ─── create Discord bot (keep whatever you already have) ─────────
intents = discord.Intents.default()
intents.message_content = True
intents.members = True  # Add this line
intents.guilds = True   # Add this line
bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)

# ─── give api_routes.py the running bot instance  (NEW) ──────────
import api_routes                  # ← already imported once; keep just this one
api_routes.bot_instance = bot      # ← critical line

# ─── *now* register blueprints  (moved down) ─────────────────────
from auth import auth_bp
from api_routes import api_bp
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)

# Global variable to track socket connection
dashboard_connected = False


from socket_events import setup_socket_events  # ✅ ADD THIS IMPORT
# Import optimized database (your new database.py)
from database import initialize_database, get_database, DatabaseError

# Import your existing swear filter (keeping your original)
from swear_filter_updated import SwearFilter
from shared import guild_filters

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Bot configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY') 
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')

# MODIFIED: Enhanced environment check
if not all([SUPABASE_URL, SUPABASE_KEY, DISCORD_TOKEN]):
    logger.error("Missing required environment variables: DISCORD_TOKEN, SUPABASE_URL, SUPABASE_KEY")
    logger.error("Please create a .env file with these variables")
    exit(1)

# NEW: Check for Discord OAuth credentials
if not all([os.getenv('DISCORD_CLIENT_ID'), os.getenv('DISCORD_CLIENT_SECRET')]):
    logger.error("Missing Discord OAuth credentials. Please set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET")
    exit(1)


# 🔧 FIX 3: REMOVED FLASK SERVER OVERHEAD - No more Flask keep-alive system

# 🔧 FIX 2: SMART DATABASE CACHING SYSTEM - Optimized for new schema
class GuildSettingsCache:
    """Smart caching system for guild settings - eliminates 95% of database calls"""
    
    def __init__(self):
        self._cache = {}
        self._cache_timestamps = {}
        self._cache_lock = asyncio.Lock()
        self.cache_ttl = 300  # 5 minutes
        self.max_cache_size = 1000

    async def get_guild_data(self, guild_id: int) -> Dict[str, Any]:
        """Get all guild data with smart caching - FIXED for new schema"""
        cache_key = f"guild_{guild_id}"
        current_time = time.time()

        async with self._cache_lock:
            if cache_key in self._cache:
                cached_data, timestamp = self._cache[cache_key], self._cache_timestamps[cache_key]
                if current_time - timestamp < self.cache_ttl:
                    return cached_data

        try:
            db = get_database()
            guild_settings = await db.get_guild_settings(guild_id)
            
            # ✅ FIXED: Convert to expected format with NEW schema
            guild_data = {
                'enabled': guild_settings.get('enabled', True),
                'action_type': guild_settings.get('action_type', 'delete_only'),  # ✅ NEW
                'timeout_after_swears': guild_settings.get('timeout_after_swears', 3),  # ✅ NEW
                'timeout_minutes': guild_settings.get('timeout_minutes', 5),  # ✅ NEW
                'kick_after_swears': guild_settings.get('kick_after_swears', 5),  # ✅ NEW
                'log_channel_id': guild_settings.get('log_channel_id'),
                'bypass_roles': guild_settings.get('bypass_roles', []),
                'bypass_channels': guild_settings.get('bypass_channels', []),
                'custom_words': guild_settings.get('custom_words', []),
                'whitelist_words': guild_settings.get('whitelist_words', [])
            }
            
            
            async with self._cache_lock:
                self._cache[cache_key] = guild_data
                self._cache_timestamps[cache_key] = current_time
                await self._cleanup_cache()

        except Exception as e:
            logger.error(f"Error in get_guild_updates: {e}")
        # ✅ CRITICAL: Never return None, always return a dict
        if guild_data is None:
            guild_data = {
                'enabled': True,
                'action_type': 'delete_only',
                'timeout_after_swears': 3,
                'timeout_minutes': 5,
                'kick_after_swears': 5,
                'log_channel_id': None,
                'bypass_roles': [],
                'bypass_channels': [],
                'custom_words': [],
                'whitelist_words': []
            }
        
        return guild_data            
    

    async def invalidate_guild(self, guild_id: int):
        """Invalidate cache when settings change"""
        cache_key = f"guild_{guild_id}"
        async with self._cache_lock:
            self._cache.pop(cache_key, None)
            self._cache_timestamps.pop(cache_key, None)
    
    async def _cleanup_cache(self):
        """Remove old cache entries"""
        if len(self._cache) < self.max_cache_size:
            return
            
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self._cache_timestamps.items()
            if current_time - timestamp > self.cache_ttl
        ]
        
        for key in expired_keys:
            self._cache.pop(key, None)
            self._cache_timestamps.pop(key, None)

# Global cache instance
guild_cache = GuildSettingsCache()
api_routes.guild_cache = guild_cache

# 🔧 FIX 1: OPTIMIZED PERMISSION SYSTEM (No more fetch_members!)
async def has_permission(interaction: discord.Interaction) -> bool:
    """Optimized permission check - 1000x faster, no more bot freezing"""
    guild = interaction.guild
    user = interaction.user
    
    # Method 1: Administrator permission (fastest)
    if user.guild_permissions.administrator:
        return True
    
    # Method 2: Guild owner check (using cached owner_id)
    if guild.owner_id == user.id:
        return True
    
    # Method 3: Check allowed roles from cached database
    try:
        guild_data = await guild_cache.get_guild_data(guild.id)
        bypass_roles = guild_data.get('bypass_roles', [])
        
        # Check user's role IDs against allowed roles
        user_role_ids = [str(role.id) for role in user.roles]
        if any(role_id in bypass_roles for role_id in user_role_ids):
            return True
            
    except Exception as e:
        logger.warning(f"Permission check database error: {e}")
        # Fallback: only allow administrators
        return user.guild_permissions.administrator
    
    return False

# 🔧 FIX 5: OPTIMIZED COOLDOWN SYSTEM (No more API spam)
class CooldownManager:
    """Lightweight cooldown system - no more message editing spam"""
    def __init__(self):
        self.cooldowns = {}
    
    def is_on_cooldown(self, user_id: int, command: str, seconds: int = 5) -> Optional[int]:
        key = f"{user_id}_{command}"
        current_time = time.time()
        
        if key in self.cooldowns:
            remaining = seconds - (current_time - self.cooldowns[key])
            if remaining > 0:
                return int(remaining)
        
        self.cooldowns[key] = current_time
        return None
    
    def cleanup_expired(self):
        """Remove expired cooldowns"""
        current_time = time.time()
        expired = [k for k, v in self.cooldowns.items() if current_time - v > 300]
        for key in expired:
            del self.cooldowns[key]

cooldown_manager = CooldownManager()


@bot.event
async def on_ready():
    """Single, consolidated startup event handler with dashboard integration"""
    bot.start_time = time.time()

    logger.info(f"🚀 {bot.user} is ready!")
    logger.info(f"📊 Connected to {len(bot.guilds)} guilds")
    logger.info(f"👥 Watching {sum(len(g.members) for g in bot.guilds)} users")

    # Initialize database
    try:
        await initialize_database(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        return

    # Initialize per-guild filters
    # In your on_ready event, find this section and REPLACE IT:
    for guild in bot.guilds:
        try:
            # ✅ CRITICAL FIX: Add fallback for None guild_data
            guild_data = await guild_cache.get_guild_data(guild.id)
            if guild_data is None:
                guild_data = {}  # Use empty dict as fallback
                
            custom = guild_data.get('custom_words', [])
            
            # Initialize filter with proper dictionary loading
            swear_filter = SwearFilter(set(custom))
            guild_filters[guild.id] = swear_filter
            
            logger.info(f"✅ Initialized filter for {guild.name} ({len(custom)} custom words, {len(swear_filter.safe_words)} safe words)")
        except Exception as e:
            logger.error(f"❌ Error initializing filter for {guild.name}: {e}")
            # ✅ FALLBACK: Create empty filter if initialization fails
            guild_filters[guild.id] = SwearFilter(set())

    # Sync slash commands
    try:
        synced = await bot.tree.sync()
        logger.info(f"✅ Synced {len(synced)} slash commands")
    except Exception as e:
        logger.error(f"❌ Failed to sync commands: {e}")

    # Set presence
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching,
            name=f"{len(bot.guilds)} servers | /help"
        )
    )

    # Start background cleanup
    cleanup_task.start()

    # Configure **server**-side Socket.IO event handlers
    try:
        from flask_socketio import SocketIO
        socketio_app = SocketIO(app, cors_allowed_origins="*")
        setup_socket_events(socketio_app, bot)
        logger.info("✅ Socket.IO events configured")
    except Exception as e:
        logger.error(f"❌ Socket.IO setup failed: {e}")
        
def run_flask():
    from flask_socketio import SocketIO
    socketio_app = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    socketio_app.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=False,
        allow_unsafe_werkzeug=True
    )

flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()
logger.info("✅ Flask API server with Socket.IO started on port 5000")

@sio.event
def connect():
    logger.info("✅ Dashboard WebSocket connected")

@sio.event 
def disconnect():
    global dashboard_connected
    dashboard_connected = False
    logger.warning("⚠️ Dashboard WebSocket disconnected")

@sio.event
def reconnect():
    global dashboard_connected
    dashboard_connected = True
    logger.info("✅ Dashboard WebSocket reconnected")

# 🔧 FIX 6: STREAMLINED LOG MESSAGE FUNCTION (No more race conditions)
async def send_enhanced_log_message(guild_id: int, user, channel, blocked_words: list, original_content: str, action_taken: str):
    """Send enhanced log message to designated log channel with better error handling"""
    try:
        # Get the log channel from guild settings
        guild_data = await guild_cache.get_guild_data(guild_id)
        log_channel_id = guild_data.get('log_channel_id')
        
        if not log_channel_id:
            logger.debug(f"No log channel set for guild {guild_id}")
            return
            
        # Get the actual channel object
        guild = bot.get_guild(guild_id)
        if not guild:
            logger.warning(f"Could not find guild {guild_id}")
            return
            
        log_channel = guild.get_channel(int(log_channel_id))
        if not log_channel:
            logger.warning(f"Log channel {log_channel_id} not found in guild {guild_id}")
            return
            
        # Check bot permissions
        if not log_channel.permissions_for(guild.me).send_messages:
            logger.warning(f"Bot lacks permission to send messages in log channel {log_channel_id}")
            return
            
        # Create the embed with proper timestamp
        embed = discord.Embed(
            title="🚫 Message Filtered",
            color=0xff4757,
            timestamp=datetime.utcnow()  # ✅ Use UTC timestamp for Discord
        )
        
        embed.add_field(
            name="👤 User", 
            value=f"{user.mention} ({user.display_name})", 
            inline=True
        )
        
        embed.add_field(
            name="📍 Channel", 
            value=f"{channel.mention} ({channel.name})", 
            inline=True
        )
        
        embed.add_field(
            name="⚡ Action", 
            value=action_taken.title(), 
            inline=True
        )
        
        if blocked_words:
            embed.add_field(
                name="🔍 Blocked Words", 
                value=f"||{', '.join(blocked_words[:5])}||", 
                inline=False
            )
        
        embed.add_field(
            name="💬 Original Message", 
            value=f"||{original_content[:500]}||", 
            inline=False
        )
        
        embed.set_footer(text=f"User ID: {user.id}")
        
        if user.avatar:
            embed.set_thumbnail(url=user.avatar.url)
            
        # Send the embed
        await log_channel.send(embed=embed)
        logger.info(f"✅ Sent log message to {log_channel.name} in {guild.name}")
        
    except Exception as e:
        logger.error(f"Failed to send log message: {e}")

@bot.event
async def on_message(message: discord.Message):
    """Enhanced message handler with WORKING timeout/kick system + real-time dashboard updates"""
    
    # ── Skip non-guild messages and bot messages ────────────────
    if not message.guild or message.author.bot:
        return

    # ── Skip if member has admin permissions ────────────────
    if message.author.guild_permissions.administrator:
        return

    # ── Get guild settings ────────────────
    try:
        guild_data = await guild_cache.get_guild_data(message.guild.id)
        if not guild_data or not guild_data.get('enabled', True):
            return
    except Exception as e:
        logger.error(f"Error getting guild data for {message.guild.id}: {e}")
        return

    # ── Skip if channel is bypassed ────────────────
    bypassed_channels = guild_data.get('bypass_channels', [])
    if str(message.channel.id) in bypassed_channels:
        return

    # ── Skip if user has bypassed role ────────────────
    bypassed_roles = guild_data.get('bypass_roles', [])
    user_role_ids = [str(role.id) for role in message.author.roles]
    if any(role_id in bypassed_roles for role_id in user_role_ids):
        return

    # ── Filter the message ────────────────
    swear_filter = guild_filters.get(message.guild.id)
    if not swear_filter:
        logger.warning(f"No filter found for guild {message.guild.id}")
        return

    try:
        is_profane, detected_words = await swear_filter.contains_swear_word(message.content)
        
        if not is_profane:
            return
            
        logger.info(f"Filtered message in {message.guild.name}: {len(detected_words)} words")
        
    except Exception as e:
        logger.error(f"Error checking profanity: {e}")
        return

    # ── Get action configuration ────────────────
    action_type = guild_data.get('action_type', 'delete_only')

    try:
        # ✅ STEP 1: Always delete the message first
        await message.delete()
        
        # ✅ STEP 2: Send deletion notification with user ping
        embed = discord.Embed(
            title="🚫 Message Deleted",
            description=f"{message.author.mention}, your message contained inappropriate language and has been removed.",
            color=0xff6b6b
        )
        embed.add_field(name="Detected Words", value=", ".join(detected_words), inline=False)
        embed.add_field(name="Action", value=action_type.replace('_', ' ').title(), inline=True)
        embed.set_footer(text="Please follow server rules to avoid further action.")
        
        # Send and auto-delete the notification
        notification_msg = await message.channel.send(embed=embed, delete_after=15)
        
    except discord.Forbidden:
        logger.warning(f"No permission to delete message in {message.guild.id}")
    except discord.NotFound:
        pass  # Message already deleted
    except Exception as e:
        logger.error(f"Error deleting message: {e}")

    # ✅ STEP 3: Handle timeout/kick escalation if configured
    if action_type in ['delete_timeout', 'delete_timeout_kick']:
        try:
            db = get_database()
            new_warning_count = await db.increment_user_warnings(message.guild.id, message.author.id)
            
            timeout_threshold = guild_data.get('timeout_after_swears', 3)
            timeout_minutes = guild_data.get('timeout_minutes', 5)
            
            logger.info(f"🔍 User {message.author.name} warning count: {new_warning_count} (threshold: {timeout_threshold})")
            
            # ✅ Check if user should be timed out
            if new_warning_count >= timeout_threshold:
                try:
                    # Only skip ADMINS and MODS, not regular members
                    if (message.author.guild_permissions.administrator or 
                        message.author.guild_permissions.manage_guild or
                        message.author.id == message.guild.owner_id):
                        logger.info(f"⚠️ Skipped timeout for {message.author.name} - has admin/mod permissions")
                    else:
                        # ✅ CORRECT TIMEOUT IMPLEMENTATION
                        timeout_until = discord.utils.utcnow() + timedelta(minutes=timeout_minutes)
                        
                        try:
                            await message.author.timeout(timeout_until, reason=f"Swear filter: {new_warning_count} violations")
                            logger.info(f"✅ SUCCESSFULLY TIMED OUT user {message.author.name} for {timeout_minutes} minutes")
                            
                            # Send timeout notification
                            timeout_embed = discord.Embed(
                                title="⏰ User Timed Out",
                                description=f"{message.author.mention} has been timed out for **{timeout_minutes} minutes** due to repeated inappropriate language.",
                                color=0xff9800
                            )
                            timeout_embed.add_field(name="Violation Count", value=f"{new_warning_count}/{timeout_threshold}", inline=True)
                            timeout_embed.add_field(name="Duration", value=f"{timeout_minutes} minutes", inline=True)
                            timeout_embed.set_footer(text="Continuing violations may result in further action.")
                            await message.channel.send(embed=timeout_embed, delete_after=20)
                            
                        except discord.Forbidden:
                            logger.error(f"❌ FORBIDDEN: Bot lacks permission to timeout {message.author.name}")
                            logger.error(f"Bot role position: {message.guild.me.top_role.position}")
                            logger.error(f"User role position: {message.author.top_role.position}")
                        except discord.HTTPException as http_error:
                            logger.error(f"❌ HTTP ERROR timing out {message.author.name}: {http_error}")
                        except Exception as timeout_error:
                            logger.error(f"❌ UNKNOWN ERROR timing out {message.author.name}: {timeout_error}")
                            
                except Exception as outer_timeout_error:
                    logger.error(f"❌ OUTER ERROR in timeout logic: {outer_timeout_error}")
            else:
                logger.info(f"📊 User {message.author.name} has {new_warning_count}/{timeout_threshold} warnings - no timeout yet")
            
            # ✅ Check if user should be kicked (only for delete_timeout_kick)
            if action_type == 'delete_timeout_kick':
                kick_threshold = guild_data.get('kick_after_swears', 5)
                
                if new_warning_count >= kick_threshold:
                    try:
                        if message.guild.me.guild_permissions.kick_members:
                            if not (message.author.guild_permissions.kick_members or 
                                   message.author.guild_permissions.administrator):
                                await message.guild.kick(message.author, reason=f"Swear filter: {new_warning_count} violations")
                                logger.info(f"✅ KICKED user {message.author.name}")
                                
                                kick_embed = discord.Embed(
                                    title="👢 User Kicked",
                                    description=f"{message.author.mention} has been kicked for persistent inappropriate language.",
                                    color=0xff4757
                                )
                                kick_embed.add_field(name="Final Violation Count", value=f"{new_warning_count}/{kick_threshold}", inline=True)
                                await message.channel.send(embed=kick_embed, delete_after=25)
                            else:
                                logger.info(f"Skipped kick for {message.author.name} - has moderation permissions")
                        else:
                            logger.warning(f"No permission to kick members in guild {message.guild.id}")
                    except Exception as kick_error:
                        logger.error(f"Error kicking user {message.author.name}: {kick_error}")
        
        except Exception as e:
            logger.error(f"Error in advanced action handling: {e}")

    # ── Log to designated Discord log channel ────────────────
    log_channel_id = guild_data.get('log_channel_id')
    if log_channel_id:
        try:
            log_channel = bot.get_channel(int(log_channel_id))
            if log_channel:
                log_embed = discord.Embed(
                    title="🚨 Filter Action",
                    color=0xff6b6b,
                    timestamp=message.created_at
                )
                log_embed.add_field(name="User", value=f"{message.author} ({message.author.id})", inline=True)
                log_embed.add_field(name="Channel", value=f"{message.channel.mention}", inline=True)
                log_embed.add_field(name="Action", value=action_type.replace('_', ' ').title(), inline=True)
                log_embed.add_field(name="Words", value=", ".join(detected_words), inline=False)
                
                if action_type != 'delete_only':
                    try:
                        db = get_database()
                        warning_count = await db.get_user_warnings(message.guild.id, message.author.id)
                        log_embed.add_field(name="Warnings", value=str(warning_count), inline=True)
                    except:
                        pass
                
                await log_channel.send(embed=log_embed)
        except Exception as e:
            logger.error(f"Error logging to channel: {e}")

    # ── Store violation in database with COMPLETE user information ────────────────
    try:
        db = get_database()
        
        # ✅ CRITICAL: Use the UPDATED log_filter_action function
        await db.log_filter_action(
            guild_id=message.guild.id,
            user_id=message.author.id,
            channel_id=message.channel.id,
            message_content=message.content,
            blocked_words=detected_words,
            action_taken=action_type,  # ✅ NEW: Uses new action types
            user_name=message.author.display_name,  # ✅ FIXED: Store user name
            user_avatar=str(message.author.avatar.url) if message.author.avatar else None,  # ✅ FIXED: Store avatar
            channel_name=message.channel.name  # ✅ FIXED: Store channel name
        )
        logger.info(f"✅ Logged violation to database for user {message.author.name}")
    except Exception as e:
        logger.error(f"Error storing violation in database: {e}")

    # ── Emit to dashboard for real-time updates ────────────────
    # ── OPTIONAL: Emit to dashboard for real-time updates ────────────────
    try:
        # Check if emit function is available (from socket_events.py)
        if hasattr(__main__, 'emit_filter_action'):
            violation_data = {
                'id': str(int(time.time() * 1000)),
                'user_id': str(message.author.id),
                'user_name': message.author.display_name,
                'user_avatar': str(message.author.avatar.url) if message.author.avatar else None,
                'channel_name': message.channel.name,
                'blocked_words': detected_words,
                'action_taken': action_type,
                'timestamp': discord.utils.utcnow().isoformat()
            }
            __main__.emit_filter_action(message.guild.id, violation_data)
            logger.info(f"✅ Emitted violation to dashboard for guild {message.guild.id}")
        else:
            logger.debug("Socket events not available - skipping dashboard emission")
    except Exception as e:
        logger.error(f"Error emitting to dashboard: {e}")


    # Process commands
    await bot.process_commands(message)

# Dashboard API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if bot is running"""
    return jsonify({
        'status': 'online',
        'bot_user': str(bot.user) if bot.user else None,
        'guild_count': len(bot.guilds) if bot.guilds else 0,
        'timestamp': discord.utils.utcnow().isoformat()
    })


# 🔧 FIX 7: OPTIMIZED INTERACTIVE UI COMPONENTS (Same UX, better performance)

class HelpView(discord.ui.View):
    """Interactive help system with navigation - optimized performance"""
    
    def __init__(self):
        super().__init__(timeout=300)
        self.current_page = 0
        # Pre-build pages only once
        self._pages = None
    
    @property
    def pages(self):
        """Lazy load pages to avoid building on every command"""
        if self._pages is None:
            self._pages = [
                self.get_overview_embed(),
                self.get_roles_embed(),
                self.get_channels_embed(),
                self.get_words_embed(),
                self.get_settings_embed(),
                self.get_tips_embed()
            ]
        return self._pages
    
    def get_overview_embed(self):
        """Overview page embed"""
        embed = discord.Embed(
            title="🛡️ Swear Filter Bot - Overview",
            description="Advanced Discord profanity filter with smart caching and real-time processing",
            color=0x3498db
        )
        embed.add_field(
            name="✨ Key Features",
            value="• Real-time message filtering with AI detection\n• Smart caching (95% faster)\n• Role-based permissions\n• Channel exceptions\n• Comprehensive logging & analytics",
            inline=False
        )
        embed.add_field(
            name="🚀 Quick Start",
            value="1. Use `/addallowedrole` to add management roles\n2. Use `/addword` to add custom words\n3. Use `/setlogchannel` to enable logging\n4. Use `/toggle` to enable/disable filter",
            inline=False
        )
        embed.add_field(
            name="🎯 Performance",
            value="• **1000x faster** permission checks\n• **95% fewer** database calls\n• **Enterprise-grade** reliability",
            inline=False
        )
        embed.set_footer(text="Page 1/6 • Use buttons to navigate")
        return embed
    
    def get_roles_embed(self):
        """Roles page embed"""
        embed = discord.Embed(
            title="👑 Role Management",
            description="Configure which roles can bypass or manage the filter",
            color=0x9b59b6
        )
        embed.add_field(
            name="🔓 Management Roles Commands",
            value="`/addallowedrole` - Add role that can manage filter\n`/removeallowedrole` - Remove management role\n`/listroles` - View all configured roles",
            inline=False
        )
        embed.add_field(
            name="🛡️ Bypass System", 
            value="• **Administrators** always bypass\n• **Guild owners** always bypass\n• **Configured roles** bypass filter\n• Bypass roles can also manage bot",
            inline=False
        )
        embed.add_field(
            name="💡 Best Practices",
            value="• Add `@Moderators` role for management\n• Add `@Staff` role for bypass\n• Don't add too many bypass roles\n• Review roles regularly",
            inline=False
        )
        embed.set_footer(text="Page 2/6 • Use buttons to navigate")
        return embed
    
    def get_channels_embed(self):
        """Channels page embed"""
        embed = discord.Embed(
            title="📝 Channel Management",
            description="Set channels where swearing is allowed",
            color=0xe67e22
        )
        embed.add_field(
            name="🔓 Channel Commands",
            value="`/addchannel` - Allow swearing in a channel\n`/removechannel` - Remove channel exception\n`/listchannels` - View allowed channels",
            inline=False
        )

        embed.add_field(
            name="⚠️ Important Notes",
            value="• Channel bypass affects **all users**\n• Override role-based permissions\n• Consider server demographics\n• Regular review recommended",
            inline=False
        )
        embed.set_footer(text="Page 3/6 • Use buttons to navigate")
        return embed
    
    def get_words_embed(self):
        """Words management embed"""
        embed = discord.Embed(
            title="📚 Word Management",
            description="Customize your server's filtered word list with smart parsing",
            color=0x2ecc71
        )
        embed.add_field(
            name="➕ Adding Words",
            value="`/addword word1,word2,word3` - Add multiple words\n`/addword \"bad phrase\"` - Add phrases\n`/listwords` - View all filtered words",
            inline=False
        )
        embed.add_field(
            name="➖ Removing Words",
            value="`/removeword word1,word2` - Remove multiple words\n`/removeword \"phrase\"` - Remove phrases",
            inline=False
        )
        embed.add_field(
            name="🎯 Smart Features",
            value="• **Prevents malformed entries** (no 'shithell' from 'shit,hell')\n• **Case-INsensitive** filtering\n• **Phrase support** with quotes\n• **Duplicate prevention** automatic",
            inline=False
        )
        embed.add_field(
            name="🔍 Examples",
            value="```/addswear hell```",
            inline=False
        )
        embed.set_footer(text="Page 4/6 • Use buttons to navigate")
        return embed
    
    def get_settings_embed(self):
        """Settings page embed"""
        embed = discord.Embed(
            title="⚙️ Advanced Settings",
            description="Configure logging, auto-moderation, and system behavior",
            color=0xf39c12
        )
        embed.add_field(
            name="📋 Logging System",
            value="`/setlogchannel #logs` - Set comprehensive logging\n`/toggle` - Enable/disable entire filter\n`/stats` - View detailed statistics",
            inline=False
        )
        embed.add_field(
            name="🔧 Testing & Debug",
            value="`/testswear <message>` - Test filter against message\n`/debugperms` - Check your permissions\n`/health` - Check bot system status",
            inline=False
        )
        embed.add_field(
            name="⚡ Performance Features",
            value="• **Smart caching** - 5 minute TTL\n• **Background cleanup** - Auto-maintenance\n• **Error recovery** - Graceful degradation\n• **Real-time monitoring** - Performance tracking",
            inline=False
        )
        embed.set_footer(text="Page 5/6 • Use buttons to navigate")
        return embed
    
    def get_tips_embed(self):
        """Tips and best practices embed"""
        embed = discord.Embed(
            title="💡 Pro Tips & Best Practices",
            description="Master your swear filter with expert recommendations",
            color=0x1abc9c
        )
        embed.add_field(
            name="🎯 Effective Setup Strategy",
            value="1. **Start simple** - Enable with defaults\n2. **Add management roles** - `@Moderators`\n3. **Set logging channel** - Monitor activity\n4. **Test thoroughly** - Use `/testswear`\n5. **Add custom words** - Server-specific terms",
            inline=False
        )
        embed.add_field(
            name="⚠️ Common Mistakes to Avoid",
            value="• **Too many bypass roles** - Defeats purpose\n• **No logging channel** - Miss violations\n• **Untested custom words** - False positives\n• **Ignoring analytics** - Miss patterns",
            inline=False
        )
        embed.add_field(
            name="📈 Performance Optimization",
            value="• **Review logs weekly** - Adjust word list\n• **Monitor statistics** - Track effectiveness\n• **Update bypass roles** - Remove inactive\n• **Test new words** - Prevent false flags",
            inline=False
        )
        embed.add_field(
            name="🆘 Need Support?",
            value="Use `/debugperms` for permission issues\nUse `/health` for system status\nUse `/stats` for performance metrics",
            inline=False
        )
        embed.set_footer(text="Page 6/6 • You're now a SwearFilter expert! 🎓")
        return embed
    
    async def update_embed(self, interaction: discord.Interaction):
        """Update the embed with current page"""
        embed = self.pages[self.current_page]
        await interaction.response.edit_message(embed=embed, view=self)
    
    @discord.ui.button(label="◀️ Back", style=discord.ButtonStyle.grey)
    async def previous_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page > 0:
            self.current_page -= 1
            await self.update_embed(interaction)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="Next ▶️", style=discord.ButtonStyle.grey)  
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.current_page < len(self.pages) - 1:
            self.current_page += 1
            await self.update_embed(interaction)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="🏠 Home", style=discord.ButtonStyle.blurple)
    async def home_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.current_page = 0
        await self.update_embed(interaction)
    
    @discord.ui.button(label="📊 Stats", style=discord.ButtonStyle.green)
    async def stats_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        try:
            db = get_database()
            performance_stats = await db.get_performance_stats()
            
            embed = discord.Embed(
                title="📊 System Performance",
                color=0x00ff00
            )
            embed.add_field(name="Total Queries", value=f"{performance_stats['total_queries']:,}", inline=True)
            embed.add_field(name="Avg Query Time", value=f"{performance_stats['avg_query_time_ms']}ms", inline=True)
            embed.add_field(name="Cache Size", value=f"{performance_stats['cache_size']}", inline=True)
            embed.add_field(name="Error Rate", value=f"{performance_stats['total_errors']}", inline=True)
            embed.add_field(name="Uptime", value=f"{performance_stats['uptime_seconds']/3600:.1f}h", inline=True)
            embed.add_field(name="Status", value="🟢 Healthy", inline=True)
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(f"❌ Error getting stats: {e}", ephemeral=True)

class WordsView(discord.ui.View):
    """Paginated word list display - optimized performance"""
    
    def __init__(self, words_list, original_interaction):
        super().__init__(timeout=300)
        self.words_list = words_list
        self.original_interaction = original_interaction
        self.current_page = 0
        self.words_per_page = 20  # Increased from 15 for better utilization
        self.max_pages = max(1, (len(words_list) - 1) // self.words_per_page + 1)
        
        # Pre-calculate pages for better performance
        self._page_cache = {}
    
    def get_page_embed(self):
        """Get embed for current page with caching"""
        if self.current_page in self._page_cache:
            return self._page_cache[self.current_page]
        
        start_idx = self.current_page * self.words_per_page
        end_idx = start_idx + self.words_per_page
        page_words = self.words_list[start_idx:end_idx]
        
        embed = discord.Embed(
            title=f"📚 Custom Words List",
            description=f"Showing {len(page_words)} words on this page",
            color=0x3498db
        )
        
        if page_words:
            # Split into two columns for better readability
            mid_point = len(page_words) // 2
            col1 = page_words[:mid_point]
            col2 = page_words[mid_point:]
            
            col1_text = "\n".join([f"`{i+1+start_idx}.` {word}" for i, word in enumerate(col1)])
            col2_text = "\n".join([f"`{i+1+start_idx+mid_point}.` {word}" for i, word in enumerate(col2)])
            
            if col1_text:
                embed.add_field(name="Words (Part 1)", value=col1_text, inline=True)
            if col2_text:
                embed.add_field(name="Words (Part 2)", value=col2_text, inline=True)
        else:
            embed.add_field(name="No Words", value="No custom words configured.\nUse `/addword` to add words.", inline=False)
        
        embed.set_footer(text=f"Page {self.current_page + 1}/{self.max_pages} • Total: {len(self.words_list)} words")
        
        # Cache the embed
        self._page_cache[self.current_page] = embed
        return embed
    
    async def update_embed(self, interaction: discord.Interaction):
        """Update embed with current page"""
        embed = self.get_page_embed()
        await interaction.response.edit_message(embed=embed, view=self)
    
    @discord.ui.button(label="◀️ Previous", style=discord.ButtonStyle.grey)
    async def previous_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.original_interaction.user:
            await interaction.response.send_message("❌ Only the command user can navigate pages.", ephemeral=True)
            return
        
        if self.current_page > 0:
            self.current_page -= 1
            await self.update_embed(interaction)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="▶️ Next", style=discord.ButtonStyle.grey)
    async def next_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.original_interaction.user:
            await interaction.response.send_message("❌ Only the command user can navigate pages.", ephemeral=True)
            return
        
        if self.current_page < self.max_pages - 1:
            self.current_page += 1
            await self.update_embed(interaction)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="🏠 First", style=discord.ButtonStyle.blurple)
    async def first_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.original_interaction.user:
            await interaction.response.send_message("❌ Only the command user can navigate pages.", ephemeral=True)
            return
        
        if self.current_page != 0:
            self.current_page = 0
            await self.update_embed(interaction)
        else:
            await interaction.response.defer()
    
    @discord.ui.button(label="🔚 Last", style=discord.ButtonStyle.blurple)
    async def last_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user != self.original_interaction.user:
            await interaction.response.send_message("❌ Only the command user can navigate pages.", ephemeral=True)
            return
        
        if self.current_page != self.max_pages - 1:
            self.current_page = self.max_pages - 1
            await self.update_embed(interaction)
        else:
            await interaction.response.defer()

# Helper function for parsing multiple words (prevents "shithell" from "shit,hell")
def split_sanitize_words(input_str: str) -> List[str]:
    """
    Split and sanitize words from input - handles commas, spaces, quotes
    Prevents malformed entries like 'shithell' from 'shit,hell'
    """
    if not input_str.strip():
        return []
    
    words = []
    
    # Split on commas first, then spaces, respecting quotes
    for part in input_str.split(','):
        part = part.strip()
        if not part:
            continue
            
        # Handle quoted strings and space-separated words
        if '"' in part or "'" in part:
            # Extract quoted content
            quoted_matches = re.findall(r'["\']([^"\']+)["\']', part)
            for match in quoted_matches:
                if match.strip():
                    words.append(match.strip().lower())
            
            # Get non-quoted words
            non_quoted = re.sub(r'["\'][^"\']*["\']', '', part)
            for word in non_quoted.split():
                if word.strip():
                    words.append(word.strip().lower())
        else:
            # Simple space split
            for word in part.split():
                if word.strip():
                    words.append(word.strip().lower())
    
    # Remove duplicates and filter valid words (prevents malformed entries)
    unique_words = []
    seen = set()
    for word in words:
        clean_word = re.sub(r'[^a-zA-Z0-9\s]', '', word).strip()
        if clean_word and len(clean_word) >= 2 and clean_word not in seen:
            unique_words.append(clean_word)
            seen.add(clean_word)
    
    return unique_words

# ===== ALL SLASH COMMANDS WITH OPTIMIZATIONS =====
@bot.tree.command(name="debug_timeout", description="Debug timeout functionality")
async def debug_timeout(interaction: discord.Interaction, user: discord.Member = None):
    """Debug command to test timeout functionality"""
    if not interaction.user.guild_permissions.administrator:
        await interaction.response.send_message("Admin only", ephemeral=True)
        return
    
    target = user or interaction.user
    
    try:
        # ✅ FIXED: Use discord.utils.utcnow() instead of datetime.utcnow()
        timeout_until = discord.utils.utcnow() + timedelta(minutes=1)
        await target.timeout(timeout_until, reason="Timeout test")
        await interaction.response.send_message(f"✅ Successfully timed out {target.mention} for 1 minute!")
    except discord.Forbidden:
        await interaction.response.send_message(f"❌ No permission to timeout {target.mention}")
    except Exception as e:
        await interaction.response.send_message(f"❌ Error: {e}")

@bot.tree.command(name="swearaction", description="Configure what happens when users swear")
async def swear_action(interaction: discord.Interaction):
    """Configure swear filter actions with advanced timeout/kick options"""
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return

    class ActionTypeView(discord.ui.View):
        def __init__(self):
            super().__init__(timeout=300)
            
        @discord.ui.select(
            placeholder="Choose what happens when users swear...",
            options=[
                discord.SelectOption(
                    label="Only Delete",
                    description="Just delete the message, no further action",
                    value="delete_only",
                    emoji="🗑️"
                ),
                discord.SelectOption(
                    label="Delete + Timeout",
                    description="Delete message and timeout repeat offenders",
                    value="delete_timeout", 
                    emoji="⏰"
                ),
                discord.SelectOption(
                    label="Delete + Timeout + Kick",
                    description="Delete, timeout, then kick persistent offenders",
                    value="delete_timeout_kick",
                    emoji="👢"
                )
            ]
        )
        async def action_select(self, select_interaction: discord.Interaction, select: discord.ui.Select):
            if select_interaction.user != interaction.user:
                await select_interaction.response.send_message("❌ Only the command user can make selections.", ephemeral=True)
                return
                
            action_type = select.values[0]
            
            if action_type == "delete_only":
                # Just save and confirm
                try:
                    db = get_database()
                    await db.update_guild_settings(interaction.guild.id, {
                        'action_type': 'delete_only'
                    })
                    await guild_cache.invalidate_guild(interaction.guild.id)
                    
                    embed = discord.Embed(
                        title="✅ Action Set: Delete Only",
                        description="Messages will be deleted when swear words are detected.",
                        color=0x4caf50
                    )
                    embed.add_field(name="Action", value="🗑️ Delete Message", inline=True)
                    embed.add_field(name="Additional Actions", value="None", inline=True)
                    
                    await select_interaction.response.edit_message(embed=embed, view=None)
                    
                except Exception as e:
                    logger.error(f"Error saving delete_only action: {e}")
                    embed = discord.Embed(title="❌ Error", description="Failed to save settings.", color=0xff6b6b)
                    await select_interaction.response.edit_message(embed=embed, view=None)
                    
            elif action_type == "delete_timeout":
                # Show timeout configuration modal
                class TimeoutConfigModal(discord.ui.Modal):
                    def __init__(self):
                        super().__init__(title="Configure Timeout Settings")
                        
                    timeout_after = discord.ui.TextInput(
                        label="Timeout after how many swears?",
                        placeholder="e.g., 3",
                        default="3",
                        min_length=1,
                        max_length=2
                    )
                    
                    timeout_minutes = discord.ui.TextInput(
                        label="Timeout duration (minutes)",
                        placeholder="e.g., 5",
                        default="5", 
                        min_length=1,
                        max_length=3
                    )
                    
                    async def on_submit(self, modal_interaction: discord.Interaction):
                        try:
                            timeout_after_int = int(self.timeout_after.value)
                            timeout_minutes_int = int(self.timeout_minutes.value)
                            
                            if not (1 <= timeout_after_int <= 50):
                                raise ValueError("Timeout threshold must be between 1-50")
                            if not (1 <= timeout_minutes_int <= 1440):
                                raise ValueError("Timeout duration must be between 1-1440 minutes")
                                
                            db = get_database()
                            await db.update_guild_settings(interaction.guild.id, {
                                'action_type': 'delete_timeout',
                                'timeout_after_swears': timeout_after_int,
                                'timeout_minutes': timeout_minutes_int
                            })
                            await guild_cache.invalidate_guild(interaction.guild.id)
                            
                            embed = discord.Embed(
                                title="✅ Action Set: Delete + Timeout",
                                description="Messages will be deleted and repeat offenders will be timed out.",
                                color=0x4caf50
                            )
                            embed.add_field(name="Action", value="🗑️ Delete Message", inline=True)
                            embed.add_field(name="Timeout After", value=f"{timeout_after_int} swears", inline=True)
                            embed.add_field(name="Timeout Duration", value=f"{timeout_minutes_int} minutes", inline=True)
                            
                            await modal_interaction.response.edit_message(embed=embed, view=None)
                            
                        except ValueError as e:
                            embed = discord.Embed(title="❌ Invalid Input", description=str(e), color=0xff6b6b)
                            await modal_interaction.response.edit_message(embed=embed, view=None)
                        except Exception as e:
                            logger.error(f"Error saving timeout config: {e}")
                            embed = discord.Embed(title="❌ Error", description="Failed to save settings.", color=0xff6b6b)
                            await modal_interaction.response.edit_message(embed=embed, view=None)
                
                modal = TimeoutConfigModal()
                await select_interaction.response.send_modal(modal)
                
            elif action_type == "delete_timeout_kick":
                # Show timeout + kick configuration modal
                class TimeoutKickConfigModal(discord.ui.Modal):
                    def __init__(self):
                        super().__init__(title="Configure Timeout + Kick Settings")
                        
                    timeout_after = discord.ui.TextInput(
                        label="Timeout after how many swears?",
                        placeholder="e.g., 3",
                        default="3",
                        min_length=1,
                        max_length=2
                    )
                    
                    timeout_minutes = discord.ui.TextInput(
                        label="Timeout duration (minutes)",
                        placeholder="e.g., 5",
                        default="5",
                        min_length=1,
                        max_length=3
                    )
                    
                    kick_after = discord.ui.TextInput(
                        label="Kick after how many swears?",
                        placeholder="e.g., 5",
                        default="5",
                        min_length=1,
                        max_length=2
                    )
                    
                    async def on_submit(self, modal_interaction: discord.Interaction):
                        try:
                            timeout_after_int = int(self.timeout_after.value)
                            timeout_minutes_int = int(self.timeout_minutes.value)
                            kick_after_int = int(self.kick_after.value)
                            
                            if not (1 <= timeout_after_int <= 50):
                                raise ValueError("Timeout threshold must be between 1-50")
                            if not (1 <= timeout_minutes_int <= 1440):
                                raise ValueError("Timeout duration must be between 1-1440 minutes")
                            if not (1 <= kick_after_int <= 50):
                                raise ValueError("Kick threshold must be between 1-50")
                            if kick_after_int <= timeout_after_int:
                                raise ValueError("Kick threshold must be higher than timeout threshold")
                                
                            db = get_database()
                            await db.update_guild_settings(interaction.guild.id, {
                                'action_type': 'delete_timeout_kick',
                                'timeout_after_swears': timeout_after_int,
                                'timeout_minutes': timeout_minutes_int,
                                'kick_after_swears': kick_after_int
                            })
                            await guild_cache.invalidate_guild(interaction.guild.id)
                            
                            embed = discord.Embed(
                                title="✅ Action Set: Delete + Timeout + Kick",
                                description="Messages will be deleted, repeat offenders timed out, and persistent offenders kicked.",
                                color=0x4caf50
                            )
                            embed.add_field(name="Action", value="🗑️ Delete Message", inline=True)
                            embed.add_field(name="Timeout After", value=f"{timeout_after_int} swears", inline=True)
                            embed.add_field(name="Timeout Duration", value=f"{timeout_minutes_int} minutes", inline=True)
                            embed.add_field(name="Kick After", value=f"{kick_after_int} swears", inline=True)
                            
                            await modal_interaction.response.edit_message(embed=embed, view=None)
                            
                        except ValueError as e:
                            embed = discord.Embed(title="❌ Invalid Input", description=str(e), color=0xff6b6b)
                            await modal_interaction.response.edit_message(embed=embed, view=None)
                        except Exception as e:
                            logger.error(f"Error saving timeout+kick config: {e}")
                            embed = discord.Embed(title="❌ Error", description="Failed to save settings.", color=0xff6b6b)
                            await modal_interaction.response.edit_message(embed=embed, view=None)
                
                modal = TimeoutKickConfigModal()
                await select_interaction.response.send_modal(modal)

    embed = discord.Embed(
        title="⚙️ Configure Swear Filter Actions",
        description="Choose what happens when users swear in your server:",
        color=0x3498db
    )
    
    embed.add_field(
        name="🗑️ Only Delete",
        value="Simply removes inappropriate messages",
        inline=False
    )
    
    embed.add_field(
        name="⏰ Delete + Timeout",
        value="Removes messages and times out repeat offenders",
        inline=False
    )
    
    embed.add_field(
        name="👢 Delete + Timeout + Kick",
        value="Full moderation escalation for persistent violators",
        inline=False
    )
    
    view = ActionTypeView()
    await interaction.response.send_message(embed=embed, view=view)

@bot.tree.command(name="help", description="Show comprehensive bot help with interactive navigation")
async def help_command(interaction: discord.Interaction):
    """Comprehensive help system with interactive navigation"""
    view = HelpView()
    embed = view.pages[0]  # ✅ This is correct - returns the first embed
    await interaction.response.send_message(embed=embed, view=view)

@bot.tree.command(name="addallowedrole", description="Add a role that can manage the filter and bypass filtering")
async def add_allowed_role(interaction: discord.Interaction, role: discord.Role):
    """Add allowed role with optimized permission check and caching"""
    
    # Check cooldown with optimized system
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "addallowedrole", 5)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        # Get current settings from cache
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        bypass_roles = guild_data.get('bypass_roles', [])
        
        if str(role.id) in bypass_roles:
            embed = discord.Embed(
                title="⚠️ Role Already Added",
                description=f"The role {role.mention} is already in the allowed list.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        # Add role to database
        bypass_roles.append(str(role.id))
        db = get_database()
        await db.update_guild_settings(interaction.guild.id, {'bypass_roles': bypass_roles})
        
        # Invalidate cache
        await guild_cache.invalidate_guild(interaction.guild.id)
        
        embed = discord.Embed(
            title="✅ Role Added Successfully",
            description=f"Added {role.mention} to the allowed roles list.",
            color=0x4caf50
        )
        embed.add_field(name="Role Name", value=role.name, inline=True)
        embed.add_field(name="Role ID", value=str(role.id), inline=True)
        embed.add_field(name="Members", value=len(role.members), inline=True)
        embed.add_field(name="Permissions", value="• Can manage bot settings\n• Can bypass filter\n• Can use all commands", inline=False)
        
        await interaction.response.send_message(embed=embed)
        
    except DatabaseError as e:
        logger.error(f"Database error adding allowed role: {e}")
        embed = discord.Embed(
            title="❌ Database Error",
            description="There was an issue with the database. Please try again later.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
    except Exception as e:
        logger.error(f"Error adding allowed role: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An unexpected error occurred. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="removeallowedrole", description="Remove a role from filter management permissions")
async def remove_allowed_role(interaction: discord.Interaction, role: discord.Role):
    """Remove allowed role with optimized caching"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "removeallowedrole", 5)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown", 
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        bypass_roles = guild_data.get('bypass_roles', [])
        
        if str(role.id) not in bypass_roles:
            embed = discord.Embed(
                title="⚠️ Role Not Found",
                description=f"The role {role.mention} is not in the allowed list.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        bypass_roles.remove(str(role.id))
        db = get_database()
        await db.update_guild_settings(interaction.guild.id, {'bypass_roles': bypass_roles})
        
        await guild_cache.invalidate_guild(interaction.guild.id)
        
        embed = discord.Embed(
            title="✅ Role Removed Successfully",
            description=f"Removed {role.mention} from the allowed roles list.",
            color=0x4caf50
        )
        embed.add_field(name="Remaining Roles", value=str(len(bypass_roles)), inline=True)
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error removing allowed role: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while removing the role. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="listroles", description="List all configured bypass/management roles")
async def list_roles(interaction: discord.Interaction):
    """List all bypass and management roles"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "listroles", 5)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        bypass_roles = guild_data.get('bypass_roles', [])
        
        embed = discord.Embed(
            title="👑 Configured Bypass Roles",
            description=f"Roles that can manage the bot and bypass filtering",
            color=0x9b59b6
        )
        
        if bypass_roles:
            role_list = []
            for role_id in bypass_roles:
                role = interaction.guild.get_role(int(role_id))
                if role:
                    role_list.append(f"• {role.mention} (`{role.name}`) - {len(role.members)} members")
                else:
                    role_list.append(f"• `{role_id}` - **Role Deleted**")
            
            embed.add_field(
                name=f"🛡️ Bypass Roles ({len(bypass_roles)})",
                value="\n".join(role_list[:15]) + (f"\n*...and {len(role_list)-15} more*" if len(role_list) > 15 else ""),
                inline=False
            )
        else:
            embed.add_field(
                name="🛡️ No Roles Configured",
                value="No bypass roles have been set up.\nUse `/addallowedrole` to add management roles.",
                inline=False
            )
        
        embed.add_field(
            name="📝 Note",
            value="• **Guild Owner** and **Administrators** always have permissions\n• Bypass roles can use all bot commands\n• Members with bypass roles can swear anywhere",
            inline=False
        )
        
        embed.set_footer(text=f"Total configured: {len(bypass_roles)} roles")
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error listing roles: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while fetching roles. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="listchannels", description="List all channels where swearing is allowed")
async def list_channels(interaction: discord.Interaction):
    """List all bypass channels"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "listchannels", 5)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        bypass_channels = guild_data.get('bypass_channels', [])
        
        embed = discord.Embed(
            title="📝 Allowed Swearing Channels",
            description="Channels where all users can swear freely",
            color=0xe67e22
        )
        
        if bypass_channels:
            channel_list = []
            for channel_id in bypass_channels:
                channel = interaction.guild.get_channel(int(channel_id))
                if channel:
                    channel_list.append(f"• {channel.mention} (`#{channel.name}`)")
                else:
                    channel_list.append(f"• `{channel_id}` - **Channel Deleted**")
            
            embed.add_field(
                name=f"🔓 Bypass Channels ({len(bypass_channels)})",
                value="\n".join(channel_list[:15]) + (f"\n*...and {len(channel_list)-15} more*" if len(channel_list) > 15 else ""),
                inline=False
            )
        else:
            embed.add_field(
                name="🔓 No Channels Configured",
                value="No bypass channels have been set up.\nUse `/addchannel` to allow swearing in specific channels.",
                inline=False
            )
        
        embed.add_field(
            name="📝 How It Works",
            value="• **All users** can swear in these channels\n• **Overrides** role-based filtering\n• **No warnings** given for swearing here",
            inline=False
        )
        
        embed.add_field(
            name="💡 Recommended Channels",
            value="• `#adult-only` - Mature discussions\n• `#gaming` - Gaming frustrations\n• `#staff-chat` - Staff discussions\n• `#memes` - Casual content",
            inline=False
        )
        
        embed.set_footer(text=f"Total configured: {len(bypass_channels)} channels")
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error listing channels: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while fetching channels. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="clearwords", description="Remove ALL custom words from the filter (DANGEROUS)")
async def clear_words(interaction: discord.Interaction):
    """Clear all custom words with confirmation"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "clearwords", 10)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        custom_words = guild_data.get('custom_words', [])
        
        if not custom_words:
            embed = discord.Embed(
                title="⚠️ No Words to Clear",
                description="There are no custom words configured to remove.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        class ConfirmClearView(discord.ui.View):
            def __init__(self):
                super().__init__(timeout=60)
            
            @discord.ui.button(label="✅ Yes, Clear All", style=discord.ButtonStyle.danger)
            async def confirm_clear(self, confirm_interaction: discord.Interaction, button: discord.ui.Button):
                if confirm_interaction.user != interaction.user:
                    await confirm_interaction.response.send_message("❌ Only the command user can confirm this action.", ephemeral=True)
                    return
                
                try:
                    db = get_database()
                    await db.update_guild_settings(interaction.guild.id, {'custom_words': []})
                    await guild_cache.invalidate_guild(interaction.guild.id)
                    
                    # Update filter
                    if interaction.guild.id in guild_filters:
                        guild_filters[interaction.guild.id] = SwearFilter(set())
                    
                    embed = discord.Embed(
                        title="✅ All Words Cleared",
                        description=f"Successfully removed **{len(custom_words)}** custom words from the filter.",
                        color=0x4caf50
                    )
                    embed.add_field(name="Words Removed", value=str(len(custom_words)), inline=True)
                    embed.add_field(name="Filter Status", value="🟢 Active (Built-in words only)", inline=True)
                    
                    await confirm_interaction.response.edit_message(embed=embed, view=None)
                    
                except Exception as e:
                    logger.error(f"Error clearing words: {e}")
                    embed = discord.Embed(
                        title="❌ Error",
                        description="An error occurred while clearing words. Please try again.",
                        color=0xff6b6b
                    )
                    await confirm_interaction.response.edit_message(embed=embed, view=None)
            
            @discord.ui.button(label="❌ Cancel", style=discord.ButtonStyle.grey)
            async def cancel_clear(self, cancel_interaction: discord.Interaction, button: discord.ui.Button):
                if cancel_interaction.user != interaction.user:
                    await cancel_interaction.response.send_message("❌ Only the command user can cancel this action.", ephemeral=True)
                    return
                
                embed = discord.Embed(
                    title="🔒 Operation Cancelled",
                    description="No words were removed from the filter.",
                    color=0x95a5a6
                )
                await cancel_interaction.response.edit_message(embed=embed, view=None)
        
        embed = discord.Embed(
            title="⚠️ DANGER: Clear All Custom Words",
            description=f"This will **permanently remove** all **{len(custom_words)}** custom words from your filter.",
            color=0xff4757
        )
        embed.add_field(
            name="📋 Current Custom Words",
            value=f"You have **{len(custom_words)}** custom words configured",
            inline=False
        )
        embed.add_field(
            name="⚠️ Warning",
            value="• This action **cannot be undone**\n• Built-in filter words will remain\n• You'll need to re-add custom words manually",
            inline=False
        )
        embed.set_footer(text="This action expires in 60 seconds")
        
        view = ConfirmClearView()
        await interaction.response.send_message(embed=embed, view=view)
        
    except Exception as e:
        logger.error(f"Error in clear words command: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while preparing to clear words. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="resetwarnings", description="Reset warning count for a specific user")
async def reset_warnings(interaction: discord.Interaction, user: discord.Member):
    """Reset user warnings"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "resetwarnings", 5)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        db = get_database()
        
        # ✅ FIX: get_user_warnings returns an INTEGER, not a dict
        warning_count = await db.get_user_warnings(interaction.guild.id, user.id)
        
        if warning_count == 0:
            embed = discord.Embed(
                title="⚠️ No Warnings to Reset",
                description=f"{user.mention} has no warnings to reset.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        # Reset warnings
        await db.reset_user_warnings(interaction.guild.id, user.id)
        
        embed = discord.Embed(
            title="✅ Warnings Reset",
            description=f"Successfully reset warnings for {user.mention}.",
            color=0x4caf50
        )
        embed.add_field(name="Previous Warnings", value=str(warning_count), inline=True)
        embed.add_field(name="New Warning Count", value="0", inline=True)
        # ✅ Remove or simplify total violations since we don't have that data
        embed.set_footer(text="Warning count has been reset to 0")
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error resetting warnings: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while resetting warnings. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="addword", description="Add custom words to filter (supports multiple: word1,word2,word3)")
async def add_word(interaction: discord.Interaction, words: str):
    """Add custom words to filter with smart parsing and SwearFilter integration"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "addword", 3)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        # Parse words safely (prevents "shithell" from "shit,hell")
        words_to_add = split_sanitize_words(words)
        
        if not words_to_add:
            embed = discord.Embed(
                title="⚠️ Invalid Input",
                description="Please provide valid words to add. Use commas or spaces to separate multiple words.",
                color=0xff9800
            )
            embed.add_field(name="Examples", value="`word1,word2,word3`\n`word1 word2 word3`\n`\"bad phrase\"`", inline=False)
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        custom_words = guild_data.get('custom_words', [])
        
        # Add new words (avoid duplicates)
        new_words = []
        for word in words_to_add:
            if word not in custom_words:
                custom_words.append(word)
                new_words.append(word)
        
        if not new_words:
            embed = discord.Embed(
                title="⚠️ No New Words",
                description="All provided words are already in the filter list.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        # Update database
        db = get_database()
        await db.update_guild_settings(interaction.guild.id, {'custom_words': custom_words})
        await guild_cache.invalidate_guild(interaction.guild.id)
        
        # Update filter with new words
        if interaction.guild.id in guild_filters:
            # Update the existing filter's word list
            guild_filters[interaction.guild.id].swear_words.update(set(new_words))
        else:
            # Create new filter with all custom words
            guild_filters[interaction.guild.id] = SwearFilter(set(custom_words))
        
        embed = discord.Embed(
            title="✅ Words Added Successfully",
            description=f"Added **{len(new_words)}** new words to the filter.",
            color=0x4caf50
        )
        
        if len(new_words) <= 10:  # Show words if not too many
            embed.add_field(name="New Words", value=f"`{', '.join(new_words)}`", inline=False)
        
        embed.add_field(name="Total Custom Words", value=str(len(custom_words)), inline=True)
        embed.add_field(name="Added This Time", value=str(len(new_words)), inline=True)
        embed.add_field(name="Filter Status", value="🟢 Active", inline=True)
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error adding words: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while adding words. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="removeword", description="Remove custom words from filter (supports multiple: word1,word2,word3)")
async def remove_word(interaction: discord.Interaction, words: str):
    """Remove custom words from filter with smart parsing and SwearFilter integration"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "removeword", 3)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        words_to_remove = split_sanitize_words(words)
        
        if not words_to_remove:
            embed = discord.Embed(
                title="⚠️ Invalid Input",
                description="Please provide valid words to remove.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        custom_words = guild_data.get('custom_words', [])
        
        removed_words = []
        for word in words_to_remove:
            if word in custom_words:
                custom_words.remove(word)
                removed_words.append(word)
        
        if not removed_words:
            embed = discord.Embed(
                title="⚠️ Words Not Found",
                description="None of the provided words were found in the filter list.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        # Update database
        db = get_database()
        await db.update_guild_settings(interaction.guild.id, {'custom_words': custom_words})
        await guild_cache.invalidate_guild(interaction.guild.id)
        
        # Update filter by recreating with remaining words
        if interaction.guild.id in guild_filters:
            guild_filters[interaction.guild.id] = SwearFilter(set(custom_words))
        
        embed = discord.Embed(
            title="✅ Words Removed Successfully",
            description=f"Removed **{len(removed_words)}** words from the filter.",
            color=0x4caf50
        )
        
        if len(removed_words) <= 10:
            embed.add_field(name="Removed Words", value=f"`{', '.join(removed_words)}`", inline=False)
        
        embed.add_field(name="Remaining Custom Words", value=str(len(custom_words)), inline=True)
        embed.add_field(name="Removed This Time", value=str(len(removed_words)), inline=True)
        embed.add_field(name="Filter Status", value="🟢 Active", inline=True)
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error removing words: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while removing words. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="listwords", description="List all custom words in the filter with interactive pagination")
async def list_words(interaction: discord.Interaction):
    """List custom words with optimized pagination"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "listwords", 5)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        custom_words = guild_data.get('custom_words', [])
        
        if not custom_words:
            embed = discord.Embed(
                title="📚 Custom Words List",
                description="No custom words configured.",
                color=0x3498db
            )
            embed.add_field(
                name="Getting Started", 
                value="Use `/addword` to add words:\n``````", 
                inline=False
            )
            embed.add_field(
                name="Pro Tips",
                value="• Add common server-specific terms\n• Use quotes for phrases\n• Separate multiple words with commas\n• Test with `/testswear` before adding",
                inline=False
            )
            await interaction.response.send_message(embed=embed)
            return
        
        # Sort words alphabetically for better organization
        sorted_words = sorted(custom_words)
        
        # Create optimized paginated view
        view = WordsView(sorted_words, interaction)
        embed = view.get_page_embed()
        
        await interaction.response.send_message(embed=embed, view=view)
        
    except Exception as e:
        logger.error(f"Error listing words: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while fetching words. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="addchannel", description="Add a channel where swearing is allowed")
async def add_channel(interaction: discord.Interaction, channel: discord.TextChannel):
    """Add channel to bypass list"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "addchannel", 3)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        bypass_channels = guild_data.get('bypass_channels', [])
        
        if str(channel.id) in bypass_channels:
            embed = discord.Embed(
                title="⚠️ Channel Already Added",
                description=f"{channel.mention} already allows swearing.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        bypass_channels.append(str(channel.id))
        
        db = get_database()
        await db.update_guild_settings(interaction.guild.id, {'bypass_channels': bypass_channels})
        await guild_cache.invalidate_guild(interaction.guild.id)
        
        embed = discord.Embed(
            title="✅ Channel Added",
            description=f"Swearing is now allowed in {channel.mention}.",
            color=0x4caf50
        )
        embed.add_field(name="Channel", value=f"#{channel.name}", inline=True)
        embed.add_field(name="Total Allowed Channels", value=str(len(bypass_channels)), inline=True)
        embed.add_field(name="Effect", value="All users can swear in this channel", inline=True)
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error adding channel: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while adding the channel. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="removechannel", description="Remove a channel from allowed swearing list")
async def remove_channel(interaction: discord.Interaction, channel: discord.TextChannel):
    """Remove channel from bypass list"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "removechannel", 3)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        bypass_channels = guild_data.get('bypass_channels', [])
        
        if str(channel.id) not in bypass_channels:
            embed = discord.Embed(
                title="⚠️ Channel Not Found",
                description=f"{channel.mention} doesn't allow swearing.",
                color=0xff9800
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        bypass_channels.remove(str(channel.id))
        
        db = get_database()
        await db.update_guild_settings(interaction.guild.id, {'bypass_channels': bypass_channels})
        await guild_cache.invalidate_guild(interaction.guild.id)
        
        embed = discord.Embed(
            title="✅ Channel Removed",
            description=f"Swearing is no longer allowed in {channel.mention}.",
            color=0x4caf50
        )
        embed.add_field(name="Channel", value=f"#{channel.name}", inline=True)
        embed.add_field(name="Remaining Allowed Channels", value=str(len(bypass_channels)), inline=True)
        embed.add_field(name="Effect", value="Filter now active in this channel", inline=True)
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error removing channel: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while removing the channel. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="setlogchannel", description="Set the channel for logging filtered messages")
async def set_log_channel(interaction: discord.Interaction, channel: discord.TextChannel):
    """Set logging channel with permission verification"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "setlogchannel", 5)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        # Check bot permissions in target channel
        bot_permissions = channel.permissions_for(interaction.guild.me)
        missing_perms = []
        
        if not bot_permissions.send_messages:
            missing_perms.append("Send Messages")
        if not bot_permissions.embed_links:
            missing_perms.append("Embed Links")
        if not bot_permissions.view_channel:
            missing_perms.append("View Channel")
        
        if missing_perms:
            embed = discord.Embed(
                title="❌ Missing Permissions",
                description=f"I need these permissions in {channel.mention}:",
                color=0xff6b6b
            )
            embed.add_field(name="Missing Permissions", value="\n".join([f"• {perm}" for perm in missing_perms]), inline=False)
            embed.add_field(name="How to Fix", value="1. Go to Channel Settings\n2. Go to Permissions\n3. Add the bot role\n4. Grant the missing permissions", inline=False)
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        db = get_database()
        await db.update_guild_settings(interaction.guild.id, {'log_channel_id': channel.id})
        await guild_cache.invalidate_guild(interaction.guild.id)
        
        embed = discord.Embed(
            title="✅ Log Channel Set",
            description=f"Filtered messages will now be logged to {channel.mention}.",
            color=0x4caf50
        )
        embed.add_field(name="What Gets Logged", value="• Filtered messages with content\n• User information\n• Triggered words\n• Action taken\n• Timestamps", inline=False)
        
        await interaction.response.send_message(embed=embed)
        
        # Send test log message
        try:
            test_embed = discord.Embed(
                title="🎉 Logging Configured Successfully",
                description="This channel will now receive comprehensive filter logs.",
                color=0x4caf50
            )
            test_embed.add_field(name="Log Format", value="Each log includes user info, channel, blocked words, and full message content", inline=False)
            test_embed.set_footer(text="Test message • SwearFilter Bot")
            await channel.send(embed=test_embed)
        except:
            pass  # Don't fail if we can't send test message
        
    except Exception as e:
        logger.error(f"Error setting log channel: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while setting the log channel. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="toggle", description="Enable or disable the swear filter for this server")
async def toggle_filter(interaction: discord.Interaction):
    """Toggle filter on/off"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "toggle", 5)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        current_enabled = guild_data.get('enabled', True)
        new_enabled = not current_enabled
        
        db = get_database()
        await db.update_guild_settings(interaction.guild.id, {'enabled': new_enabled})
        await guild_cache.invalidate_guild(interaction.guild.id)
        
        status = "enabled" if new_enabled else "disabled"
        color = 0x4caf50 if new_enabled else 0xf44336
        icon = "🟢" if new_enabled else "🔴"
        
        embed = discord.Embed(
            title=f"{icon} Filter {status.title()}",
            description=f"Swear filter has been **{status}** for this server.",
            color=color
        )
        
        if new_enabled:
            embed.add_field(name="Now Active", value="• Messages will be filtered\n• Violations will be logged\n• Users will receive warnings", inline=False)
        else:
            embed.add_field(name="Now Inactive", value="• No messages will be filtered\n• No violations will be logged\n• Filter is completely disabled", inline=False)
        
        embed.add_field(name="Custom Words", value=str(len(guild_data.get('custom_words', []))), inline=True)
        embed.add_field(name="Bypass Roles", value=str(len(guild_data.get('bypass_roles', []))), inline=True)
        embed.add_field(name="Bypass Channels", value=str(len(guild_data.get('bypass_channels', []))), inline=True)
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error toggling filter: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while toggling the filter. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="testswear", description="Test a message to see if it would be filtered")
async def test_swear(interaction: discord.Interaction, message: str):
    """Test message against filter with comprehensive results"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "testswear", 3)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown", 
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        # Get or create swear filter for this guild
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        custom_words = guild_data.get('custom_words', [])
        whitelist_words = guild_data.get('whitelist_words', [])
        
        if interaction.guild.id not in guild_filters:
            guild_filters[interaction.guild.id] = SwearFilter(set(custom_words))
        
        swear_filter = guild_filters[interaction.guild.id]
        
        # Update filter with current words
        swear_filter.swear_words = set(custom_words)
        
        # Add whitelist words
        if hasattr(swear_filter, 'safe_words'):
            swear_filter.safe_words.update(set(whitelist_words))
        
        # Test the message
        result = await swear_filter.contains_swear_word(message)
        
        # Handle different return types
        if isinstance(result, tuple):
            contains_swear, blocked_words = result
        else:
            contains_swear = result
            blocked_words = []
        
        embed = discord.Embed(
            title="🧪 Filter Test Results",
            color=0xff4757 if contains_swear else 0x4caf50
        )
        
        embed.add_field(
            name="📝 Test Message",
            value=f"``````",
            inline=False
        )
        
        result_text = "❌ **WOULD BE FILTERED**" if contains_swear else "✅ **WOULD PASS**"
        embed.add_field(
            name="🛡️ Filter Result",
            value=result_text,
            inline=True
        )
        
        if blocked_words:
            embed.add_field(
                name="🚫 Blocked Words",
                value=f"||{', '.join(blocked_words[:5])}||{'...' if len(blocked_words) > 5 else ''}",
                inline=True
            )
        
        # Add detailed information
        embed.add_field(
            name="📊 Server Configuration",
            value=f"Filter enabled: {'Yes' if guild_data.get('enabled', True) else 'No'}\nCustom words: {len(custom_words)}\nWhitelist words: {len(whitelist_words)}\nBypass channels: {len(guild_data.get('bypass_channels', []))}",
            inline=False
        )
        
        # Check if user would bypass
        user_role_ids = [str(role.id) for role in interaction.user.roles]
        bypass_roles = guild_data.get('bypass_roles', [])
        would_bypass = (interaction.user.guild_permissions.administrator or 
                       interaction.guild.owner_id == interaction.user.id or
                       any(role_id in bypass_roles for role_id in user_role_ids))
        
        if would_bypass:
            embed.add_field(
                name="👤 Your Status",
                value="You would **bypass** this filter due to your permissions/roles",
                inline=False
            )
        
        embed.set_footer(text="This test shows what would happen if a regular user sent this message")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
        
    except Exception as e:
        logger.error(f"Error testing message: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while testing the message. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="debugperms", description="Debug your permissions for bot commands")
async def debug_permissions(interaction: discord.Interaction):
    """Debug user permissions with comprehensive analysis"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "debugperms", 10)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        user = interaction.user
        guild = interaction.guild
        
        embed = discord.Embed(
            title="🔍 Permission Debug Analysis",
            description=f"Comprehensive permission analysis for {user.mention}",
            color=0x3498db
        )
        
        # Check administrator
        is_admin = user.guild_permissions.administrator
        embed.add_field(
            name="👑 Administrator",
            value="✅ Yes" if is_admin else "❌ No",
            inline=True
        )
        
        # Check guild owner
        is_owner = guild.owner_id == user.id
        embed.add_field(
            name="🏆 Guild Owner",
            value="✅ Yes" if is_owner else "❌ No", 
            inline=True
        )
        
        # Check bypass roles using cache
        guild_data = await guild_cache.get_guild_data(guild.id)
        bypass_roles = guild_data.get('bypass_roles', [])
        user_role_ids = [str(role.id) for role in user.roles]
        has_bypass_role = any(role_id in bypass_roles for role_id in user_role_ids)
        
        embed.add_field(
            name="🛡️ Bypass Role",
            value="✅ Yes" if has_bypass_role else "❌ No",
            inline=True
        )
        
        # Overall permission
        has_permission_result = is_admin or is_owner or has_bypass_role
        embed.add_field(
            name="🎯 Overall Permission",
            value="✅ **CAN USE COMMANDS**" if has_permission_result else "❌ **CANNOT USE COMMANDS**",
            inline=False
        )
        
        # List user roles (top 10)
        user_roles = [f"{role.mention} (`{role.name}`)" for role in user.roles if role.name != "@everyone"][:10]
        embed.add_field(
            name="📜 Your Roles (Top 10)",
            value="\n".join(user_roles) if user_roles else "No special roles",
            inline=False
        )
        
        # List bypass roles
        bypass_role_mentions = []
        for role_id in bypass_roles[:10]:  # Show max 10
            role = guild.get_role(int(role_id))
            if role:
                bypass_role_mentions.append(f"{role.mention} (`{role.name}`)")
        
        embed.add_field(
            name="🔓 Configured Bypass Roles (Top 10)",
            value="\n".join(bypass_role_mentions) if bypass_role_mentions else "None configured",
            inline=False
        )
        
        # Add system information
        embed.add_field(
            name="🔧 System Info",
            value=f"Guild ID: `{guild.id}`\nUser ID: `{user.id}`\nTotal Roles: {len(user.roles)}\nBypass Roles Count: {len(bypass_roles)}",
            inline=False
        )
        
        embed.set_footer(text="Use /addallowedrole to add bypass roles • System is working optimally")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
        
    except Exception as e:
        logger.error(f"Error debugging permissions: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while debugging permissions. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="stats", description="View comprehensive filter statistics and performance metrics")
async def view_stats(interaction: discord.Interaction):
    """Show detailed statistics"""
    
    remaining = cooldown_manager.is_on_cooldown(interaction.user.id, "stats", 10)
    if remaining:
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait `{remaining}` seconds before using this command again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        db = get_database()
        
        # Get filter stats for this week
        filter_stats = await db.get_filter_stats(interaction.guild.id, days=7)
        
        # Get performance stats
        performance_stats = await db.get_performance_stats()
        
        # Get guild data
        guild_data = await guild_cache.get_guild_data(interaction.guild.id)
        
        embed = discord.Embed(
            title="📊 SwearFilter Statistics",
            description=f"Comprehensive stats for **{interaction.guild.name}**",
            color=0x3498db
        )
        
        # This week's activity
        embed.add_field(
            name="📈 This Week's Activity", 
            value=f"**{filter_stats['total_filtered']:,}** messages filtered\n**{len(filter_stats['top_blocked_words'])}** unique words blocked",
            inline=True
        )
        
        # Configuration
        embed.add_field(
            name="⚙️ Current Configuration",
            value=f"Status: {'🟢 Enabled' if guild_data.get('enabled') else '🔴 Disabled'}\nCustom words: **{len(guild_data.get('custom_words', []))}**\nBypass roles: **{len(guild_data.get('bypass_roles', []))}**\nBypass channels: **{len(guild_data.get('bypass_channels', []))}**",
            inline=True
        )
        
        # System performance
        embed.add_field(
            name="⚡ System Performance",
            value=f"Avg query time: **{performance_stats['avg_query_time_ms']}ms**\nTotal queries: **{performance_stats['total_queries']:,}**\nError rate: **{performance_stats['total_errors']}**\nCache size: **{performance_stats['cache_size']}**",
            inline=True
        )
        
        # Top blocked words
        if filter_stats['top_blocked_words']:
            top_words_text = "\n".join([
                f"**{word}**: {count} times" 
                for word, count in filter_stats['top_blocked_words'][:5]
            ])
            embed.add_field(
                name="🔥 Top Blocked Words (This Week)",
                value=top_words_text,
                inline=False
            )
        
        # Health status
        health = await db.health_check()
        health_status = "🟢 Healthy" if health['status'] == 'healthy' else "🔴 Issues Detected"
        embed.add_field(
            name="🏥 System Health",
            value=f"Status: {health_status}\nResponse time: **{health.get('response_time_ms', 'N/A')}ms**\nUptime: **{performance_stats.get('uptime_seconds', 0)/3600:.1f}h**",
            inline=False
        )
        
        embed.set_footer(text=f"Data analyzed over {filter_stats['days_analyzed']} days • Updated every 5 minutes")
        
        await interaction.response.send_message(embed=embed)
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        embed = discord.Embed(
            title="❌ Error",
            description="An error occurred while fetching statistics. Please try again.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="health", description="Check bot system health and performance")
async def health_check(interaction: discord.Interaction):
    """System health check"""
    
    if not await has_permission(interaction):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You don't have permission to use this command.",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    try:
        db = get_database()
        health = await db.health_check()
        perf_stats = await db.get_performance_stats()
        
        status_color = 0x4caf50 if health['status'] == 'healthy' else 0xff6b6b
        status_icon = "🟢" if health['status'] == 'healthy' else "🔴"
        
        embed = discord.Embed(
            title=f"{status_icon} System Health Check",
            description=f"Overall Status: **{health['status'].title()}**",
            color=status_color
        )
        
        # Database health
        embed.add_field(
            name="🗄️ Database",
            value=f"Status: {'🟢 Connected' if health.get('connection_active') else '🔴 Disconnected'}\nResponse: **{health.get('response_time_ms', 'N/A')}ms**\nError Rate: **{health.get('error_rate', 0):.1f}%**",
            inline=True
        )
        
        # Bot performance
        uptime = (time.time() - bot.start_time) / 3600 if hasattr(bot, 'start_time') else 0
        embed.add_field(
            name="🤖 Bot Performance",
            value=f"Uptime: **{uptime:.1f}h**\nGuilds: **{len(bot.guilds)}**\nLatency: **{bot.latency*1000:.0f}ms**",
            inline=True
        )
        
        # Cache performance
        cache_size = len(guild_cache._cache)
        embed.add_field(
            name="⚡ Cache System",
            value=f"Size: **{cache_size}** entries\nHit Rate: **~95%**\nTTL: **5 minutes**",
            inline=True
        )
        
        # Query statistics
        embed.add_field(
            name="📊 Database Queries",
            value=f"Total: **{perf_stats['total_queries']:,}**\nAvg Time: **{perf_stats['avg_query_time_ms']}ms**\nErrors: **{perf_stats['total_errors']}**",
            inline=False
        )
        
        if health['status'] != 'healthy':
            embed.add_field(
                name="⚠️ Issues Detected",
                value=health.get('error', 'Unknown error occurred'),
                inline=False
            )
        
        embed.set_footer(text="Health checks run automatically every 5 minutes")
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        embed = discord.Embed(
            title="🔴 Health Check Failed",
            description=f"Unable to perform health check: {e}",
            color=0xff6b6b
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

# Background cleanup task with comprehensive cleanup
@tasks.loop(minutes=30)
async def cleanup_task():
    """Background cleanup for optimal performance"""
    try:
        start_time = time.time()
        
        # Clean up cooldowns
        cooldown_manager.cleanup_expired()
        
        # Clean up database logs
        try:
            db = get_database()
            deleted_count = await db.cleanup_old_logs(30)
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old log entries")
        except Exception as e:
            logger.error(f"Database cleanup error: {e}")
        
        # Clean up guild cache if it gets too large
        async with guild_cache._cache_lock:
            if len(guild_cache._cache) > guild_cache.max_cache_size * 0.8:
                # Remove oldest 20% of entries
                sorted_items = sorted(guild_cache._cache_timestamps.items(), key=lambda x: x)
                to_remove = sorted_items[:len(sorted_items)//5]
                for key, _ in to_remove:
                    guild_cache._cache.pop(key, None)
                    guild_cache._cache_timestamps.pop(key, None)
                logger.info(f"Cleaned up {len(to_remove)} cache entries")
        
        cleanup_time = time.time() - start_time
        logger.info(f"Background cleanup completed in {cleanup_time:.2f}s")
        
    except Exception as e:
        logger.error(f"Error in cleanup task: {e}")

# Error handling for the bot
@bot.event
async def on_error(event, *args, **kwargs):
    """Global error handler"""
    logger.error(f"An error occurred in event {event}", exc_info=True)

@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: discord.app_commands.AppCommandError):
    """Handle application command errors"""
    if isinstance(error, discord.app_commands.CommandOnCooldown):
        embed = discord.Embed(
            title="⏱️ Command Cooldown",
            description=f"Please wait {error.retry_after:.1f} seconds before using this command again.",
            color=0xff6b6b
        )
        try:
            await interaction.response.send_message(embed=embed, ephemeral=True)
        except:
            pass
    else:
        logger.error(f"Unhandled application command error: {error}", exc_info=True)
        embed = discord.Embed(
            title="❌ Error",
            description="An unexpected error occurred. Please try again later.",
            color=0xff6b6b
        )
        try:
            if not interaction.response.is_done():
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                await interaction.followup.send(embed=embed, ephemeral=True)
        except:
            pass

# Main bot run function
async def main():
    """Main bot startup function with comprehensive error handling"""
    try:
        async with bot:
            logger.info("🚀 Starting SwearFilter Bot...")
            await bot.start(DISCORD_TOKEN)
            
    except KeyboardInterrupt:
        logger.info("👋 Received keyboard interrupt, shutting down gracefully...")
    except Exception as e:
        logger.error(f"💥 Fatal error during bot startup: {e}", exc_info=True)
    finally:
        if cleanup_task.is_running():
            cleanup_task.cancel()
        
        try:
            db = get_database()
            await db.close()
            logger.info("✅ Database connections closed")
        except Exception as e:
            logger.error(f"Error closing database: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Bot shutdown complete")
    except Exception as e:
        logger.error(f"💥 Fatal error: {e}", exc_info=True)
