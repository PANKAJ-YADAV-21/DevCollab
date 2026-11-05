import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# Load environment variables: check python/.env, root .env, and backend/.env
base_dir = Path(__file__).resolve().parent
for env_path in [base_dir / ".env", base_dir.parent / ".env", base_dir.parent / "backend" / ".env"]:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)

# Default to local MongoDB instance
DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/devcollab"
MONGO_URI = os.getenv("MONGO_URI", DEFAULT_MONGO_URI)
DEFAULT_DB_NAME = "devcollab"

_client = None
_db = None


def get_mongo_client(uri: str = None) -> MongoClient:
    """
    Get or create a singleton MongoClient instance.
    """
    global _client
    if _client is None:
        target_uri = uri or MONGO_URI
        _client = MongoClient(
            target_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=50,
        )
    return _client


def get_database(db_name: str = None):
    """
    Get the DevCollab MongoDB database instance.
    """
    global _db
    if _db is None:
        client = get_mongo_client()
        # Parse db name from URI or fallback
        if db_name:
            target_db = db_name
        else:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(MONGO_URI)
                path = parsed.path.lstrip("/")
                target_db = path if path else DEFAULT_DB_NAME
            except Exception:
                target_db = DEFAULT_DB_NAME
        _db = client[target_db]
    return _db


def check_connection() -> dict:
    """
    Ping MongoDB to verify connectivity and return server metadata.
    """
    try:
        client = get_mongo_client()
        client.admin.command("ping")
        server_info = client.server_info()
        db = get_database()
        collections = db.list_collection_names()
        return {
            "status": "connected",
            "version": server_info.get("version", "unknown"),
            "database": db.name,
            "collections": collections,
            "uri": MONGO_URI.split("@")[-1] if "@" in MONGO_URI else MONGO_URI,
        }
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        return {
            "status": "disconnected",
            "error": str(e),
            "uri": MONGO_URI.split("@")[-1] if "@" in MONGO_URI else MONGO_URI,
        }


def close_connection():
    """
    Close the global MongoClient connection pool.
    """
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
