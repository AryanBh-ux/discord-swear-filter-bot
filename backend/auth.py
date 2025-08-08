# backend/auth.py
from __future__ import annotations

import os
import asyncio
import inspect
import requests
from functools import wraps
from flask import Blueprint, jsonify, redirect, request, session

# ────────────────────────────────────────────────────────────────
#  Discord OAuth settings
# ────────────────────────────────────────────────────────────────
CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
REDIRECT_URI = os.getenv(
    "DISCORD_REDIRECT_URI",
    "http://localhost:5000/auth/discord/callback",
)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# ────────────────────────────────────────────────────────────────
#  Unified auth decorator  ➜ ALWAYS RETURNS A **SYNC** WRAPPER
# ────────────────────────────────────────────────────────────────
def require_auth(view):
    """Block if no session['user']; run async or sync view transparently."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        if "user" not in session:
            return jsonify(success=False, error="Unauthorized"), 401

        result = view(*args, **kwargs)          # may be plain value or coroutine

        if inspect.isawaitable(result):         # view was async
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                # no loop -> run the coroutine to completion
                return asyncio.run(result)
            else:
                return loop.run_until_complete(result)

        return result                           # sync view – just return value

    return wrapper


# ────────────────────────────────────────────────────────────────
#  OAuth flow
# ────────────────────────────────────────────────────────────────
@auth_bp.route("/discord")
def discord_login():
    url = (
        "https://discord.com/api/oauth2/authorize?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        "response_type=code&"
        "scope=identify%20guilds"
    )
    return redirect(url)


@auth_bp.route("/discord/callback")
def discord_callback():
    code = request.args.get("code")
    if not code:
        return redirect("http://localhost:3000/?error=no_code")

    try:
        # 1) swap code → token
        token_json = requests.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        ).json()

        access_token = token_json.get("access_token")
        if not access_token:
            return redirect("http://localhost:3000/?error=token_failed")

        # 2) fetch user + guilds
        hdrs = {"Authorization": f"Bearer {access_token}"}
        user = requests.get(
            "https://discord.com/api/v10/users/@me", headers=hdrs, timeout=15
        ).json()
        guilds = requests.get(
            "https://discord.com/api/v10/users/@me/guilds", headers=hdrs, timeout=15
        ).json()

        manageable = [
            g for g in guilds if (int(g["permissions"]) & 0x20) or g["owner"]
        ]

        # 3) store session
        session["user"] = user
        session["guilds"] = manageable
        session["access_token"] = access_token

        return redirect("http://localhost:3000/servers")

    except Exception:
        return redirect("http://localhost:3000/?error=oauth_failed")


# ────────────────────────────────────────────────────────────────
#  Helper endpoints
# ────────────────────────────────────────────────────────────────
@auth_bp.route("/user")
def get_user():
    if "user" not in session:
        return jsonify(error="Not authenticated"), 401
    return jsonify(user=session["user"], guilds=session.get("guilds", []))


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify(success=True)
