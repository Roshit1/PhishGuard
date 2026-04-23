from fastapi import FastAPI, HTTPException, Body, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from datetime import datetime
import os
import sys
from ml.predict import predict_phishing, predict_email_phishing, predict_live_website
from database import get_database
import auth
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # Using gemini-flash-latest for best compatibility
    model = genai.GenerativeModel('gemini-flash-latest')
else:
    model = None

app = FastAPI(title="PhishGuard API", description="API for Phishing URL Detection System")

# Allow CORS for frontend and extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")

class ScanRequest(BaseModel):
    url: str

class ScanEmailRequest(BaseModel):
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list = []

class ReportRequest(BaseModel):
    url: str
    description: str = ""

class ReportActionRequest(BaseModel):
    action: str  # "approve" or "reject"

@app.get("/")
def read_root():
    return {"message": "Welcome to PhishGuard API. Use POST /api/scan, /api/scan-email, or /api/scan-live."}

@app.post("/api/scan")
def scan_url(request: ScanRequest, user: dict = Depends(auth.get_optional_user)):
    url = request.url
    
    # 1. Predict using ML model
    prediction_result = predict_phishing(url)
    
    if "error" in prediction_result:
        raise HTTPException(status_code=500, detail=prediction_result["error"])
        
    # 2. Log to Database (if connected)
    db = get_database()
    if db is not None:
        try:
            log_entry = {
                "url": url,
                "status": prediction_result["status"],
                "risk_score": prediction_result["risk_score"],
                "features": prediction_result["features"],
                "timestamp": datetime.utcnow(),
                "username": user["username"] if user else None
            }
            db.url_logs.insert_one(log_entry)
        except Exception as e:
            print(f"Failed to log to database: {e}")
            
    return prediction_result

@app.post("/api/scan-email")
def scan_email(request: ScanEmailRequest, user: dict = Depends(auth.get_optional_user)):
    content = request.content
    
    # 1. Predict using ML model (heuristic based currently)
    prediction_result = predict_email_phishing(content)
    
    # 2. Log to Database (if connected)
    db = get_database()
    if db is not None:
        try:
            log_entry = {
                "content_preview": content[:100] + "..." if len(content) > 100 else content,
                "type": "email",
                "status": prediction_result["status"],
                "risk_score": prediction_result["risk_score"],
                "timestamp": datetime.utcnow(),
                "username": user["username"] if user else None
            }
            db.url_logs.insert_one(log_entry)
        except Exception as e:
            print(f"Failed to log to database: {e}")
            
    return prediction_result

@app.post("/api/scan-live")
async def scan_live(request: ScanRequest, user: dict = Depends(auth.get_optional_user)):
    url = request.url
    
    # 1. Predict using Live analysis
    prediction_result = await predict_live_website(url)
    
    # 2. Log to Database (if connected)
    db = get_database()
    if db is not None:
        try:
            log_entry = {
                "url": url,
                "type": "live",
                "status": prediction_result["status"],
                "risk_score": prediction_result["risk_score"],
                "timestamp": datetime.utcnow(),
                "username": user["username"] if user else None
            }
            db.url_logs.insert_one(log_entry)
        except Exception as e:
            print(f"Failed to log to database: {e}")
            
    return prediction_result

@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not model:
        return {"response": "AI Assistant is currently unavailable. Please configure GEMINI_API_KEY in the backend .env file.", "error": "API Key missing"}
    
    try:
        # Construct the context/prompt
        system_prompt = (
            "You are PhishGuard AI, a specialized cybersecurity assistant. "
            "Your goal is to help users identify phishing attempts, understand web security, "
            "and stay safe online. Be professional, helpful, and concise. "
            "If asked about a URL, analyze its potential risks. "
            "If asked about an email, look for common phishing signs like urgency, suspicious links, or weird sender addresses."
        )
        
        # Prepare history for Gemini
        gemini_history = []
        for msg in request.history:
            # Gemini roles are 'user' and 'model'
            role = "model" if msg.get("role") == "assistant" else "user"
            gemini_history.append({"role": role, "parts": [msg.get("text", "")]})
        
        chat_session = model.start_chat(history=gemini_history)
        
        # Use system prompt as context if history is empty
        message_to_send = request.message
        if not gemini_history:
            message_to_send = f"{system_prompt}\n\nUser: {request.message}"
        
        response = chat_session.send_message(message_to_send)
        return {"response": response.text}
    except Exception as e:
        error_msg = str(e)
        print(f"Chat error: {error_msg}")
        
        if "403" in error_msg and "leaked" in error_msg.lower():
            friendly_response = "I'm sorry, but my Gemini API key has been reported as leaked and disabled by Google. Please update the GEMINI_API_KEY in the backend .env file with a fresh key from the Google AI Studio."
        elif "429" in error_msg or "quota" in error_msg.lower():
            friendly_response = "I'm sorry, I've reached my usage limit (Quota Exceeded). Please try again in a minute or check your Google AI Studio billing/limits."
        elif "401" in error_msg or "API_KEY_INVALID" in error_msg:
            friendly_response = "It looks like the Gemini API key is invalid. Please double-check the key in your .env file."
        else:
            friendly_response = f"I'm sorry, I encountered an error: {error_msg[:100]}..."
            
        return {"response": friendly_response, "error": error_msg}

