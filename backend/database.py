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
    if MONGODB_URI:
        try:
            if client is None:
                client = MongoClient(MONGODB_URI)
                db = client[DB_NAME]
                # Test connection
                client.admin.command('ping')
                print("Connected to MongoDB Atlas successfully!")
            return db
        except Exception as e:
            print(f"Failed to connect to MongoDB: {e}")
            return None
    else:
        print("MONGODB_URI not found in environment variables. Database operations will be skipped.")
        return None
