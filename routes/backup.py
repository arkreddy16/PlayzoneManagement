from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
from services.backup_service import (
    create_backup, list_backups, restore_backup, 
    restore_from_buffer, delete_backup, get_backup_path, cleanup_old_backups
)

backup_bp = Blueprint('backup', __name__)

def get_current_user_data():
    """Get current user data from JWT identity"""
    identity = get_jwt_identity()
    if isinstance(identity, str):
        try:
            return json.loads(identity)
        except:
            return {}
    return identity if identity else {}

def admin_required(f):
    """Decorator to require admin role"""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        user_data = get_current_user_data()
        if user_data.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

@backup_bp.route('/create', methods=['POST'])
@jwt_required()
@admin_required
def create_backup_route():
    try:
        result = create_backup()
        return jsonify({
            'message': 'Backup created successfully',
            **result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@backup_bp.route('/list', methods=['GET'])
@jwt_required()
@admin_required
def list_backups_route():
    try:
        backups = list_backups()
        return jsonify(backups)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@backup_bp.route('/download/<filename>', methods=['GET'])
@jwt_required()
@admin_required
def download_backup(filename):
    # Validate filename
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400
    
    backup_path = get_backup_path(filename)
    if not backup_path:
        return jsonify({'error': 'Backup not found'}), 404
    
    return send_file(backup_path, as_attachment=True, download_name=filename)

@backup_bp.route('/restore/<filename>', methods=['POST'])
@jwt_required()
@admin_required
def restore_backup_route(filename):
    # Validate filename
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400
    
    try:
        result = restore_backup(filename)
        return jsonify({
            'message': 'Backup restored successfully',
            **result
        })
    except FileNotFoundError:
        return jsonify({'error': 'Backup not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@backup_bp.route('/restore-upload', methods=['POST'])
@jwt_required()
@admin_required
def restore_upload():
    if 'backup' not in request.files:
        return jsonify({'error': 'No backup file uploaded'}), 400
    
    file = request.files['backup']
    if not file.filename.endswith('.zip'):
        return jsonify({'error': 'Only ZIP files are allowed'}), 400
    
    try:
        result = restore_from_buffer(file.read())
        return jsonify({
            'message': 'Backup restored successfully',
            **result
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@backup_bp.route('/<filename>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_backup_route(filename):
    # Validate filename
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400
    
    try:
        delete_backup(filename)
        return jsonify({'message': 'Backup deleted successfully'})
    except FileNotFoundError:
        return jsonify({'error': 'Backup not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@backup_bp.route('/cleanup', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_backups():
    data = request.get_json() or {}
    keep_count = data.get('keepCount', 7)
    
    try:
        result = cleanup_old_backups(keep_count)
        return jsonify({
            'message': 'Cleanup completed',
            **result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
