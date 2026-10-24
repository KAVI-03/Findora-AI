import os

with open("backend/main.py", "r") as f:
    content = f.read()

# Add database import
content = content.replace("from storage_manager import StorageManager", 
"""from storage_manager import StorageManager
from database import DatabaseManager""")

# Initialize database
content = content.replace("storage = StorageManager()",
"""storage = StorageManager()
db = DatabaseManager(os.path.join(BASE_DIR, "database.db"))""")

# Replace load_users and save_users definition
users_helper_def = """# User Database Helper functions
def load_users() -> list:
    if not os.path.exists(USERS_FILE):
        users = []
        roles = ["student", "guard", "admin"]
        for role in roles:
            pw_hash, salt = hash_password(f"{role}123")
            users.append({
                "name": f"Demo {role.capitalize()}",
                "email": f"{role}@iiitd.ac.in",
                "password_hash": pw_hash,
                "salt": salt,
                "role": role,
                "roll_number": "2023504" if role == "student" else "N/A",
                "created_at": int(time.time())
            })
        with open(USERS_FILE, "w") as f:
            json.dump(users, f)
        return users
    try:
        with open(USERS_FILE) as f:
            return json.load(f)
    except Exception:
        return []

def save_users(users: list):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f)"""

new_users_helper_def = """# User Database Helper functions
def ensure_default_users():
    users = db.get_users()
    if not users:
        roles = ["student", "guard", "admin"]
        for role in roles:
            pw_hash, salt = hash_password(f"{role}123")
            db.add_user({
                "name": f"Demo {role.capitalize()}",
                "email": f"{role}@iiitd.ac.in",
                "password_hash": pw_hash,
                "salt": salt,
                "role": role,
                "roll_number": "2023504" if role == "student" else "N/A",
                "created_at": int(time.time())
            })"""

content = content.replace(users_helper_def, new_users_helper_def)


# Startup event
startup_def = """@app.on_event("startup")
async def startup_event():
    print("="*50)
    print("404 FOUND BACKEND STARTING")
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"FOUND_DIR: {FOUND_DIR}")
    
    # Load and seed users
    users = load_users()
    print(f"Registered Users count: {len(users)}")
    
    # Normalize existing item metadata fields
    modified = False
    for item in matcher.metadata:
        if "status" not in item:
            item["status"] = "held"
            modified = True
        if "timestamp" not in item:
            item["timestamp"] = int(time.time())
            modified = True
        if "reported_by" not in item:
            item["reported_by"] = "anonymous"
            modified = True
        if "claimed_by" not in item:
            item["claimed_by"] = None
            modified = True
        if "claimed_by_name" not in item:
            item["claimed_by_name"] = None
            modified = True
            
    if modified:
        print("Normalized item metadata fields for backwards compatibility.")
        matcher.save(path=BASE_DIR)
        
    print(f"Items currently in database: {len(matcher.metadata)}")
    print("="*50)"""

new_startup_def = """@app.on_event("startup")
async def startup_event():
    print("="*50)
    print("404 FOUND BACKEND STARTING")
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
    
    if pruned:
        print("Items pruned. Rebuilding FAISS index...")
        import faiss
        matcher.index = faiss.IndexFlatIP(768)
        for item in matcher.metadata:
            path = os.path.join(FOUND_DIR, item["filename"])
            if os.path.exists(path):
                emb = matcher.get_embedding(path)
                matcher.index.add(emb)
        matcher.save(path=BASE_DIR)
        storage.upload_data(BASE_DIR)
        
    print(f"Items currently in database: {len(matcher.metadata)}")
    print("="*50)"""

content = content.replace(startup_def, new_startup_def)

# Register
register_def = """@app.post("/api/auth/register")
def register(req: RegisterRequest):
    users = load_users()
    email = req.email.strip().lower()
    
    # Check duplicate email
    if any(u["email"] == email for u in users):
        raise HTTPException(status_code=400, detail="Email is already registered")
        
    pw_hash, salt = hash_password(req.password)
    new_user = {
        "name": req.name.strip(),
        "email": email,
        "password_hash": pw_hash,
        "salt": salt,
        "role": req.role.strip() if req.role in ["student", "guard", "admin"] else "student",
        "roll_number": req.roll_number.strip() if req.roll_number else "N/A",
        "created_at": int(time.time())
    }
    users.append(new_user)
    save_users(users)"""

