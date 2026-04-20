import hashlib
import os
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from database import get_database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

router = APIRouter(prefix="/auth", tags=["auth"])

def hash_password(password: str) -> str:
    # Use pbkdf2_hmac for cross-platform secure hashing without external C dependencies
    salt = b"phishguard_salt"
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return hashed.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class UserRegister(BaseModel):
    username: str
    password: str
    role: str = "user" # "user" or "admin"
    admin_secret: str = None # Secret required to become admin

class UserLogin(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(user: UserRegister):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected.")
    
    existing_user = db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    role = "user"
    if user.role == "admin":
        if user.admin_secret == "admin123":
            role = "admin"
        else:
            raise HTTPException(status_code=403, detail="Invalid admin secret")
            
    user_dict = {
        "username": user.username,
        "password": hash_password(user.password),
        "role": role,
        "created_at": datetime.utcnow()
    }
    
    db.users.insert_one(user_dict)
    return {"message": "User registered successfully", "role": role}

@router.post("/login")
def login(user: UserLogin):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected.")
        
    db_user = db.users.find_one({"username": user.username})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    token_data = {"sub": db_user["username"], "role": db_user["role"]}
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": db_user["username"],
        "role": db_user["role"]
    }

def get_optional_user(token: str = Depends(oauth2_scheme)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return {"username": username, "role": payload.get("role")}
    except jwt.PyJWTError:
        return None

def get_current_user(user: dict = Depends(get_optional_user)):
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
