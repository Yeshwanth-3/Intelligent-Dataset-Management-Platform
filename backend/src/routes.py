from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from src.models import db, User, Dataset, DatasetVersion, AuditLog, ValidationRule
from src.services import DataProcessor
import os
import uuid
from datetime import datetime

api = Blueprint('api', __name__)

# --- Auth Routes ---
@api.route('/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'message': 'Username already exists'}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Email already exists'}), 400
        
        user = User(
            username=data['username'], 
            email=data['email'], 
            password_hash=data['password'],
            profession=data.get('profession', 'Data Analyst')
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Registration Error: {str(e)}")
        return jsonify({'message': f"Registration failed: {str(e)}"}), 500

@api.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    # Support both username and email login
    user = User.query.filter(
        (User.username == data['username']) | (User.email == data['username'])
    ).filter(User.password_hash == data['password']).first()
    
    if not user:
        return jsonify({'message': 'Invalid credentials'}), 401
    
    # Ensure identity is a string to avoid JSON serialization issues in some JWT versions
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()})

@api.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        # For security, we might want to return the same message even if user doesn't exist
        # but for this app's UX, we'll be direct.
        return jsonify({'message': 'Email not found'}), 404
        
    # Simulate sending email
    return jsonify({
        'message': f'A password reset link has been sent to {email}. (Note: This is a simulation, in a real app check your inbox!)'
    })

@api.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    # --- Calculate User Stats ---
    datasets = Dataset.query.filter_by(user_id=user.id).all()
    dataset_count = len(datasets)
    
    total_rows = 0
    total_health = 0
    valid_datasets = 0
    
    for ds in datasets:
        # Get latest version for each dataset
        latest_version = DatasetVersion.query.filter_by(dataset_id=ds.id).order_by(DatasetVersion.version_number.desc()).first()
        if latest_version:
            total_rows += (latest_version.rows_count or 0)
            if latest_version.health_score is not None:
                total_health += latest_version.health_score
                valid_datasets += 1

    avg_health = 0
    if valid_datasets > 0:
        avg_health = round(total_health / valid_datasets, 1)

    user_data = user.to_dict()
    user_data['stats'] = {
        'dataset_count': dataset_count,
        'rows_cleaned': total_rows,
        'avg_health': avg_health
    }
    
    return jsonify({'user': user_data})

# --- Dataset Routes ---
@api.route('/datasets/upload', methods=['POST'])
@jwt_required()
def upload_dataset():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    user_id = get_jwt_identity()
    print(f"DEBUG: JWT Identity received: {user_id} (Type: {type(user_id)})")
    
    if not user_id:
         return jsonify({'error': 'Token missing identity payload'}), 422
         
    try:
        user_id = int(str(user_id))
    except ValueError:
        return jsonify({'error': f'Invalid user ID format: {user_id}'}), 422

    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_name)
    
    try:
        os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
        file.save(file_path)
        
        dataset = Dataset(
            name=filename,
            description=request.form.get('description', ''),
            file_type=filename.split('.')[-1],
            user_id=user_id
        )
        db.session.add(dataset)
        db.session.flush() # Get ID

        # Custom Rules (Check for Global Rules on initial upload)
        rules = ValidationRule.query.filter_by(dataset_id=None, is_active=True).all()
        rule_dicts = [r.to_dict() for r in rules]

        # Initial Analysis
        processor = DataProcessor(file_path)
        metadata = processor.get_metadata()
        errors = processor.detect_errors(rules=rule_dicts)
        health_score = processor.calculate_health_score(errors)
        
        version = DatasetVersion(
            dataset_id=dataset.id,
            version_number=1,
            file_path=file_path,
            health_score=health_score,
            rows_count=metadata['rows'],
            columns_count=len(metadata['columns']),
            error_summary=errors,
            change_log="Initial Upload"
        )
        db.session.add(version)
        db.session.commit()


        
        return jsonify({'message': 'Dataset uploaded', 'dataset': dataset.to_dict(), 'version': version.to_dict()})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@api.route('/datasets/stage', methods=['POST'])
