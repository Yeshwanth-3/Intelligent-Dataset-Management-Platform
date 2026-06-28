import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv('DATABASE_URL')
engine = create_engine(database_url)

def check_columns():
    inspector = inspect(engine)
    columns = inspector.get_columns('users')
    print("Columns in 'users' table:")
    for column in columns:
        print(f"- {column['name']} ({column['type']})")

if __name__ == "__main__":
    check_columns()
