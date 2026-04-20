import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "phishguard_db"

# Initialize connection as None
client = None
db = None

def get_database():
    global client, db
    uri = os.getenv("MONGODB_URI")
    
    if not uri:
        print("MONGODB_URI not found in environment variables.")
        return None
        
    try:
        if client is None:
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            # Test connection
            client.admin.command('ping')
            print("Connected to MongoDB Atlas successfully!")
        return db
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        # Reset client so it tries again next time
        client = None
        db = None
        return None
