from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import bcrypt
import json
from services.csv_service import read_csv, write_csv, get_next_id, find_by_field, delete_row

users_bp = Blueprint('users', __name__)

USERS_FILE = 'users.csv'
HEADERS = ['id', 'username', 'password', 'role', 'fullName', 'email', 'createdAt', 'updatedAt']

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

@users_bp.route('/', methods=['GET'])
@jwt_required()
@admin_required
def get_users():
    users = read_csv(USERS_FILE)
    # Remove password from response
    return jsonify([{
        'id': u['id'],
        'username': u['username'],
        'role': u['role'],
        'fullName': u['fullName'],
        'email': u['email'],
        'createdAt': u['createdAt']
    } for u in users])

@users_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    full_name = data.get('fullName', '')
    email = data.get('email', '')
    
    if not username or not password or not role:
        return jsonify({'error': 'Username, password, and role are required'}), 400
    
    if role not in ['admin', 'store_manager']:
        return jsonify({'error': 'Invalid role. Must be admin or store_manager'}), 400
    
    # Check if username exists
    if find_by_field(USERS_FILE, 'username', username):
        return jsonify({'error': 'Username already exists'}), 400
    
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    now = datetime.now().isoformat()
    
    new_user = {
        'id': str(get_next_id(USERS_FILE)),
        'username': username,
        'password': hashed_password,
        'role': role,
        'fullName': full_name,
        'email': email,
        'createdAt': now,
        'updatedAt': now
    }
    
    users = read_csv(USERS_FILE)
    users.append(new_user)
    write_csv(USERS_FILE, users, HEADERS)
    
    return jsonify({
        'id': new_user['id'],
        'username': new_user['username'],
        'role': new_user['role'],
        'fullName': new_user['fullName'],
        'email': new_user['email'],
        'createdAt': new_user['createdAt']
    }), 201

@users_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(id):
    data = request.get_json()
    users = read_csv(USERS_FILE)
    
    user_index = None
    for i, u in enumerate(users):
        if u['id'] == id:
            user_index = i
            break
    
    if user_index is None:
        return jsonify({'error': 'User not found'}), 404
    
    # Check username uniqueness
    if 'username' in data and data['username'] != users[user_index]['username']:
        if find_by_field(USERS_FILE, 'username', data['username']):
            return jsonify({'error': 'Username already exists'}), 400
    
    if 'role' in data and data['role'] not in ['admin', 'store_manager']:
        return jsonify({'error': 'Invalid role'}), 400
    
    # Update fields
    if 'username' in data:
        users[user_index]['username'] = data['username']
    if 'password' in data:
        users[user_index]['password'] = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if 'role' in data:
        users[user_index]['role'] = data['role']
    if 'fullName' in data:
        users[user_index]['fullName'] = data['fullName']
    if 'email' in data:
        users[user_index]['email'] = data['email']
    
    users[user_index]['updatedAt'] = datetime.now().isoformat()
    write_csv(USERS_FILE, users, HEADERS)
    
    return jsonify({
        'id': users[user_index]['id'],
        'username': users[user_index]['username'],
        'role': users[user_index]['role'],
        'fullName': users[user_index]['fullName'],
        'email': users[user_index]['email']
    })

@users_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(id):
    user_data = get_current_user_data()
    
    # Prevent self-deletion
    if user_data.get('id') == id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    if not delete_row(USERS_FILE, id, HEADERS):
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'message': 'User deleted successfully'})
