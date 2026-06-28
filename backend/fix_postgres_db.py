import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("DATABASE_URL not found in .env")
    exit(1)

# SQLAlchemy engine
engine = create_engine(database_url)

def add_column():
    with engine.connect() as conn:
        print("Checking for column 'profession' in 'users' table...")
        try:
            # We use text() to wrap the raw SQL
            conn.execute(text("ALTER TABLE users ADD COLUMN profession VARCHAR(100)"))
            conn.commit()
            print("Successfully added column 'profession' to 'users' table.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("Column 'profession' already exists.")
            else:
                print(f"An error occurred: {e}")

if __name__ == "__main__":
    add_column()
