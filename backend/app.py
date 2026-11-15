from flask import Flask, jsonify
from flask_cors import CORS
from database import users
from routes.auth import auth_bp
from routes.voice import voice_bp
from routes.session import session_bp

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

users.create_index("email", unique=True)
users.create_index("username", unique=True)

app.register_blueprint(auth_bp)
app.register_blueprint(voice_bp)
app.register_blueprint(session_bp)

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Backend is running"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)