@jwt_required()
def stage_dataset():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_name)
    
    try:
        os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
        file.save(file_path)
        
        # Lightweight Preview Only - NO DB Writes
        processor = DataProcessor(file_path)
        preview = processor.get_preview(limit=5)
        metadata = processor.get_metadata()
        
        return jsonify({
            'temp_id': unique_name,
            'filename': filename,
            'preview': preview,
            'metadata': metadata
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api.route('/datasets/confirm', methods=['POST'])
@jwt_required()
def confirm_dataset():
    data = request.get_json()
    temp_id = data.get('temp_id')
    
    if not temp_id:
        return jsonify({'error': 'Temp ID required'}), 400
        
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], temp_id)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Staged file expired or not found'}), 404
        
    user_id = get_jwt_identity()
    try: user_id = int(str(user_id))
    except: pass

    try:
        # Original Filename extraction (rough reverse of unique_name logic)
        # uuid is 36 chars + 1 underscore = 37
        original_filename = temp_id[37:] 
        
        dataset = Dataset(
            name=original_filename,
            description=data.get('description', ''),
            file_type=original_filename.split('.')[-1],
            user_id=user_id
        )
        db.session.add(dataset)
        db.session.flush()

        rules = ValidationRule.query.filter_by(dataset_id=None, is_active=True).all()
        rule_dicts = [r.to_dict() for r in rules]

        # Full Analysis
        processor = DataProcessor(file_path)
        metadata = processor.get_metadata()
        errors = processor.detect_errors(rules=rule_dicts)
        health_score = processor.calculate_health_score(errors)
        
        version = DatasetVersion(
            dataset_id=dataset.id,
            version_number=1,
            file_path=file_path,
            health_score=health_score,
            rows_count=metadata['rows'],
            columns_count=len(metadata['columns']),
            error_summary=errors,
            change_log="Initial Upload"
        )
        db.session.add(version)
        db.session.commit()
        
        return jsonify({'message': 'Dataset confirmed', 'dataset': dataset.to_dict(), 'version': version.to_dict()})
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api.route('/datasets/<int:id>/versions', methods=['GET'])
@jwt_required()
def get_versions(id):
    versions = DatasetVersion.query.filter_by(dataset_id=id).order_by(DatasetVersion.version_number.desc()).limit(10).all()
    return jsonify([v.to_dict() for v in versions])

@api.route('/datasets/<int:id>/history', methods=['GET'])
@jwt_required()
def get_history(id):
    versions = DatasetVersion.query.filter_by(dataset_id=id).order_by(DatasetVersion.version_number.desc()).all()
    return jsonify([v.to_dict() for v in versions])

@api.route('/datasets/version/<int:vid>/preview', methods=['GET'])
@jwt_required()
def get_preview(vid):
    version = DatasetVersion.query.get_or_404(vid)
    rules = ValidationRule.query.filter_by(dataset_id=version.dataset_id, is_active=True).all()
    rule_dicts = [r.to_dict() for r in rules]

    processor = DataProcessor(version.file_path)
    return jsonify({
        'preview': processor.get_preview(),
        'distributions': processor.get_numeric_distributions(processor.df),
        'problem_rows': processor.get_problematic_samples(rules=rule_dicts),
        'metadata': processor.get_metadata(),
        'errors': version.error_summary,
        'health_score': version.health_score,
        'rules': rule_dicts
    })


