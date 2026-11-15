import os
from datetime import datetime, timezone
from bson import ObjectId
from flask import Blueprint, request, jsonify
from database import voiceprints, auth_logs
from utils.tokens import create_token, decode_token
from services.voice_service import embed_from_bytes, similarity

voice_bp = Blueprint("voice", __name__, url_prefix="/api/auth")

# PLACEHOLDER: we'll tune this from real scores later.
# Change it in backend/.env as VOICE_THRESHOLD=0.80 (no code change needed).
VOICE_THRESHOLD = float(os.getenv("VOICE_THRESHOLD", "0.75"))


def get_bearer_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:]
    return ""


def log_attempt(user_id, score, success, reason=""):
    auth_logs.insert_one({
        "user_id": ObjectId(user_id),
        "score": score,
        "success": success,
        "reason": reason,
        "ip": request.remote_addr,
        "timestamp": datetime.now(timezone.utc),
    })


@voice_bp.route("/verify-voice", methods=["POST"])
def verify_voice():
    user_id = decode_token(get_bearer_token(), "pending")
    if not user_id:
        return jsonify({"error": "Invalid or expired login. Sign in again."}), 401

    f = request.files.get("sample")
    if not f:
        return jsonify({"error": "No voice sample uploaded."}), 400

    stored = voiceprints.find_one({"user_id": ObjectId(user_id)})
    if not stored:
        return jsonify({"error": "No voice enrolled for this account."}), 400

    try:
        embed = embed_from_bytes(f.read())
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    score = similarity(stored["embedding"], embed)

    if score < VOICE_THRESHOLD:
        log_attempt(user_id, score, False, "below threshold")
        return jsonify({"error": "Voice did not match."}), 401

    log_attempt(user_id, score, True)
    session_token = create_token(user_id, "session", minutes=60)

    return jsonify({
        "message": "Login successful.",
        "session_token": session_token,
        "score": round(score, 3),  # dev only: remove before production
    }), 200