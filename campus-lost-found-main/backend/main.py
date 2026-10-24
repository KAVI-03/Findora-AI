from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Header
from typing import Optional
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import shutil, os, sys, time, logging
import uvicorn
import hashlib
import hmac
import base64
import json

# Use the current directory as base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

from matcher_siglip import LostAndFoundMatcher
from storage_manager import StorageManager
from database import DatabaseManager
import chatbot

app = FastAPI()

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now, can restrict to Vercel URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories exist locally
FOUND_DIR = os.path.join(BASE_DIR, "found_items")
LOST_DIR = os.path.join(BASE_DIR, "lost_items")
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")
DIST_ASSETS_DIR = os.path.join(FRONTEND_DIR, "dist", "assets")
USERS_FILE = os.path.join(BASE_DIR, "users.json")

os.makedirs(FOUND_DIR, exist_ok=True)
os.makedirs(LOST_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(DIST_ASSETS_DIR, exist_ok=True)

storage = StorageManager()
db = DatabaseManager(os.path.join(BASE_DIR, "database.db"))

# Try to pull latest data from Hugging Face Dataset on startup
storage.download_data(BASE_DIR)

matcher = LostAndFoundMatcher()
matcher.load(path=BASE_DIR)

# Mount Static Directories
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/found_items", StaticFiles(directory=FOUND_DIR), name="found_items")
app.mount("/assets", StaticFiles(directory=DIST_ASSETS_DIR), name="assets")

# JWT security setup
security = HTTPBearer()
def _load_secret_key() -> str:
    """Secret used to sign login tokens. Never hardcode it in code!
    Priority: environment variable SECRET_KEY -> backend/.secret_key file (auto-created, git-ignored)."""
    env_key = os.environ.get("SECRET_KEY")
    if env_key:
        return env_key
    key_path = os.path.join(BASE_DIR, ".secret_key")
    try:
        if os.path.exists(key_path):
            with open(key_path, "r") as f:
                saved = f.read().strip()
            if saved:
                return saved
        new_key = os.urandom(32).hex()
        with open(key_path, "w") as f:
            f.write(new_key)
        return new_key
    except Exception:
        return os.urandom(32).hex()   # fallback: tokens reset on every restart

SECRET_KEY = _load_secret_key()

# Cryptography helpers
def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = os.urandom(16).hex()
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        bytes.fromhex(salt),
        100000 # 100k iterations
    ).hex()
    return pw_hash, salt

def verify_password(password: str, pw_hash: str, salt: str) -> bool:
    test_hash, _ = hash_password(password, salt)
    return test_hash == pw_hash