new_register_def = """@app.post("/api/auth/register")
def register(req: RegisterRequest):
    email = req.email.strip().lower()
    
    if db.get_user_by_email(email):
        raise HTTPException(status_code=400, detail="Email is already registered")
        
    pw_hash, salt = hash_password(req.password)
    new_user = {
        "name": req.name.strip(),
        "email": email,
        "password_hash": pw_hash,
        "salt": salt,
        "role": req.role.strip() if req.role in ["student", "guard", "admin"] else "student",
        "roll_number": req.roll_number.strip() if req.roll_number else "N/A",
        "created_at": int(time.time())
    }
    db.add_user(new_user)"""

content = content.replace(register_def, new_register_def)

# Login
login_def = """@app.post("/api/auth/login")
def login(req: LoginRequest):
    users = load_users()
    email = req.email.strip().lower()
    
    user = next((u for u in users if u["email"] == email), None)"""

new_login_def = """@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    
    user = db.get_user_by_email(email)"""
content = content.replace(login_def, new_login_def)

# Users
users_def = """@app.get("/api/users")
def get_users(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    return {"users": load_users()}"""
new_users_def = """@app.get("/api/users")
def get_users(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    return {"users": db.get_users()}"""
content = content.replace(users_def, new_users_def)


# update_item_status
update_status_def = """@app.post("/api/items/{filename}/status")
def update_item_status(filename: str, req: StatusRequest, user: dict = Depends(get_current_user)):
    if user["role"] not in ["admin", "guard"]:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    item_found = False
    for item in matcher.metadata:
        if item["filename"] == filename:
            item["status"] = req.status
            item["claimed_by"] = req.claimed_by
            item["claimed_by_name"] = req.claimed_by_name
            item["handed_over_by"] = user["email"]
            item_found = True
            break
            
    if not item_found:
        raise HTTPException(status_code=404, detail="Item not found")
        
    matcher.save(path=BASE_DIR)
    storage.upload_data(BASE_DIR)
    return {"status": "success", "message": f"Item {filename} updated successfully"}"""

new_update_status_def = """@app.post("/api/items/{filename}/status")
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

    # We do not need to save matcher since we don't save metadata.json anymore
    # but let's just trigger sync
    storage.upload_data(BASE_DIR)
    return {"status": "success", "message": f"Item {filename} updated successfully"}"""
content = content.replace(update_status_def, new_update_status_def)

# delete_item
delete_item_def = """    # Remove from metadata
    matcher.metadata.pop(idx_to_remove)
    
    # Rebuild FAISS index
    import faiss
    matcher.index = faiss.IndexFlatIP(768)
    for item in matcher.metadata:
        path = os.path.join(FOUND_DIR, item["filename"])
        if os.path.exists(path):
            emb = matcher.get_embedding(path)
            matcher.index.add(emb)
            
    matcher.save(path=BASE_DIR)
    storage.upload_data(BASE_DIR)
    return {"status": "success", "message": f"Item {filename} deleted successfully"}"""

new_delete_item_def = """    # Remove from DB and memory
    db.delete_item(filename)
    matcher.metadata.pop(idx_to_remove)
    
    # Rebuild FAISS index
    import faiss
    matcher.index = faiss.IndexFlatIP(768)
    for item in matcher.metadata:
        path = os.path.join(FOUND_DIR, item["filename"])
        if os.path.exists(path):
            emb = matcher.get_embedding(path)
            matcher.index.add(emb)
            
    matcher.save(path=BASE_DIR)
    storage.upload_data(BASE_DIR)
    return {"status": "success", "message": f"Item {filename} deleted successfully"}"""
content = content.replace(delete_item_def, new_delete_item_def)


# report_found
report_found_def = """        # Attach additional fields
        matcher.metadata[-1]["status"] = "held"
        matcher.metadata[-1]["timestamp"] = timestamp
        matcher.metadata[-1]["reported_by"] = reported_by
        matcher.metadata[-1]["claimed_by"] = None
        matcher.metadata[-1]["claimed_by_name"] = None
        
        matcher.save(path=BASE_DIR)
        
        # Persist to Hugging Face Hub
        storage.upload_data(BASE_DIR)"""
new_report_found_def = """        # Attach additional fields in memory
        matcher.metadata[-1]["status"] = "held"
        matcher.metadata[-1]["timestamp"] = timestamp
        matcher.metadata[-1]["reported_by"] = reported_by
        matcher.metadata[-1]["claimed_by"] = None
        matcher.metadata[-1]["claimed_by_name"] = None
        
        # Save to DB
        db.add_item(matcher.metadata[-1])
        matcher.save(path=BASE_DIR)
        
        # Persist to Hugging Face Hub
        storage.upload_data(BASE_DIR)"""
content = content.replace(report_found_def, new_report_found_def)

with open("backend/main.py", "w") as f:
    f.write(content)
