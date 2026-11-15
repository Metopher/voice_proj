
from datetime import datetime, timezone
from bson import ObjectId
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo.errors import DuplicateKeyError
from database import users, voiceprints
from utils.tokens import create_token, decode_token
from services.voice_service import embed_from_bytes, average_embeddings

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MIN_SAMPLES = 3


def get_bearer_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:]
    return ""


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or len(password) < 6:
        return jsonify({
            "error": "Username, email and a password of at least 6 characters are required."
        }), 400

    try:
        result = users.insert_one({
            "username": username,
            "email": email,
            "password_hash": generate_password_hash(password),
            "voice_enrolled": False,
            "created_at": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        return jsonify({"error": "Username or email already exists."}), 409

    user_id = str(result.inserted_id)
    enroll_token = create_token(user_id, "enroll", minutes=15)

    return jsonify({
        "message": "User created. Voice enrollment required.",
        "user_id": user_id,
        "enroll_token": enroll_token,
    }), 201


@auth_bp.route("/enroll-voice", methods=["POST"])
def enroll_voice():
    user_id = decode_token(get_bearer_token(), "enroll")
    if not user_id:
        return jsonify({"error": "Invalid or expired enrollment token."}), 401

    files = request.files.getlist("samples")
    if len(files) < MIN_SAMPLES:
        return jsonify({
            "error": f"At least {MIN_SAMPLES} voice samples are required."
        }), 400

    embeds = []
    for i, f in enumerate(files, start=1):
        try:
            embeds.append(embed_from_bytes(f.read()))
        except ValueError as e:
            return jsonify({"error": f"Sample {i}: {e}"}), 400

    voiceprint = average_embeddings(embeds)

    voiceprints.update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": {
            "user_id": ObjectId(user_id),
            "embedding": voiceprint.tolist(),
            "sample_count": len(embeds),
            "model": "resemblyzer",
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    users.update_one({"_id": ObjectId(user_id)}, {"$set": {"voice_enrolled": True}})

    return jsonify({"message": "Voice enrolled successfully."}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = users.find_one({"email": email})

    # same message for "no such user" and "wrong password",
    # so attackers can't discover which emails are registered
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password."}), 401

    pending_token = create_token(str(user["_id"]), "pending", minutes=5)

    return jsonify({
        "message": "Password correct. Voice verification required.",
        "pending_token": pending_token,
        "voice_enrolled": user.get("voice_enrolled", False),
    }), 200