import asyncio
import logging
import time
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from supabase import create_client, Client
from functools import wraps

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseError(Exception):
    """Custom exception for database operations"""
    pass

class DatabaseManager:
    """
    Ultra-optimized database manager for the swear filter bot.
    Fixes all schema issues and provides bulletproof error handling.
    """
    
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        
        # Connection management
        self._client: Optional[Client] = None
        self._connection_lock = asyncio.Lock()
        self._last_health_check = 0
        self._health_check_interval = 300  # 5 minutes
        
        # Smart caching system
        self._cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, float] = {}
        self._cache_lock = asyncio.Lock()
        self._cache_ttl = 300  # 5 minutes TTL
        self._max_cache_size = 500
        
        # Performance monitoring
        self._query_count = 0
        self._error_count = 0
        self._total_query_time = 0.0
    
    async def initialize(self) -> None:
        """Initialize database connection with health check"""
        try:
            await self._ensure_connection()
            logger.info("✅ Database initialized successfully")
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
            raise DatabaseError(f"Database initialization failed: {e}")
    
    async def _ensure_connection(self) -> None:
        """Ensure we have a healthy database connection"""
        async with self._connection_lock:
            current_time = time.time()
            
            if (self._client is None or 
                current_time - self._last_health_check > self._health_check_interval):
                
                try:
                    self._client = create_client(self.supabase_url, self.supabase_key)
                    
                    # Test connection with simple query
                    result = self._client.table('guild_settings').select('guild_id').limit(1).execute()
                    
                    if hasattr(result, 'data'):
                        self._last_health_check = current_time
                        logger.info("Database connection verified")
                    else:
                        raise Exception("Invalid response from database")
                        
                except Exception as e:
                    self._client = None
                    logger.error(f"Database connection failed: {e}")
                    raise DatabaseError(f"Connection failed: {e}")
    
    def _retry_on_failure(max_retries: int = 3, delay: float = 1.0):
        """Decorator for retrying database operations with exponential backoff"""
        def decorator(func):
            @wraps(func)
            async def wrapper(self, *args, **kwargs):
                last_exception = None
                
                for attempt in range(max_retries):
                    try:
                        await self._ensure_connection()
                        
                        start_time = time.time()
                        result = await func(self, *args, **kwargs)
                        
                        # Track performance
                        query_time = time.time() - start_time
                        self._query_count += 1
                        self._total_query_time += query_time
                        
                        return result
                        
                    except Exception as e:
                        last_exception = e
                        self._error_count += 1
                        
                        if attempt < max_retries - 1:
                            wait_time = delay * (2 ** attempt)  # Exponential backoff
                            logger.warning(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                            logger.info(f"Retrying in {wait_time} seconds...")
                            await asyncio.sleep(wait_time)
                        else:
                            logger.error(f"Database operation failed after {max_retries} attempts: {e}")
                
                raise DatabaseError(f"Operation failed after {max_retries} attempts: {last_exception}")
            
            return wrapper
        return decorator
    
    async def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get data from cache if it's still valid"""
        async with self._cache_lock:
            if cache_key in self._cache:
                timestamp = self._cache_timestamps.get(cache_key, 0)
                if time.time() - timestamp < self._cache_ttl:
                    return self._cache[cache_key]
                else:
                    # Remove expired entry
                    del self._cache[cache_key]
                    del self._cache_timestamps[cache_key]
            return None
    
    async def _set_cache(self, cache_key: str, data: Any) -> None:
        """Store data in cache with automatic cleanup"""
        async with self._cache_lock:
            # Clean up cache if it's getting too large
            if len(self._cache) >= self._max_cache_size:
                # Remove oldest 20% of entries
                sorted_items = sorted(self._cache_timestamps.items(), key=lambda x: x[1])
                to_remove = sorted_items[:len(sorted_items)//5]
                
                for key, _ in to_remove:
                    self._cache.pop(key, None)
                    self._cache_timestamps.pop(key, None)
                
                logger.info(f"Cache cleanup: removed {len(to_remove)} entries")
            
            self._cache[cache_key] = data
            self._cache_timestamps[cache_key] = time.time()
    
    async def _invalidate_cache(self, pattern: str) -> None:
        """Invalidate cache entries matching pattern"""
        async with self._cache_lock:
            keys_to_remove = [key for key in self._cache.keys() if pattern in key]
            for key in keys_to_remove:
                self._cache.pop(key, None)
                self._cache_timestamps.pop(key, None)
            
            if keys_to_remove:
                logger.info(f"Invalidated {len(keys_to_remove)} cache entries for pattern: {pattern}")
    

    # --- compatibility helpers for code that expects asyncpg ---------
    async def execute(self, query: str, *params):
        """
        Supabase wrapper that mimics asyncpg.execute.
        Only supports INSERT ... VALUES ($1,$2,...) with literal %s placeholders.
        """
        await self._ensure_connection()
        sql = query.replace("%s", "{}").format(*[
            json.dumps(p) if isinstance(p, (list, dict)) else p for p in params
        ])
        # Supabase RPC call
        return self._client.rpc("exec_sql", {"sql": sql}).execute()

    async def fetch(self, query: str, *params):
        await self._ensure_connection()
        sql = query.replace("%s", "{}").format(*params)
        result = self._client.rpc("exec_sql", {"sql": sql}).execute()
        return result.data or []

    async def fetchval(self, query: str, *params):
        rows = await self.fetch(query, *params)
        if rows:
            # return first column of first row
            return list(rows[0].values())[0]
        return None

    @property
    def pool(self):
        """Dummy property so 'if self.pool' checks pass."""
        return True

    @_retry_on_failure(max_retries=3, delay=1.0)
    async def get_guild_settings(self, guild_id: int) -> Dict[str, Any]:
        """Get guild settings with smart caching and proper error handling"""
        cache_key = f"guild_settings_{guild_id}"
        
        # Try cache first
        cached_data = await self._get_from_cache(cache_key)
        if cached_data is not None:
            return cached_data
        
        try:
            # Query database
            result = self._client.table('guild_settings').select('*').eq('guild_id', guild_id).execute()
            
            if result.data and len(result.data) > 0:
                settings = result.data[0]
                
                # Convert JSONB arrays back to Python lists
                settings['bypass_roles'] = settings.get('bypass_roles', [])
                settings['bypass_channels'] = settings.get('bypass_channels', [])
                settings['custom_words'] = settings.get('custom_words', [])
                settings['whitelist_words'] = settings.get('whitelist_words', [])
                
                # Cache the result
                await self._set_cache(cache_key, settings)
                return settings
            else:
                # Create default settings for new guild
                default_settings = {
                    'guild_id': guild_id,
                    'enabled': True,
                    'action_type': 'delete_only',  # ✅ NEW
                    'timeout_after_swears': 3,     # ✅ NEW
                    'timeout_minutes': 5,          # ✅ NEW
                    'kick_after_swears': 5,        # ✅ NEW
                    'log_channel_id': None,
                    'bypass_roles': [],
                    'bypass_channels': [],
                    'custom_words': [],
                    'whitelist_words': []
                }
                
                # Insert new guild settings
                insert_result = self._client.table('guild_settings').insert(default_settings).execute()
                
                if insert_result.data:
                    # Cache and return the created settings
                    await self._set_cache(cache_key, default_settings)
                    return default_settings
                else:
                    raise Exception(f"Failed to create default settings: {insert_result}")
                
        except Exception as e:
            logger.error(f"Error getting guild settings for {guild_id}: {e}")
            raise DatabaseError(f"Failed to get guild settings: {e}")
    
    @_retry_on_failure(max_retries=3, delay=1.0)
    async def update_guild_settings(self, guild_id: int, updates: Dict[str, Any]) -> bool:
        """Update guild settings with cache invalidation"""
        try:
            # Ensure the guild exists first
            await self.get_guild_settings(guild_id)
            
            # Perform update
            result = self._client.table('guild_settings').update(updates).eq('guild_id', guild_id).execute()
            
            if result.data or result.count == 1:
                # Invalidate cache
                await self._invalidate_cache(f"guild_settings_{guild_id}")
                logger.info(f"Updated guild settings for {guild_id}")
                return True
            else:
                raise Exception(f"Update failed: {result}")
                
        except Exception as e:
            logger.error(f"Error updating guild settings for {guild_id}: {e}")
            raise DatabaseError(f"Failed to update guild settings: {e}")        
    
    @_retry_on_failure(max_retries=3, delay=1.0)
    async def log_filter_action(self, guild_id: int, user_id: int, channel_id: int,
                            message_content: str, blocked_words: list, action_taken: str = "delete_only",
                            user_name: str = None, user_avatar: str = None, channel_name: str = None):
        """Enhanced logging with NEW action types support"""
        await self._ensure_connection()
        
        # ✅ Better avatar URL handling
        avatar_url = None
        if user_avatar and user_avatar != "None" and not user_avatar.endswith("None"):
            avatar_url = user_avatar

        log_data = {
            'guild_id': guild_id,
            'user_id': user_id,
            'user_name': user_name or "Unknown User",  # ✅ FIXED: Store in user_name column
            'user_avatar': avatar_url,
            'channel_id': channel_id,
            'channel_name': channel_name or "Unknown Channel",
            'message_content': message_content,
            'blocked_words': blocked_words,
            'action_taken': action_taken,  # ✅ NEW: Now supports new action types
            'timestamp': datetime.utcnow().isoformat()
        }
        
        try:
            result = self._client.table('filter_logs').insert(log_data).execute()
            logger.info(f"✅ Successfully logged violation: {action_taken}")
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"❌ Error logging violation: {e}")
            logger.error(f"Log data: {log_data}")
            raise

     
    @_retry_on_failure(max_retries=3, delay=1.0)
    async def get_user_warnings(self, guild_id: int, user_id: int) -> int:
        """Get user warning count (simplified version)"""
        cache_key = f"user_warnings_{guild_id}_{user_id}"
        
        # Try cache first
        cached_data = await self._get_from_cache(cache_key)
        if cached_data is not None:
            return cached_data.get('warning_count', 0)

        try:
            result = self._client.table('user_warnings').select('warning_count').eq('guild_id', guild_id).eq('user_id', user_id).execute()
            
            if result.data and len(result.data) > 0:
                warning_count = result.data[0]['warning_count']
                await self._set_cache(cache_key, {'warning_count': warning_count})
                return warning_count
            else:
                # Return 0 for new users
                await self._set_cache(cache_key, {'warning_count': 0})
                return 0
                
        except Exception as e:
            logger.error(f"Error getting user warnings: {e}")
            return 0

    @_retry_on_failure(max_retries=3, delay=1.0)
    async def log_violation(self, guild_id: int, user_id: int, channel_id: int, 
                        message_content: str, detected_words: list, action_taken: str):
        """Log a filter violation with the new action system"""
        try:
            log_data = {
                'guild_id': guild_id,
                'user_id': user_id,
                'channel_id': channel_id,
                'message_content': message_content,
                'blocked_words': detected_words,
                'action_taken': action_taken,  # This will be 'delete_only', 'delete_timeout', etc.
                'timestamp': datetime.utcnow().isoformat()
            }
            
            result = self._client.table('filter_logs').insert(log_data).execute()
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Error logging violation: {e}")
            raise DatabaseError(f"Failed to log violation: {e}")

    
    @_retry_on_failure(max_retries=3, delay=1.0)
    async def increment_user_warnings(self, guild_id: int, user_id: int) -> int:
        """Increment user warning count - SIMPLIFIED VERSION"""
        try:
            # Check if user already has warnings
            result = self._client.table('user_warnings').select('warning_count').eq('guild_id', guild_id).eq('user_id', user_id).execute()
            
            if result.data and len(result.data) > 0:
                # Update existing record
                current_warnings = result.data[0]['warning_count'] + 1
                
                update_result = self._client.table('user_warnings').update({
                    'warning_count': current_warnings,
                    'last_warning': datetime.utcnow().isoformat()
                }).eq('guild_id', guild_id).eq('user_id', user_id).execute()
                
                new_count = current_warnings
            else:
                # Create new record
                insert_result = self._client.table('user_warnings').insert({
                    'guild_id': guild_id,
                    'user_id': user_id,
                    'warning_count': 1,
                    'last_warning': datetime.utcnow().isoformat()
                }).execute()
                
                new_count = 1
            
            # Invalidate cache
            await self._invalidate_cache(f"user_warnings_{guild_id}_{user_id}")
            
            return new_count
            
        except Exception as e:
            logger.error(f"Error incrementing user warnings: {e}")
            raise DatabaseError(f"Failed to increment user warnings: {e}")
    
    @_retry_on_failure(max_retries=3, delay=1.0)
    async def reset_user_warnings(self, guild_id: int, user_id: int) -> bool:
        """Reset user warning count"""
        try:
            result = self._client.table('user_warnings').update({
                'warning_count': 0,
                'last_warning': datetime.utcnow().isoformat()
            }).eq('guild_id', guild_id).eq('user_id', user_id).execute()
            
            # Invalidate cache
            await self._invalidate_cache(f"user_warnings_{guild_id}_{user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error resetting user warnings: {e}")
            raise DatabaseError(f"Failed to reset user warnings: {e}")
    
    @_retry_on_failure(max_retries=2, delay=2.0)
    async def get_filter_stats(self, guild_id: int, *, days: int = 7):
        await self._ensure_connection()
        
        # Get total count directly from filter_logs table
        total_result = self._client.table('filter_logs')\
            .select('id', count='exact')\
            .eq('guild_id', guild_id).execute()
        
        total = total_result.count or 0
        
        # Get today's count
        today_start = datetime.utcnow().date().isoformat()
        today_result = self._client.table('filter_logs')\
            .select('id', count='exact')\
            .eq('guild_id', guild_id)\
            .gte('timestamp', today_start)\
            .execute()
        
        today = today_result.count or 0
        
        # Get top words - ensure it returns an array
        top_words = []
        try:
            top_words_result = self._client.rpc('top_blocked_words', {
                'p_guild': guild_id,
                'p_days': days
            }).execute()
            
            if top_words_result.data and isinstance(top_words_result.data, list):
                top_words = top_words_result.data
            else:
                top_words = []
        except Exception as e:
            logger.warning(f"Failed to get top words: {e}")
            top_words = []
        
        return {
            "total_filtered": total,
            "filtered_today": today,
            "top_blocked_words": top_words,
            "days_analyzed": days  # ✅ FIX: Add missing field
        }
    async def get_violations_timeseries(self, guild_id: int, *, hours: int = 24):
        """Get violations timeseries with proper error handling."""
        try:
            await self._ensure_connection()
            result = self._client.rpc('violations_timeseries', {
                'p_guild': guild_id, 
                'p_hours': hours
            }).execute()
            
            if result.data:
                logger.info(f"Timeseries data for guild {guild_id}: {len(result.data)} points")
                return result.data
            else:
                logger.warning(f"No timeseries data returned for guild {guild_id}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to get timeseries for guild {guild_id}: {e}")
            return []



    
    async def cleanup_old_logs(self, days_to_keep: int = 30) -> int:
        """Clean up old filter logs with proper date handling"""
        try:
            # Calculate cutoff date properly
            cutoff_date = (datetime.utcnow() - timedelta(days=days_to_keep)).isoformat()
            
            result = self._client.table('filter_logs').delete().lt('timestamp', cutoff_date).execute()
            
            deleted_count = len(result.data) if result.data else 0
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old log entries")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old logs: {e}")
            return 0
    
    @_retry_on_failure(max_retries=3, delay=1.0)
    async def get_paginated_logs(self, guild_id: int, limit: int = 25, offset: int = 0):
        """Get paginated violation logs with proper error handling"""
        try:
            await self._ensure_connection()
            
            # Get logs with pagination
            result = self._client.table('filter_logs')\
                .select('*')\
                .eq('guild_id', guild_id)\
                .order('timestamp', desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            if result.data:
                # Format the logs properly
                formatted_logs = []
                for log in result.data:
                    formatted_log = {
                        'id': log.get('id'),
                        'user_id': str(log.get('user_id', '')),
                        'username': log.get('user_name', 'Unknown User'),
                        'user_avatar': log.get('user_avatar'),
                        'channel_name': log.get('channel_name', 'Unknown Channel'),
                        'blocked_words': log.get('blocked_words', []),
                        'timestamp': log.get('timestamp'),
                        'action_taken': log.get('action_taken', 'delete_only')
                    }
                    formatted_logs.append(formatted_log)
                
                return formatted_logs
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting paginated logs for guild {guild_id}: {e}")
            return []

      
    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        avg_query_time = (self._total_query_time / self._query_count) if self._query_count > 0 else 0
        
        cache_size = len(self._cache)
        cache_hit_ratio = 0  # Would need to track cache hits vs misses for accurate ratio
        
        return {
            'total_queries': self._query_count,
            'total_errors': self._error_count,
            'avg_query_time_ms': round(avg_query_time * 1000, 2),
            'cache_size': cache_size,
            'cache_hit_ratio': cache_hit_ratio,
            'uptime_seconds': time.time() - self._last_health_check if self._last_health_check else 0
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        try:
            start_time = time.time()
            
            # Test basic connectivity
            await self._ensure_connection()
            
            # Test a simple query
            result = self._client.table('guild_settings').select('guild_id').limit(1).execute()
            
            response_time = time.time() - start_time
            
            return {
                'status': 'healthy',
                'response_time_ms': round(response_time * 1000, 2),
                'connection_active': self._client is not None,
                'cache_size': len(self._cache),
                'total_queries': self._query_count,
                'error_rate': (self._error_count / max(1, self._query_count)) * 100
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'connection_active': False
            }
    
    async def close(self) -> None:
        """Clean shutdown of database connections and cache"""
        async with self._connection_lock:
            self._client = None
        
        async with self._cache_lock:
            self._cache.clear()
            self._cache_timestamps.clear()
        
        logger.info("Database manager shut down successfully")

        

# Global database instance
db_manager: Optional[DatabaseManager] = None

async def initialize_database(supabase_url: str, supabase_key: str) -> DatabaseManager:
    """Initialize the global database manager"""
    global db_manager
    db_manager = DatabaseManager(supabase_url, supabase_key)
    await db_manager.initialize()
    return db_manager

def get_database() -> DatabaseManager:
    """Get the global database manager instance"""
    if db_manager is None:
        raise RuntimeError("Database not initialized. Call initialize_database() first.")
    return db_manager

async def close_database() -> None:
    """Close the global database manager"""
    global db_manager
    if db_manager:
        await db_manager.close()
        db_manager = None
