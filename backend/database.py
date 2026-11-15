import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "voice_auth")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is missing. Check backend/.env")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

users = db["users"]
voiceprints = db["voiceprints"]
auth_logs = db["auth_logs"]


def test_connection():
    client.admin.command("ping")
    print("MongoDB connected successfully")


if __name__ == "__main__":
    test_connection()