@app.get("/api/history")
def get_history(limit: int = 10, user: dict = Depends(auth.get_current_user)):
    db = get_database()
    if db is None:
        return {"error": "Database not configured."}
        
    try:
        logs = list(db.url_logs.find({"username": user["username"]}, {"_id": 0}).sort("timestamp", -1).limit(limit))
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@app.get("/api/stats")
def get_stats(user: dict = Depends(auth.get_current_user)):
    db = get_database()
    if db is None:
        return {"error": "Database not configured."}
        
    try:
        query = {"username": user["username"]}
        total_scans = db.url_logs.count_documents(query)
        phishing_count = db.url_logs.count_documents({"username": user["username"], "status": "Phishing"})
        suspicious_count = db.url_logs.count_documents({"username": user["username"], "status": "Suspicious"})
        safe_count = db.url_logs.count_documents({"username": user["username"], "status": "Safe"})
        
        phishing_percentage = 0
        if total_scans > 0:
            phishing_percentage = round((phishing_count / total_scans) * 100, 1)
            
        return {
            "total_scans": total_scans,
            "phishing_count": phishing_count,
            "suspicious_count": suspicious_count,
            "safe_count": safe_count,
            "phishing_percentage": phishing_percentage
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

# --- Reporting and Admin Feature ---

@app.post("/api/report")
def report_phishing(request: ReportRequest):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    
    # 1. Get ML prediction for the reported URL
    prediction_result = predict_phishing(request.url)
    
    # 2. Store the report
    report_entry = {
        "url": request.url,
        "description": request.description,
        "ml_status": prediction_result.get("status", "Unknown"),
        "ml_risk_score": prediction_result.get("risk_score", 0),
        "status": "pending",  # pending, approved, rejected
        "reported_at": datetime.utcnow()
    }
    
    try:
        result = db.reports.insert_one(report_entry)
        return {"message": "Report submitted successfully", "report_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit report: {e}")

@app.get("/api/admin/reports")
def get_reports(status: str = "pending"):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    
    try:
        reports = list(db.reports.find({"status": status}).sort("reported_at", -1))
        # Convert ObjectId to string for JSON serialization
        for report in reports:
            report["_id"] = str(report["_id"])
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@app.post("/api/admin/reports/{report_id}/action")
def manage_report(report_id: str, request: ReportActionRequest, background_tasks: BackgroundTasks):
    from bson import ObjectId
    import subprocess
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    
    status = "approved" if request.action == "approve" else "rejected"
    
    try:
        # Update the report status
        result = db.reports.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"status": status, "reviewed_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Report not found")
            
        # If approved, "send to dataset" by adding to a special collection
        if status == "approved":
            report = db.reports.find_one({"_id": ObjectId(report_id)})
            db.dataset_queue.insert_one({
                "url": report["url"],
                "label": "phishing",
                "source": "user_report",
                "added_at": datetime.utcnow()
            })
            
            # Retrain model in the background
            def retrain_model_task():
                try:
                    script_path = os.path.join(os.path.dirname(__file__), "ml", "train.py")
                    # Run train.py in background
                    subprocess.Popen([sys.executable, script_path])
                    print("Retraining model in background triggered.")
                except Exception as e:
                    print(f"Error triggering retrain: {e}")
                    
            background_tasks.add_task(retrain_model_task)
            
        return {"message": f"Report {status} successfully. Model will be retrained in the background." if status == "approved" else f"Report {status} successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