@api.route('/datasets/version/<int:vid>/clean', methods=['POST'])
@jwt_required()
def clean_dataset(vid):
    version = DatasetVersion.query.get_or_404(vid)
    data = request.get_json()
    strategies = data.get('strategies', data) # Support both legacy and engine-aware formats
    engine_mode = data.get('engine', 'standard')
    is_hybrid = engine_mode == 'hybrid'
    
    print(f"DEBUG: Starting clean for version {vid} with engine: {engine_mode}")

    try:
        rules = ValidationRule.query.filter_by(dataset_id=version.dataset_id, is_active=True).all()
        rule_dicts = [r.to_dict() for r in rules]

        processor = DataProcessor(version.file_path)
        # Pass hybrid parameter
        _, distributions = processor.rectify_errors(strategies, rules=rule_dicts, hybrid=is_hybrid)

        
        # Save new version
        # Save new version (Preserve Original Extension)
        original_ext = os.path.splitext(version.file_path)[1]
        new_filename = f"cleaned_v{version.version_number + 1}_{os.path.basename(version.file_path)}"
        if not new_filename.endswith(original_ext): 
             # Ensure extension is preserved if logic messes up
             new_filename = os.path.splitext(new_filename)[0] + original_ext
        new_path = os.path.join(current_app.config['PROCESSED_FOLDER'], new_filename)
        os.makedirs(current_app.config['PROCESSED_FOLDER'], exist_ok=True)
        
        print(f"DEBUG: Saving processed file to {new_path}")
        processor.save_processed(new_path)
        
        # Re-analyze
        print("DEBUG: Re-analyzing dataset...")
        new_errors = processor.detect_errors(rules=rule_dicts)
        new_score = processor.calculate_health_score(new_errors)

        
        new_version = DatasetVersion(
            dataset_id=version.dataset_id,
            version_number=version.version_number + 1,
            file_path=new_path,
            health_score=new_score,
            rows_count=len(processor.df),
            columns_count=len(processor.df.columns),
            error_summary=new_errors,
            change_log="Auto Clean Applied"
        )
        db.session.add(new_version)
        db.session.commit()
        
        print("DEBUG: Clean complete, returning response.")
        return jsonify({
            'message': 'Dataset cleaned',
            'version': new_version.to_dict(),
            'distributions': distributions # Return stats for visualization
        })
    except Exception as e:
        import traceback
        print(f"ERROR in clean_dataset: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@api.route('/datasets/version/<int:vid>/download', methods=['GET'])
def download_dataset(vid):
    # Depending on requirements, might need auth token in query param or header
    # For simplicity assuming protected or public url logic
    version = DatasetVersion.query.get_or_404(vid)
    filename = os.path.basename(version.file_path)
    return send_file(version.file_path, as_attachment=True, download_name=filename)

@api.route('/datasets/version/<int:vid>/report', methods=['GET'])
def download_report(vid):
    """Generates and downloads a PDF report comparing this version to the original."""
    try:
        current_version = DatasetVersion.query.get_or_404(vid)
        
        # Find original version (v1)
        original_version = DatasetVersion.query.filter_by(
            dataset_id=current_version.dataset_id, 
            version_number=1
        ).first()

        if not original_version:
             original_version = current_version # Fallback

        print(f"DEBUG: Generating report comparing v{current_version.version_number} vs v{original_version.version_number}")
        
        # Load Data
        proc_current = DataProcessor(current_version.file_path)
        proc_original = DataProcessor(original_version.file_path)
        
        # Generate PDF path
        report_filename = f"report_v{current_version.version_number}.pdf"
        report_path = os.path.join(current_app.config['PROCESSED_FOLDER'], report_filename)
        
        proc_current.generate_pdf_report(proc_original.df, report_path)
        
        return send_file(
            report_path, 
            as_attachment=True, 
            download_name=report_filename,
            mimetype='application/pdf',
            max_age=0
        )
    except Exception as e:
        import traceback
        print(f"ERROR generating report: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api.route('/datasets/version/<int:vid>/correlation', methods=['GET'])
def get_correlation_heatmap(vid):
    try:
        version = DatasetVersion.query.get_or_404(vid)
        processor = DataProcessor(version.file_path)
        
        img_bytes = processor.get_correlation_heatmap()
        
        if not img_bytes:
            return jsonify({'error': 'Not enough numeric columns for correlation analysis (need at least 2)'}), 400
            
        return send_file(
            img_bytes,
            mimetype='image/png',
            as_attachment=False,
            download_name='correlation_heatmap.png'
        )
    except Exception as e:
        print(f"ERROR in get_correlation_heatmap: {e}")
        return jsonify({'error': str(e)}), 500

@api.route('/datasets/version/<int:vid>/audit', methods=['GET'])
@jwt_required()
def get_audit_report(vid):
    try:
        current_version = DatasetVersion.query.get_or_404(vid)
        original_version = DatasetVersion.query.filter_by(
            dataset_id=current_version.dataset_id, 
            version_number=1
        ).first() or current_version

        proc_current = DataProcessor(current_version.file_path)
        proc_original = DataProcessor(original_version.file_path)
        
        report = proc_current.get_audit_report(proc_original.df)
        return jsonify(report)
    except Exception as e:
        import traceback
        print(f"ERROR audit: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api.route('/datasets/version/<int:vid>/chat', methods=['POST'])
@jwt_required()
def chat_with_version(vid):
    try:
        data = request.get_json()
        user_query = data.get('query')
        if not user_query:
            return jsonify({'error': 'Query is required'}), 400

        version = DatasetVersion.query.get_or_404(vid)
        
        # 1. Gather Metadata Context
        rules = ValidationRule.query.filter_by(dataset_id=version.dataset_id, is_active=True).all()
        
        # Build Context Package
        context = {
            'metadata': {
                'rows': version.rows_count,
                'columns': version.columns_count,
                'health_score': version.health_score,
                'version_number': version.version_number
            },
            'errors': version.error_summary,
            'rules_active': [r.name for r in rules],
            'change_log': version.change_log
        }
        
        # 2. Add Audit Log if available (for cleaned versions)
        if version.version_number > 1:
            try:
                original = DatasetVersion.query.filter_by(dataset_id=version.dataset_id, version_number=1).first()
                if original:
                    proc_current = DataProcessor(version.file_path)
                    proc_original = DataProcessor(original.file_path)
                    audit = proc_current.get_audit_report(proc_original.df)
                    context['recent_audit_metrics'] = audit['metrics']
            except:
                pass # Fail silently on audit if files missing

        # 3. Call AI
        processor = DataProcessor(version.file_path)
        answer = processor.chat_with_data(context, user_query)
        
        return jsonify({'answer': answer})

    except Exception as e:
        print(f"ERROR chat: {e}")
        return jsonify({'error': str(e)}), 500

# --- AI Features (Version 2) ---

@api.route('/datasets/version/<int:vid>/ai-suggestions', methods=['GET'])
@jwt_required()
def get_ai_suggestions(vid):
    try:
        print(f"DEBUG: Fetching AI insights for version {vid}")
        version = DatasetVersion.query.get_or_404(vid)
        print(f"DEBUG: File path: {version.file_path}")
        processor = DataProcessor(version.file_path)
        
        is_cleaned = "Clean" in (version.change_log or "")
        suggestion = processor.get_ai_insights(is_cleaned=is_cleaned)
        return jsonify({'suggestion': suggestion})

    except Exception as e:
        print(f"ERROR in get_ai_suggestions route: {e}")
        return jsonify({'error': str(e), 'suggestion': f"Error: {str(e)}"}), 500

@api.route('/datasets/version/<int:vid>/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations(vid):
    try:
        version = DatasetVersion.query.get_or_404(vid)
        dp = DataProcessor(version.file_path)
        metadata = dp.get_metadata()
        
        from src.llm_service import LLMService
        llm = LLMService()
        recs = llm.generate_recommendations(metadata)
        return jsonify(recs)
    except Exception as e:
        print(f"ERROR in get_recommendations: {e}")
        return jsonify({'error': str(e)}), 500

@api.route('/datasets/version/<int:vid>/detect-labels', methods=['POST'])
@jwt_required()
def detect_labels(vid):
    try:
        data = request.get_json()
        target_col = data.get('target_column')
        if not target_col:
            return jsonify({'error': 'Target column required'}), 400
            
        version = DatasetVersion.query.get_or_404(vid)
        processor = DataProcessor(version.file_path)
        
        result = processor.detect_label_issues(target_col)
        return jsonify(result)
        
    except Exception as e:
        print(f"ERROR: {e}")
        return jsonify({'error': str(e)}), 500

# --- Validation Rule CRUD ---

@api.route('/datasets/<int:dsid>/rules', methods=['GET'])
@jwt_required()
def get_rules(dsid):
    rules = ValidationRule.query.filter_by(dataset_id=dsid).all()
    return jsonify([r.to_dict() for r in rules])

@api.route('/datasets/<int:dsid>/rules', methods=['POST'])
@jwt_required()
def create_rule(dsid):
    data = request.get_json()
    rule = ValidationRule(
        dataset_id=dsid,
        name=data['name'],
        column_name=data['column_name'],
        operator=data['operator'],
        value=data['value'],
        severity=data.get('severity', 'error'),
        action=data.get('action', 'flag_only'),
        priority=data.get('priority', 0),
        condition_column=data.get('condition_column'),
        condition_operator=data.get('condition_operator'),
        condition_value=data.get('condition_value')
    )
    db.session.add(rule)
    db.session.commit()
    return jsonify(rule.to_dict()), 201

@api.route('/rules/<int:rid>', methods=['PUT'])
@jwt_required()
def update_rule(rid):
    rule = ValidationRule.query.get_or_404(rid)
    data = request.get_json()
    for key in ['name', 'column_name', 'operator', 'value', 'severity', 'action', 'priority', 'is_active', 'condition_column', 'condition_operator', 'condition_value']:
        if key in data:
            setattr(rule, key, data[key])
    db.session.commit()
    return jsonify(rule.to_dict())

@api.route('/rules/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_rule(rid):
    rule = ValidationRule.query.get_or_404(rid)
    db.session.delete(rule)
    db.session.commit()
    return jsonify({'message': 'Rule deleted'})

