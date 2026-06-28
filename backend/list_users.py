import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, username, email, password_hash FROM users"))
    users = result.fetchall()
    print("Existing Users:")
    for user in users:
        print(f"ID: {user[0]}, Username: {user[1]}, Email: {user[2]}, Password: {user[3]}")
