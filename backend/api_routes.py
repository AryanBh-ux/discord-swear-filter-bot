# backend/api_routes.py
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List

from flask import Blueprint, jsonify, request
from discord.ext import commands

from auth import require_auth
from database import get_database, DatabaseError
from shared import guild_filters
from swear_filter_updated import SwearFilter
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────
#  Globals injected from main.py
# ──────────────────────────────────────────────────────────────────
bot_instance: commands.Bot | None = None
guild_cache = None  # will be set to GuildSettingsCache instance

# Try to get the dashboard socket for real-time updates
dashboard_connected = False
sio = None

try:
    from main import sio, dashboard_connected
except ImportError:
    pass  # will be set later

api_bp = Blueprint("api", __name__, url_prefix="/api")


# ──────────────────────────────────────────────────────────────────
#  Helper functions
# ──────────────────────────────────────────────────────────────────
@api_bp.route("/guild/<int:guild_id>/debug-log-channel", methods=["GET"])
@require_auth
async def debug_log_channel(guild_id: int):
    try:
        db = get_database()
        settings = await db.get_guild_settings(guild_id)
        
        bot = _need_bot()
        guild = bot.get_guild(guild_id)
        
        log_channel_id = settings.get("log_channel_id")
        log_channel = None
        
        if log_channel_id:
            log_channel = guild.get_channel(int(log_channel_id)) if guild else None
        
        return jsonify({
            "success": True,
            "log_channel_id": log_channel_id,
            "log_channel_exists": log_channel is not None,
            "log_channel_name": log_channel.name if log_channel else None,
            "bot_can_send": log_channel.permissions_for(guild.me).send_messages if log_channel else False,
            "settings": settings
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

def _need_bot() -> commands.Bot:
    """Return the live discord.Bot injected from main.py or abort."""
    if bot_instance is None:
        raise RuntimeError("Discord bot instance has not been injected.")
    return bot_instance


def _emit_to_dashboard(event: str, data: dict, guild_id: int):
    """Helper to emit Socket.IO events to dashboard if connected."""
    try:
        global sio, dashboard_connected
        if sio and dashboard_connected and hasattr(sio, 'connected') and sio.connected:
            sio.emit(event, data, room=f"guild_{guild_id}")
            logger.info(f"Emitted {event} to dashboard for guild {guild_id}")
    except Exception as e:
        logger.error(f"Failed to emit {event} to dashboard: {e}")


# ──────────────────────────────────────────────────────────────────
#  WORD MANAGEMENT
# ──────────────────────────────────────────────────────────────────
@api_bp.route("/guild/<int:guild_id>/words", methods=["GET"])
@require_auth
async def get_guild_words(guild_id: int):
    """Return custom & whitelist words for a guild."""
    try:
        db = get_database()
        settings = await db.get_guild_settings(guild_id)
        return jsonify(
            success=True,
            custom_words=settings.get("custom_words", []),
            whitelist_words=settings.get("whitelist_words", []),
            total_custom=len(settings.get("custom_words", [])),
            total_whitelist=len(settings.get("whitelist_words", [])),
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Error getting guild words: %s", e)
        return jsonify(success=False, error=str(e)), 500


@api_bp.route("/guild/<int:guild_id>/words", methods=["POST"])
@require_auth
async def add_guild_words(guild_id: int):
    """Add words to the guild's custom or whitelist list."""
    try:
        data = request.get_json(force=True)
        words = data.get("words", [])
        word_type = data.get("type", "custom")  # 'custom' | 'whitelist'

        if not words or not isinstance(words, list):
            return jsonify(success=False, error="Invalid words list"), 400

        clean_words = {str(w).strip().lower() for w in words if len(str(w).strip()) >= 2}
        if not clean_words:
            return jsonify(success=False, error="No valid words provided"), 400

        db = get_database()
        settings = await db.get_guild_settings(guild_id)
        current = settings.get(f"{word_type}_words", [])
        new_words = [w for w in clean_words if w not in current]

        if not new_words:
            return jsonify(success=True, added_words=[], message="No new words"), 200

        current.extend(new_words)
        await db.update_guild_settings(guild_id, {f"{word_type}_words": current})

        # ✅ Live-update bot filter
        if word_type == "custom":
            if guild_id in guild_filters:
                guild_filters[guild_id].swear_words.update(clean_words)
            else:
                guild_filters[guild_id] = SwearFilter(set(current))
        else:
            if guild_id in guild_filters and hasattr(guild_filters[guild_id], "safe_words"):
                guild_filters[guild_id].safe_words.update(clean_words)

        # ✅ Invalidate cache so bot re-reads fresh data
        if guild_cache:
            await guild_cache.invalidate_guild(guild_id)

        # ✅ Emit to dashboard for real-time UI update
        _emit_to_dashboard('words_updated', {
            'guild_id': str(guild_id),
            'action': 'added',
            'words': new_words,
            'word_type': word_type,
            'timestamp': datetime.utcnow().isoformat()
        }, guild_id)

        return jsonify(
            success=True,
            added_words=new_words,
            total_words=len(current),
            message=f"Added {len(new_words)} {word_type} words",
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Error adding guild words: %s", e)
        return jsonify(success=False, error=str(e)), 500


@api_bp.route("/guild/<int:guild_id>/words", methods=["DELETE"])
@require_auth
async def remove_guild_words(guild_id: int):
    """Remove words from custom or whitelist list."""
    try:
        data = request.get_json(force=True)
        words = data.get("words", [])
        word_type = data.get("type", "custom")

        if not words or not isinstance(words, list):
            return jsonify(success=False, error="Invalid words list"), 400

        db = get_database()
        settings = await db.get_guild_settings(guild_id)
        current = settings.get(f"{word_type}_words", [])

        removed = [w for w in words if w in current]
        if not removed:
            return jsonify(success=False, error="None of the words were present"), 400

        current = [w for w in current if w not in removed]
        await db.update_guild_settings(guild_id, {f"{word_type}_words": current})

        # ✅ Live filter update
        if word_type == "custom" and guild_id in guild_filters:
            guild_filters[guild_id] = SwearFilter(set(current))

        # ✅ Invalidate cache
        if guild_cache:
            await guild_cache.invalidate_guild(guild_id)

        # ✅ Emit to dashboard
        _emit_to_dashboard('words_updated', {
            'guild_id': str(guild_id),
            'action': 'removed',
            'words': removed,
            'word_type': word_type,
            'timestamp': datetime.utcnow().isoformat()
        }, guild_id)

        return jsonify(
            success=True,
            removed_words=removed,
            total_words=len(current),
            message=f"Removed {len(removed)} {word_type} words",
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Error removing guild words: %s", e)
        return jsonify(success=False, error=str(e)), 500


# ──────────────────────────────────────────────────────────────────
#  CHANNEL MANAGEMENT
# ──────────────────────────────────────────────────────────────────
@api_bp.route("/guild/<int:guild_id>/channels/available", methods=["GET"])
@require_auth
def get_available_channels(guild_id: int):
    """Return list of text channels in the guild."""
    try:
        bot = _need_bot()
        guild = bot.get_guild(guild_id)
        if guild is None:
            return jsonify(success=False, error="Guild not found"), 404

        channels = [
            {
                "id": str(c.id),
                "name": c.name,
                "type": c.type.value,
                "position": c.position,
                "category": c.category.name if c.category else None,
            }
            for c in guild.text_channels
        ]
        channels.sort(key=lambda c: c["position"])
        return jsonify(success=True, channels=channels)
    except Exception as e:  # noqa: BLE001
        logger.error("Error getting channels: %s", e)
        return jsonify(success=False, error=str(e)), 500


@api_bp.route("/guild/<int:guild_id>/channels", methods=["POST"])
@require_auth
async def add_bypass_channel(guild_id: int):
    """Add a channel to bypass list."""
    try:
        channel_id = request.get_json(force=True).get("channel_id")
        if not channel_id:
            return jsonify(success=False, error="Channel ID required"), 400

        bot = _need_bot()
        guild = bot.get_guild(guild_id)
        channel = guild.get_channel(int(channel_id)) if guild else None
        if channel is None:
            return jsonify(success=False, error="Channel not found"), 404

        db = get_database()
        settings = await db.get_guild_settings(guild_id)
        bypass = settings.get("bypass_channels", [])

        if str(channel_id) in bypass:
            return jsonify(success=False, error="Channel already allowed"), 400

        bypass.append(str(channel_id))
        await db.update_guild_settings(guild_id, {"bypass_channels": bypass})

        # ✅ Invalidate cache
        if guild_cache:
            await guild_cache.invalidate_guild(guild_id)

        # ✅ Emit to dashboard
        _emit_to_dashboard('channels_updated', {
            'guild_id': str(guild_id),
            'action': 'added',
            'channel_id': str(channel_id),
            'channel_name': channel.name,
            'timestamp': datetime.utcnow().isoformat()
        }, guild_id)

        return jsonify(success=True, message="Channel added", total_channels=len(bypass))
    except Exception as e:  # noqa: BLE001
        logger.error("Error adding bypass channel: %s", e)
        return jsonify(success=False, error=str(e)), 500


@api_bp.route("/guild/<int:guild_id>/channels", methods=["DELETE"])
@require_auth
async def remove_bypass_channel(guild_id: int):
    """Remove a channel from bypass list."""
    try:
        channel_id = request.get_json(force=True).get("channel_id")
        if not channel_id:
            return jsonify(success=False, error="Channel ID required"), 400

        db = get_database()
        settings = await db.get_guild_settings(guild_id)
        bypass = settings.get("bypass_channels", [])

        if str(channel_id) not in bypass:
            return jsonify(success=False, error="Channel not in list"), 400

        bypass.remove(str(channel_id))
        await db.update_guild_settings(guild_id, {"bypass_channels": bypass})

        # ✅ Invalidate cache
        if guild_cache:
            await guild_cache.invalidate_guild(guild_id)

        # ✅ Emit to dashboard
        _emit_to_dashboard('channels_updated', {
            'guild_id': str(guild_id),
            'action': 'removed',
            'channel_id': str(channel_id),
            'timestamp': datetime.utcnow().isoformat()
        }, guild_id)

        return jsonify(success=True, message="Channel removed", total_channels=len(bypass))
    except Exception as e:  # noqa: BLE001
        logger.error("Error removing bypass channel: %s", e)
        return jsonify(success=False, error=str(e)), 500


# ──────────────────────────────────────────────────────────────────
#  ROLE MANAGEMENT
# ──────────────────────────────────────────────────────────────────
@api_bp.route("/guild/<int:guild_id>/roles/available", methods=["GET"])
@require_auth
def get_available_roles(guild_id: int):
    """Return list of roles in the guild with accurate member counts."""
    try:
        bot = _need_bot()
        guild = bot.get_guild(guild_id)
        if guild is None:
            return jsonify(success=False, error="Guild not found"), 404

        roles = []
        for role in guild.roles:
            if role.name == "@everyone":
                continue
                
            # Fix: Force member count calculation
            member_count = 0
            for member in guild.members:
                if role in member.roles:
                    member_count += 1
            
            roles.append({
                "id": str(role.id),
                "name": role.name,
                "color": role.color.value,
                "position": role.position,
                "permissions": str(role.permissions.value),
                "memberCount": member_count,  # Fixed member count
            })
        
        roles.sort(key=lambda r: r["position"], reverse=True)
        return jsonify(success=True, roles=roles)
    except Exception as e:
        logger.error("Error getting roles: %s", e)
        return jsonify(success=False, error=str(e)), 500


@api_bp.route("/guild/<int:guild_id>/roles", methods=["POST"])
@require_auth
async def add_bypass_role(guild_id: int):
    """Add a role to bypass list."""
    try:
        role_id = request.get_json(force=True).get("role_id")
        if not role_id:
            return jsonify(success=False, error="Role ID required"), 400

        bot = _need_bot()
        guild = bot.get_guild(guild_id)
        role = guild.get_role(int(role_id)) if guild else None
        if role is None:
            return jsonify(success=False, error="Role not found"), 404

        db = get_database()
        settings = await db.get_guild_settings(guild_id)
        bypass = settings.get("bypass_roles", [])

        if str(role_id) in bypass:
            return jsonify(success=False, error="Role already in list"), 400

        bypass.append(str(role_id))
        await db.update_guild_settings(guild_id, {"bypass_roles": bypass})

        # ✅ Invalidate cache
        if guild_cache:
            await guild_cache.invalidate_guild(guild_id)

        # ✅ Emit to dashboard
        _emit_to_dashboard('roles_updated', {
            'guild_id': str(guild_id),
            'action': 'added',
            'role_id': str(role_id),
            'role_name': role.name,
            'timestamp': datetime.utcnow().isoformat()
        }, guild_id)

        return jsonify(success=True, message="Role added", total_roles=len(bypass))
    except Exception as e:  # noqa: BLE001
        logger.error("Error adding bypass role: %s", e)
        return jsonify(success=False, error=str(e)), 500


@api_bp.route("/guild/<int:guild_id>/roles", methods=["DELETE"])
@require_auth
async def remove_bypass_role(guild_id: int):
    """Remove a role from bypass list."""
    try:
        role_id = request.get_json(force=True).get("role_id")
        if not role_id:
            return jsonify(success=False, error="Role ID required"), 400

        db = get_database()
        settings = await db.get_guild_settings(guild_id)
        bypass = settings.get("bypass_roles", [])

        if str(role_id) not in bypass:
            return jsonify(success=False, error="Role not in list"), 400

        bypass.remove(str(role_id))
        await db.update_guild_settings(guild_id, {"bypass_roles": bypass})

        # ✅ Invalidate cache
        if guild_cache:
            await guild_cache.invalidate_guild(guild_id)

        # ✅ Emit to dashboard
        _emit_to_dashboard('roles_updated', {
            'guild_id': str(guild_id),
            'action': 'removed',
            'role_id': str(role_id),
            'timestamp': datetime.utcnow().isoformat()
        }, guild_id)

        return jsonify(success=True, message="Role removed", total_roles=len(bypass))
    except Exception as e:  # noqa: BLE001
        logger.error("Error removing bypass role: %s", e)
        return jsonify(success=False, error=str(e)), 500


# ──────────────────────────────────────────────────────────────────
#  LOGS, SETTINGS & STATS
# ──────────────────────────────────────────────────────────────────
@api_bp.route("/guild/<int:guild_id>/logs", methods=["GET"])
@require_auth
async def get_guild_logs(guild_id: int):
    """Return recent violation logs with robust error handling"""
    try:
        page = max(request.args.get("page", 1, type=int), 1)
        limit = min(request.args.get("limit", 25, type=int), 100)  # Default to 25, max 100
        offset = (page - 1) * limit

        db = get_database()
        
        # ✅ FIX: Wrap database calls in try/except to prevent streaming errors
        try:
            # Get total count for pagination
            total_result = db._client.table('filter_logs')\
                .select('id', count='exact')\
                .eq('guild_id', guild_id)\
                .execute()
            
            total = total_result.count or 0
        except Exception as db_error:
            logger.error(f"Error getting log count: {db_error}")
            total = 0

        try:
            # Get actual log entries
            logs_result = db._client.table('filter_logs')\
                .select('*')\
                .eq('guild_id', guild_id)\
                .order('timestamp', desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            logs = logs_result.data or []
        except Exception as db_error:
            logger.error(f"Error getting logs: {db_error}")
            logs = []

        # Format logs for the dashboard
        formatted_logs = []
        for log in logs:
            try:
                # Handle both old and new action_taken values
                action_taken = log.get("action_taken", "delete")
                
                # Map new action types to display names
                action_display_map = {
                    'delete_only': 'Delete',
                    'delete_timeout': 'Delete + Timeout', 
                    'delete_timeout_kick': 'Delete + Timeout + Kick',
                    'delete': 'Delete',
                    'timeout': 'Timeout',
                    'kick': 'Kick',
                    'ban': 'Ban'
                }

                formatted_logs.append({
                    "id": log.get("id"),
                    "user_id": str(log.get("user_id", "")),
                    "username": log.get("user_name", "Unknown User"),
                    "user_avatar": log.get("user_avatar"),
                    "channel_name": log.get("channel_name", "Unknown Channel"),
                    "blocked_words": log.get("blocked_words", []),
                    "timestamp": log.get("timestamp"),
                    "action_taken": action_display_map.get(action_taken, action_taken.title())
                })
            except Exception as format_error:
                logger.error(f"Error formatting log entry: {format_error}")
                continue

        # ✅ FIX: Always return a consistent JSON response (never stream)
        return jsonify({
            "success": True,
            "logs": formatted_logs,
            "page": page,
            "limit": limit,
            "total": total,
            "has_more": (offset + limit) < total,
        })

    except Exception as e:
        logger.error(f"Error getting logs for guild {guild_id}: {e}")
        # ✅ FIX: Always return JSON, never raise or stream
        return jsonify({
            "success": False, 
            "error": "Failed to retrieve logs"
        }), 500

# Update the get_guild_settings_live function in api_routes.py
@api_bp.route("/guild/<int:guild_id>/settings", methods=["GET"])
@require_auth
async def get_guild_settings_live(guild_id: int):
    """Return *live* guild configuration with new action system"""
    try:
        db = get_database()
        raw = await db.get_guild_settings(guild_id)

        # Updated settings structure
        settings = {
            "enabled": raw.get("enabled", True),
            "action_type": raw.get("action_type", "delete_only"),
            "timeout_after_swears": raw.get("timeout_after_swears", 3),
            "timeout_minutes": raw.get("timeout_minutes", 5),
            "kick_after_swears": raw.get("kick_after_swears", 5),
            "log_channel_id": raw.get("log_channel_id"),
            "bypass_roles": raw.get("bypass_roles", []),
            "bypass_channels": raw.get("bypass_channels", []),
            "custom_words": raw.get("custom_words", []),
            "whitelist_words": raw.get("whitelist_words", []),
        }

        return jsonify(success=True, settings=settings)

    except Exception as e:
        logger.error("Error getting settings: %s", e)
        return jsonify(success=False, error=str(e)), 500

# Update the update_guild_settings_api function
@api_bp.route("/guild/<int:guild_id>/settings", methods=["PUT"])
@require_auth
async def update_guild_settings_api(guild_id: int):
    """Update guild settings with new action system validation"""
    try:
        data = request.get_json(force=True)

        # Validate new action system
        allowed_actions = {"delete_only", "delete_timeout", "delete_timeout_kick"}
        if data.get("action_type") and data["action_type"] not in allowed_actions:
            return jsonify(success=False, error="Invalid action type"), 400

        # Validate timeout settings
        if "timeout_after_swears" in data and not 1 <= data["timeout_after_swears"] <= 50:
            return jsonify(success=False, error="Timeout threshold must be 1-50"), 400

        if "timeout_minutes" in data and not 1 <= data["timeout_minutes"] <= 1440:
            return jsonify(success=False, error="Timeout duration must be 1-1440 minutes"), 400

        if "kick_after_swears" in data and not 1 <= data["kick_after_swears"] <= 50:
            return jsonify(success=False, error="Kick threshold must be 1-50"), 400

        # Validate kick > timeout logic
        if ("kick_after_swears" in data and "timeout_after_swears" in data and 
            data["kick_after_swears"] <= data["timeout_after_swears"]):
            return jsonify(success=False, error="Kick threshold must be higher than timeout threshold"), 400

        db = get_database()
        await db.update_guild_settings(guild_id, data)

        # Invalidate cache
        if guild_cache:
            await guild_cache.invalidate_guild(guild_id)

        # Emit to dashboard
        _emit_to_dashboard('settings_updated', {
            'guild_id': str(guild_id),
            'settings': data,
            'timestamp': datetime.utcnow().isoformat()
        }, guild_id)

        return jsonify(success=True, message="Settings updated")

    except Exception as e:
        logger.error("Error updating settings: %s", e)
        return jsonify(success=False, error=str(e)), 500



@api_bp.route("/guild/<int:guild_id>/stats", methods=["GET"])
@require_auth
async def get_guild_stats_api(guild_id: int):
    """Get guild statistics with proper error handling and required fields"""
    try:
        db = get_database()
        
        # Get filter stats with defaults
        filter_stats = await db.get_filter_stats(guild_id, days=7) or {}
        
        # Get timeseries data with defaults
        series = await db.get_violations_timeseries(guild_id, hours=24) or []
        
        # Get performance stats with defaults
        performance_stats = await db.get_performance_stats() or {}
        
        # Get bot/guild info
        bot = _need_bot()
        guild = bot.get_guild(guild_id)
        
        # ✅ FIX: Ensure all required fields are present with defaults
        stats_response = {
            "total_violations": filter_stats.get("total_filtered", 0),
            "violations_today": filter_stats.get("filtered_today", 0),
            "active_users": len(guild.members) if guild else 0,
            "top_words": filter_stats.get("top_blocked_words", []),
            "cache_hit_rate": performance_stats.get("cache_hit_rate", "0%"),
            "avg_response_time": performance_stats.get("avg_query_time_ms", 0),
            "days_analyzed": filter_stats.get("days_analyzed", 7),  # ✅ ADD MISSING FIELD
            # Add action breakdown if available
            "action_breakdown": filter_stats.get("action_breakdown", {
                "delete": 0,
                "timeout": 0, 
                "kick": 0
            })
        }
        
        return jsonify({
            "success": True,
            "stats": stats_response,
            "series": series  # For the 24h line chart
        })
        
    except Exception as e:
        logger.error(f"Error getting stats for guild {guild_id}: {e}")
        return jsonify({
            "success": False, 
            "error": "Failed to retrieve statistics"
        }), 500


# ──────────────────────────────────────────────────────────────────
#  BOT STATUS & FILTER TEST
# ──────────────────────────────────────────────────────────────────
@api_bp.route("/guild/<int:guild_id>/debug-raw-stats", methods=["GET"])
@require_auth
async def debug_raw_stats(guild_id: int):
    try:
        db = get_database()
        
        # Test each function separately
        filter_stats = await db.get_filter_stats(guild_id, days=7)
        series = await db.get_violations_timeseries(guild_id, hours=24)
        performance_stats = await db.get_performance_stats()
        
        return jsonify({
            "success": True,
            "filter_stats_raw": filter_stats,
            "filter_stats_type": str(type(filter_stats)),
            "top_words_raw": filter_stats.get("top_blocked_words"),
            "top_words_type": str(type(filter_stats.get("top_blocked_words"))),
            "series_raw": series,
            "series_type": str(type(series)),
            "performance_stats": performance_stats
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "error_type": str(type(e))
        })

@api_bp.route("/guild/<int:guild_id>/bot-status", methods=["GET"])
def check_bot_status(guild_id: int):
    """Return whether the bot is present in the guild."""
    try:
        bot = _need_bot()
        guild = bot.get_guild(guild_id)
        return jsonify(
            success=True,
            bot_in_guild=guild is not None,
            guild_name=guild.name if guild else None,
            member_count=guild.member_count if guild else 0,
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Error checking bot status: %s", e)
        return jsonify(success=False, bot_in_guild=False, error=str(e)), 500


@api_bp.route("/guild/<int:guild_id>/test-filter", methods=["POST"])
@require_auth
async def test_filter(guild_id: int):
    """Test a message against the guild's active filter."""
    try:
        message = request.get_json(force=True).get("message", "")
        if not message:
            return jsonify(success=False, error="Message required"), 400

        if guild_id not in guild_filters:
            return jsonify(success=False, error="Filter not initialised"), 400

        result = await guild_filters[guild_id].contains_swear_word(message)
        if isinstance(result, tuple):
            would_block, blocked = result
        else:
            would_block, blocked = result, []

        return jsonify(
            success=True,
            would_block=would_block,
            blocked_words=blocked,
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Error during test-filter: %s", e)
        return jsonify(success=False, error=str(e)), 500
