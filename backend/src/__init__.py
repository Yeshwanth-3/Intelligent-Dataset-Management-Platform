from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from src.models import db
from src.routes import api
from config import config_by_name

def create_app(config_name='dev'):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    
    CORS(app)
    db.init_app(app)
    JWTManager(app)
    
    app.register_blueprint(api, url_prefix='/api')

    @app.route('/')
    def index():
        return {"message": "DataRefine Backend API is Running", "status": "online"}, 200
    
    with app.app_context():
        # In a real app, use migrations. Here we just create tables.
        db.create_all()
        
    return app
