import sqlite3
import os
import json
import time

class DatabaseManager:
    def __init__(self, db_path):
        self.db_path = db_path
        self._init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Create users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    role TEXT NOT NULL,
                    roll_number TEXT,
                    created_at INTEGER NOT NULL
                )
            """)
            # Create items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT UNIQUE NOT NULL,
                    location TEXT NOT NULL,
                    contact TEXT NOT NULL,
                    description TEXT,
                    category TEXT,
                    status TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    reported_by TEXT NOT NULL,
                    claimed_by TEXT,
                    claimed_by_name TEXT,
                    handed_over_by TEXT
                )
            """)
            conn.commit()

    def migrate_from_json(self, users_file, metadata_file):
        """Migrate existing data from JSON if the DB is empty."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if users exist
            cursor.execute("SELECT COUNT(*) FROM users")
            if cursor.fetchone()[0] == 0 and os.path.exists(users_file):
                print("Migrating users from JSON to SQLite...")
                with open(users_file, "r") as f:
                    try:
                        users = json.load(f)
                        for u in users:
                            cursor.execute("""
                                INSERT INTO users (name, email, password_hash, salt, role, roll_number, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, (u["name"], u["email"], u["password_hash"], u["salt"], u["role"], u.get("roll_number", "N/A"), u["created_at"]))
                    except Exception as e:
                        print(f"Error migrating users: {e}")
            
            # Check if items exist
            cursor.execute("SELECT COUNT(*) FROM items")
            if cursor.fetchone()[0] == 0 and os.path.exists(metadata_file):
                print("Migrating items from JSON to SQLite...")
                with open(metadata_file, "r") as f:
                    try:
                        items = json.load(f)
                        for i in items:
                            cursor.execute("""
                                INSERT INTO items (filename, location, contact, description, category, status, timestamp, reported_by, claimed_by, claimed_by_name, handed_over_by)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                i["filename"], i["location"], i["contact"], i.get("description", ""), i.get("category", ""),
                                i.get("status", "held"), i.get("timestamp", int(time.time())), i.get("reported_by", "anonymous"),
                                i.get("claimed_by"), i.get("claimed_by_name"), i.get("handed_over_by")
                            ))
                    except Exception as e:
                        print(f"Error migrating items: {e}")
                        
            conn.commit()

    # --- User operations ---
    def get_users(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            return [dict(row) for row in cursor.fetchall()]

    def get_user_by_email(self, email):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def add_user(self, user_dict):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (name, email, password_hash, salt, role, roll_number, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_dict["name"], user_dict["email"], user_dict["password_hash"], user_dict["salt"], user_dict["role"], user_dict["roll_number"], user_dict["created_at"]))
            conn.commit()

    # --- Item operations ---
    def get_items(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM items ORDER BY id ASC")
            return [dict(row) for row in cursor.fetchall()]

    def get_item_by_filename(self, filename):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM items WHERE filename = ?", (filename,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def add_item(self, item_dict):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO items (filename, location, contact, description, category, status, timestamp, reported_by, claimed_by, claimed_by_name, handed_over_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item_dict["filename"], item_dict["location"], item_dict["contact"], item_dict.get("description", ""), item_dict.get("category", ""),
                item_dict.get("status", "held"), item_dict.get("timestamp", int(time.time())), item_dict.get("reported_by", "anonymous"),
                item_dict.get("claimed_by"), item_dict.get("claimed_by_name"), item_dict.get("handed_over_by")
            ))
            conn.commit()

    def update_item_status(self, filename, status, claimed_by, claimed_by_name, handed_over_by):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE items
                SET status = ?, claimed_by = ?, claimed_by_name = ?, handed_over_by = ?
                WHERE filename = ?
            """, (status, claimed_by, claimed_by_name, handed_over_by, filename))
            conn.commit()
            return cursor.rowcount > 0

    def resolve_lost_requests(self, student_email):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE items
                SET status = 'resolved'
                WHERE reported_by = ? AND status = 'lost'
            """, (student_email,))
            conn.commit()
            return cursor.rowcount

    def delete_item(self, filename):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM items WHERE filename = ?", (filename,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_items_by_filenames(self, filenames):
        if not filenames:
            return
        with self.get_connection() as conn:
            cursor = conn.cursor()
            placeholders = ','.join('?' for _ in filenames)
            cursor.execute(f"DELETE FROM items WHERE filename IN ({placeholders})", tuple(filenames))
            conn.commit()
