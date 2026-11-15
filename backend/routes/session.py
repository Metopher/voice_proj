from bson import ObjectId
from flask import Blueprint, request, jsonify
from database import users
from utils.tokens import decode_token

session_bp = Blueprint("session", __name__, url_prefix="/api/auth")


@session_bp.route("/me", methods=["GET"])
def me():
    header = request.headers.get("Authorization", "")
    token = header[7:] if header.startswith("Bearer ") else ""

    # only a full session token works here, not pending or enroll tokens
    user_id = decode_token(token, "session")
    if not user_id:
        return jsonify({"error": "Not signed in."}), 401

    user = users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "Not signed in."}), 401

    return jsonify({
        "username": user["username"],
        "email": user["email"],
    }), 200