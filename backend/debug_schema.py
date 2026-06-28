from src import create_app
from src.models import db, User
import sqlalchemy as sa

app = create_app('dev')
with app.app_context():
    inspect = sa.inspect(db.engine)
    columns = [c['name'] for c in inspect.get_columns('users')]
    print(f"Columns in 'users' table: {columns}")
