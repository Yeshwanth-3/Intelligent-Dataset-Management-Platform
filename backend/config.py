import os
from dotenv import load_dotenv

load_dotenv()



class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev_secret_key_12345'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://postgres:password@localhost:5432/dataset_platform'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt_super_secret_key'
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'data', 'uploads')
    PROCESSED_FOLDER = os.path.join(os.getcwd(), 'data', 'processed')
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB limit

    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config_by_name = {
    'dev': DevelopmentConfig,
    'prod': ProductionConfig
}
