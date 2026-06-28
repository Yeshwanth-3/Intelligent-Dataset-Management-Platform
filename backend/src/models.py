from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    profession = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'profession': self.profession,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Dataset(db.Model):
    __tablename__ = 'datasets'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    file_type = db.Column(db.String(10))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    versions = db.relationship('DatasetVersion', backref='dataset', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'upload_date': self.upload_date.isoformat(),
            'file_type': self.file_type,
            'user_id': self.user_id
        }

class DatasetVersion(db.Model):
    __tablename__ = 'dataset_versions'
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    file_path = db.Column(db.String(255), nullable=False)
    health_score = db.Column(db.Float)
    rows_count = db.Column(db.Integer)
    columns_count = db.Column(db.Integer)
    error_summary = db.Column(db.JSON)  # Stores summary of errors (missing, duplicates, etc.)
    change_log = db.Column(db.String(255)) # Description of what changed in this version

    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'version_number': self.version_number,
            'created_at': self.created_at.isoformat(),
            'health_score': self.health_score,
            'rows': self.rows_count,
            'columns': self.columns_count,
            'error_summary': self.error_summary,
            'change_log': self.change_log
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    details = db.Column(db.Text)

class ValidationRule(db.Model):
    __tablename__ = 'validation_rules'
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=True) # Null for global
    name = db.Column(db.String(255), nullable=False)
    column_name = db.Column(db.String(100), nullable=False)
    operator = db.Column(db.String(50), nullable=False) # range, greater_than, less_than, contains, regex, equals
    value = db.Column(db.JSON, nullable=False) # Stores scalar or list [min, max]
    severity = db.Column(db.String(20), default='error') # info, warning, error, critical
    action = db.Column(db.String(20), default='flag_only') # hard_drop, flag_only, nullify
    priority = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    
    # Conditional logic
    condition_column = db.Column(db.String(100), nullable=True)
    condition_operator = db.Column(db.String(50), nullable=True)
    condition_value = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'name': self.name,
            'column_name': self.column_name,
            'operator': self.operator,
            'value': self.value,
            'severity': self.severity,
            'action': self.action,
            'priority': self.priority,
            'is_active': self.is_active,
            'condition_column': self.condition_column,
            'condition_operator': self.condition_operator,
            'condition_value': self.condition_value,
            'created_at': self.created_at.isoformat()
        }