def generate_token(user_data: dict) -> str:
    payload = {
        "email": user_data["email"],
        "role": user_data["role"],
        "name": user_data["name"],
        "roll_number": user_data.get("roll_number", "N/A"),
        "exp": time.time() + 86400  # 24 hours expiry
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    msg = f"{header_b64}.{payload_b64}".encode()
    sig = hmac.new(SECRET_KEY.encode(), msg, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_token(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        msg = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(SECRET_KEY.encode(), msg, hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()).decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

# User Database Helper functions
# Fixed staff accounts - only these can log in as guard/admin
STAFF_ACCOUNTS = [
    {"name": "Admin", "email": "admin0111@gmail.com", "password": "Google@123", "role": "admin"},
    {"name": "Guard", "email": "guard0111@gmail.com", "password": "Google@123", "role": "guard"},
]

def ensure_default_users():
    allowed = {a["email"] for a in STAFF_ACCOUNTS}

    # remove all old guard/admin accounts (e.g. admin@iiitd.ac.in)
    with db.get_connection() as conn:
        rows = conn.execute("SELECT email FROM users WHERE role IN ('guard','admin')").fetchall()
        for r in rows:
            if r["email"] not in allowed:
                conn.execute("DELETE FROM users WHERE email = ?", (r["email"],))
        conn.commit()

    # create / refresh the fixed accounts
    for acc in STAFF_ACCOUNTS:
        pw_hash, salt = hash_password(acc["password"])
        if db.get_user_by_email(acc["email"]):
            with db.get_connection() as conn:
                conn.execute(
                    "UPDATE users SET name=?, password_hash=?, salt=?, role=? WHERE email=?",
                    (acc["name"], pw_hash, salt, acc["role"], acc["email"]),
                )
                conn.commit()
        else:
            db.add_user({
                "name": acc["name"],
                "email": acc["email"],
                "password_hash": pw_hash,
                "salt": salt,
                "role": acc["role"],
                "roll_number": "N/A",
                "created_at": int(time.time()),
            })

# Authentication Dependencies
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Session expired or invalid token")
    return payload

# Pydantic models for JSON endpoints
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    roll_number: str = "N/A"
    role: str = "student"

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    message: str
    history: list = []

class StatusRequest(BaseModel):
    status: str
    claimed_by: Optional[str] = None
    claimed_by_name: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    print("="*50)
    print("FINDORA BACKEND STARTING")
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"FOUND_DIR: {FOUND_DIR}")
    
    # Migrate from JSON to SQLite if applicable
    db.migrate_from_json(USERS_FILE, os.path.join(BASE_DIR, "metadata.json"))
    ensure_default_users()
    
    print(f"Registered Users count: {len(db.get_users())}")
    
    # Auto-cleanup older or claimed items
    now = int(time.time())
    thirty_days = 30 * 24 * 60 * 60
    items = db.get_items()
    pruned = False
    valid_items = []
    
    for item in items:
        # Check pruning condition
        is_claimed = item.get("status") == "claimed"
        is_old = (now - item.get("timestamp", now)) > thirty_days
        
        if is_claimed or is_old:
            print(f"Pruning item {item['filename']} (claimed: {is_claimed}, old: {is_old})")
            db.delete_item(item["filename"])
            path = os.path.join(FOUND_DIR, item["filename"])
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
            pruned = True
        else:
            valid_items.append(item)
            
    matcher.metadata = valid_items
    
    if len(matcher.metadata) != matcher.index.ntotal:
        print(f"Index mismatch detected! Metadata length: {len(matcher.metadata)}, Index length: {matcher.index.ntotal}")
        pruned = True # Force rebuild
    if pruned:
        print("Items pruned. Rebuilding FAISS index...")
        matcher.rebuild_index(BASE_DIR)
        matcher.save(path=BASE_DIR)
        storage.upload_data(BASE_DIR)
        
    print(f"Items currently in database: {len(matcher.metadata)}")
    print("="*50)

# Authentication endpoints
@app.post("/api/auth/register")
def register(req: RegisterRequest):
    email = req.email.strip().lower()

    if req.role.strip() != "student":
        raise HTTPException(status_code=403, detail="Guard/Admin accounts cannot be created here")

    if db.get_user_by_email(email):
        raise HTTPException(status_code=400, detail="Email is already registered")
        
    pw_hash, salt = hash_password(req.password)
    new_user = {
        "name": req.name.strip(),
        "email": email,
        "password_hash": pw_hash,
        "salt": salt,
        "role": "student",
        "roll_number": req.roll_number.strip() if req.roll_number else "N/A",
        "created_at": int(time.time())
    }
    db.add_user(new_user)
    
    token = generate_token(new_user)
    return {
        "token": token,
        "user": {
            "name": new_user["name"],
            "email": new_user["email"],
            "role": new_user["role"],
            "roll_number": new_user["roll_number"]
        }
    }

@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    if not verify_password(req.password, user["password_hash"], user["salt"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    token = generate_token(user)
    return {
        "token": token,
        "user": {
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "roll_number": user["roll_number"]
        }
    }

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}

@app.get("/api/users")
def get_users(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    return {"users": db.get_users()}


# Item management endpoints (Auth restricted)
@app.post("/api/items/{filename}/status")
def update_item_status(filename: str, req: StatusRequest, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "guard"]:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    updated = db.update_item_status(filename, req.status, req.claimed_by, req.claimed_by_name, user["email"])
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Update memory metadata
    for item in matcher.metadata:
        if item["filename"] == filename:
            item["status"] = req.status
            item["claimed_by"] = req.claimed_by
            item["claimed_by_name"] = req.claimed_by_name
            item["handed_over_by"] = user["email"]
            break

    # Automatically waive off any 'lost' requests filed by this student
    if req.status == "claimed" and req.claimed_by:
        resolved_count = db.resolve_lost_requests(req.claimed_by)
        if resolved_count > 0:
            for item in matcher.metadata:
                if item.get("status") == "lost" and item.get("reported_by") == req.claimed_by:
                    item["status"] = "resolved"

    # We do not need to save matcher since we don't save metadata.json anymore
    # but let's just trigger sync
    storage.upload_data(BASE_DIR)
    return {"status": "success", "message": f"Item {filename} updated successfully"}

@app.delete("/api/items/{filename}")
def delete_item(filename: str, user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can delete items")
        
    idx_to_remove = -1
    for i, item in enumerate(matcher.metadata):
        if item["filename"] == filename:
            idx_to_remove = i
            break
            
    if idx_to_remove == -1:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Delete file
    file_path = os.path.join(FOUND_DIR, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")
            
    # Remove from DB and memory
    db.delete_item(filename)
    matcher.metadata.pop(idx_to_remove)
    
    # Rebuild FAISS index
    matcher.rebuild_index(BASE_DIR)
            
    matcher.save(path=BASE_DIR)
    storage.upload_data(BASE_DIR)
    return {"status": "success", "message": f"Item {filename} deleted successfully"}

# Lost & Found Core Operations (Requires Auth)
@app.post("/report-found")
async def report_found(
    file: UploadFile = File(...),
    location: str = Form(...),
    contact: str = Form(...),
    description: str = Form(""),
    category: str = Form(""),
    authorization: str = Header(None) # Optional check to attach reporter details
):
    try:
        # Resolve reporter
        reported_by = "anonymous"
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            payload = verify_token(token)
            if payload:
                reported_by = payload["email"]

        # Create directory if it doesn't exist
        os.makedirs(FOUND_DIR, exist_ok=True)
        
        # Save file with a safe name
        timestamp = int(time.time())
        safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
        save_path = os.path.join(FOUND_DIR, safe_filename)
        
        print(f"DEBUG: Saving reported item to: {os.path.abspath(save_path)}")
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        file_size = os.path.getsize(save_path)
        print(f"DEBUG: File saved successfully. Size: {file_size} bytes")
        
        print(f"DEBUG: Adding to matcher...")
        matcher.add_found_item(save_path, location, contact, description, category)
        
        # Attach additional fields in memory
        matcher.metadata[-1]["status"] = "held"
        matcher.metadata[-1]["timestamp"] = timestamp
        matcher.metadata[-1]["reported_by"] = reported_by
        matcher.metadata[-1]["claimed_by"] = None
        matcher.metadata[-1]["claimed_by_name"] = None
        
        # Save to DB
        db.add_item(matcher.metadata[-1])
        matcher.save(path=BASE_DIR)
        
        # Persist to Hugging Face Hub
        storage.upload_data(BASE_DIR)
        
        print(f"DEBUG: Report success")
        return {"status": "success", "filename": safe_filename}
    except Exception as e:
        print(f"CRITICAL ERROR in report_found: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/report-lost")
async def report_lost(
    location: str = Form(...),
    contact: str = Form(...),
    description: str = Form(""),
    category: str = Form(""),
    file: UploadFile = File(None),
    authorization: str = Header(None)
):
    try:
        reported_by = "anonymous"
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            payload = verify_token(token)
            if payload:
                reported_by = payload["email"]

        os.makedirs(LOST_DIR, exist_ok=True)
        
        timestamp = int(time.time())
        save_path = None
        
        if file and file.filename:
            safe_filename = f"lost_{timestamp}_{file.filename.replace(' ', '_')}"
            save_path = os.path.join(LOST_DIR, safe_filename)
            with open(save_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        matcher.add_found_item(save_path, location, contact, description, category)
        
        matcher.metadata[-1]["status"] = "lost"
        matcher.metadata[-1]["timestamp"] = timestamp
        matcher.metadata[-1]["reported_by"] = reported_by
        matcher.metadata[-1]["claimed_by"] = None
        matcher.metadata[-1]["claimed_by_name"] = None
        
        db.add_item(matcher.metadata[-1])
        matcher.save(path=BASE_DIR)
        
        storage.upload_data(BASE_DIR)
        
        return {"status": "success", "filename": matcher.metadata[-1]["filename"]}
    except Exception as e:
        print(f"CRITICAL ERROR in report_lost: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/search-lost")
async def search_lost(
    file: UploadFile = File(None),
    text_query: str = Form(""),
    authorization: str = Header(None) # check token
):
    # Enforce authentication for search
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    
    if not token or not verify_token(token):
         raise HTTPException(status_code=401, detail="Authentication required to perform search")

    try:
        os.makedirs(LOST_DIR, exist_ok=True)
        results = []
        
        if text_query and text_query.strip():
            print(f"DEBUG: Searching by text: {text_query}")
            results = matcher.find_matches_by_text(text_query)
        elif file and file.filename:
            save_path = os.path.join(LOST_DIR, file.filename)
            print(f"DEBUG: Saving search query image to {save_path}")
            with open(save_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            results = matcher.find_matches_by_image(save_path)
        else:
            return JSONResponse(status_code=400, content={"error": "Provide image or text"})
        
        # Filter results: only active/held/disputed items, don't show claimed items to student
        # Also do not show items with status "lost" (reported lost by someone)
        user_payload = verify_token(token)
        is_student = user_payload and user_payload["role"] == "student"
        
        if is_student:
            results = [r for r in results if r.get("status", "held") not in ["claimed", "lost"]]
        else:
            results = [r for r in results if r.get("status", "held") != "lost"]
            
        print(f"DEBUG: Found {len(results)} matches")
        return {"matches": results}
    except Exception as e:
        print(f"CRITICAL ERROR in search_lost: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

# ---- Chatbot endpoint ----
@app.post("/api/chat")
def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    try:
        return chatbot.answer(req.message, req.history, matcher.metadata, user)
    except Exception as e:
        print(f"CHATBOT ERROR: {e}")
        return {"reply": "Sorry, something went wrong. Please try again.", "items": [], "suggestions": []}

@app.get("/all-found")
def all_found(authorization: str = Header(None)):
    # Optional filtering: Students only see non-claimed items by default unless they are admin/guard
    is_privileged = False
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = verify_token(token)
        if payload and payload["role"] in ["admin", "guard"]:
            is_privileged = True
            
    items = matcher.metadata
    if not is_privileged:
        items = [i for i in items if i.get("status", "held") not in ["claimed", "resolved"]]
    else:
        items = [i for i in items if i.get("status", "held") != "resolved"]
        
    return JSONResponse({"items": items, "total": len(items)})

# Serve single page React app for all other routes (SPA routing support)
@app.get("/{catchall:path}", response_class=HTMLResponse)
def serve_spa(catchall: str):
    # Bypass API routes
    if catchall.startswith("api/") or catchall.startswith("found_items/") or catchall.startswith("static/") or catchall.startswith("assets/"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})
        
    # 1. Try to serve from built dist directory (Production)
    dist_index = os.path.join(FRONTEND_DIR, "dist", "index.html")
    if os.path.exists(dist_index):
        with open(dist_index, encoding="utf-8") as f:
            return f.read()
            
    # 2. Try to serve from source directory (Development fallback)
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            return f.read()
            
    # Fallback status page for backend-only deployments (like Hugging Face Spaces)
    return HTMLResponse(
        """
        <html>
            <head>
                <title>Findora - Backend API</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h1 { color: #6366f1; }
                    p { font-size: 1.1em; line-height: 1.6; }
                    .url { font-weight: bold; color: #d11a2a; word-break: break-all; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Findora API is Online ⚡</h1>
                    <p>This Hugging Face Space hosts only the **Backend API services**.</p>
                    <p>To use the application, please open the <strong>Vercel Frontend URL</strong> instead.</p>
                </div>
            </body>
        </html>
        """,
        status_code=200
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)