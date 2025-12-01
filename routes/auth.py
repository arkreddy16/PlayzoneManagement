from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
import json
from services.csv_service import find_by_field

auth_bp = Blueprint('auth', __name__)

def get_current_user_data():
    """Get current user data from JWT identity"""
    identity = get_jwt_identity()
    if isinstance(identity, str):
        try:
            return json.loads(identity)
        except:
            return {}
    return identity if identity else {}

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    # Find user by username
    user = find_by_field('users.csv', 'username', username)
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check password
    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Create JWT token
    identity = {
        'id': user['id'],
        'username': user['username'],
        'role': user['role'],
        'fullName': user['fullName']
    }
    token = create_access_token(identity=identity)
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'fullName': user['fullName'],
            'email': user['email']
        }
    })

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_data = get_current_user_data()
    user = find_by_field('users.csv', 'id', user_data.get('id', ''))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'role': user['role'],
        'fullName': user['fullName'],
        'email': user['email']
    })

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    user_data = get_current_user_data()
    return jsonify({'valid': True, 'user': user_data})
