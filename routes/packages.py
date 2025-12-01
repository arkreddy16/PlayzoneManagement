from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from services.csv_service import read_csv, write_csv, get_next_id, update_row, delete_row
import json

packages_bp = Blueprint('packages', __name__)

PACKAGES_FILE = 'packages.csv'
HEADERS = ['id', 'childName', 'childAge', 'parentName', 'parentPhone', 'parentEmail', 'packageType', 'totalVisits', 'usedVisits', 'startDate', 'endDate', 'amount', 'paymentMode', 'status', 'notes', 'createdBy', 'createdAt', 'updatedAt', 'updateHistory']

def get_current_user_data():
    """Get current user data from JWT identity"""
    identity = get_jwt_identity()
    if isinstance(identity, str):
        try:
            return json.loads(identity)
        except:
            return {'username': 'unknown'}
    return identity if identity else {'username': 'unknown'}

def check_and_update_expired_packages():
    """Check and mark expired packages as completed"""
    packages = read_csv(PACKAGES_FILE)
    today = datetime.now().strftime('%Y-%m-%d')
    updated = False
    
    for p in packages:
        if p.get('status') == 'active':
            # Check if end date has passed
            if p.get('endDate') and p.get('endDate') < today:
                p['status'] = 'completed'
                p['updatedAt'] = datetime.now().isoformat()
                updated = True
            # Check if all visits used
            elif p.get('packageType') != 'monthly':
                total = int(p.get('totalVisits') or 0)
                used = int(p.get('usedVisits') or 0)
                if total > 0 and used >= total:
                    p['status'] = 'completed'
                    p['updatedAt'] = datetime.now().isoformat()
                    updated = True
    
    if updated:
        write_csv(PACKAGES_FILE, packages, HEADERS)
    
    return packages

@packages_bp.route('/', methods=['GET'])
@jwt_required()
def get_packages():
    packages = check_and_update_expired_packages()
    return jsonify(packages)

@packages_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_packages():
    packages = check_and_update_expired_packages()
    active = [p for p in packages if p.get('status') == 'active']
    return jsonify(active)

@packages_bp.route('/completed', methods=['GET'])
@jwt_required()
def get_completed_packages():
    packages = check_and_update_expired_packages()
    completed = [p for p in packages if p.get('status') == 'completed']
    return jsonify(completed)

@packages_bp.route('/expiring', methods=['GET'])
@jwt_required()
def get_expiring_packages():
    """Get packages that are expiring but still have visits remaining"""
    packages = check_and_update_expired_packages()
    today = datetime.now().strftime('%Y-%m-%d')
    
    expiring = []
    for p in packages:
        if p.get('status') == 'active' and p.get('packageType') != 'monthly':
            total = int(p.get('totalVisits') or 0)
            used = int(p.get('usedVisits') or 0)
            remaining = total - used
            
            # Check if end date is within 7 days or has remaining visits
            if remaining > 0:
                end_date = p.get('endDate', '')
                if end_date:
                    # Package expiring soon with visits left
                    expiring.append(p)
    
    return jsonify(expiring)

@packages_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_package(id):
    packages = read_csv(PACKAGES_FILE)
    for p in packages:
        if p['id'] == id:
            return jsonify(p)
    return jsonify({'error': 'Package not found'}), 404

@packages_bp.route('/', methods=['POST'])
@jwt_required()
def create_package():
    data = request.get_json()
    user_data = get_current_user_data()
    
    child_name = data.get('childName')
    parent_name = data.get('parentName')
    package_type = data.get('packageType')
    
    if not child_name or not parent_name or not package_type:
        return jsonify({'error': 'Child name, parent name, and package type are required'}), 400
    
    now = datetime.now().isoformat()
    
    # Set total visits based on package type
    total_visits = 0
    if package_type == '10visits':
        total_visits = 10
    elif package_type == '20visits':
        total_visits = 20
    elif package_type == '30visits':
        total_visits = 30
    elif package_type == 'monthly':
        total_visits = 0  # Unlimited for monthly
    
    new_package = {
        'id': str(get_next_id(PACKAGES_FILE)),
        'childName': child_name,
        'childAge': data.get('childAge', ''),
        'parentName': parent_name,
        'parentPhone': data.get('parentPhone', ''),
        'parentEmail': data.get('parentEmail', ''),
        'packageType': package_type,
        'totalVisits': str(total_visits),
        'usedVisits': '0',
        'startDate': data.get('startDate', datetime.now().strftime('%Y-%m-%d')),
        'endDate': data.get('endDate', ''),
        'amount': data.get('amount', ''),
        'paymentMode': data.get('paymentMode', ''),
        'status': 'active',
        'notes': data.get('notes', ''),
        'createdBy': user_data.get('username', 'unknown'),
        'createdAt': now,
        'updatedAt': now
    }
    
    packages = read_csv(PACKAGES_FILE)
    packages.append(new_package)
    write_csv(PACKAGES_FILE, packages, HEADERS)
    
    return jsonify(new_package), 201

@packages_bp.route('/<id>', methods=['PUT'])
@jwt_required()
def update_package(id):
    data = request.get_json()
    user_data = get_current_user_data()
    now = datetime.now().isoformat()
    data['updatedAt'] = now
    
    # Get existing record to append to update history
    packages = read_csv(PACKAGES_FILE)
    existing = None
    for p in packages:
        if p['id'] == id:
            existing = p
            break
    
    if not existing:
        return jsonify({'error': 'Package not found'}), 404
    
    # Build update history entry
    history_entry = f"{user_data.get('username', 'unknown')}|{now}"
    existing_history = existing.get('updateHistory', '')
    if existing_history:
        data['updateHistory'] = existing_history + ';' + history_entry
    else:
        data['updateHistory'] = history_entry
    
    updated = update_row(PACKAGES_FILE, id, data, HEADERS)
    
    return jsonify(updated)

@packages_bp.route('/<id>/use-visit', methods=['POST'])
@jwt_required()
def use_package_visit(id):
    """Increment used visits for a package"""
    user_data = get_current_user_data()
    packages = read_csv(PACKAGES_FILE)
    
    for p in packages:
        if p['id'] == id:
            if p.get('status') != 'active':
                return jsonify({'error': 'Package is not active'}), 400
            
            used = int(p.get('usedVisits') or 0)
            total = int(p.get('totalVisits') or 0)
            
            # For monthly, just increment (no limit)
            # For visit-based, check limit
            if p.get('packageType') != 'monthly' and total > 0 and used >= total:
                return jsonify({'error': 'No visits remaining'}), 400
            
            now = datetime.now().isoformat()
            p['usedVisits'] = str(used + 1)
            p['updatedAt'] = now
            
            # Track update history for visit usage
            history_entry = f"{user_data.get('username', 'unknown')}|{now}|use-visit"
            existing_history = p.get('updateHistory', '')
            if existing_history:
                p['updateHistory'] = existing_history + ';' + history_entry
            else:
                p['updateHistory'] = history_entry
            
            # Auto-complete if all visits used
            if p.get('packageType') != 'monthly' and total > 0 and int(p['usedVisits']) >= total:
                p['status'] = 'completed'
            
            write_csv(PACKAGES_FILE, packages, HEADERS)
            return jsonify(p)
    
    return jsonify({'error': 'Package not found'}), 404

@packages_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
def delete_package(id):
    if not delete_row(PACKAGES_FILE, id, HEADERS):
        return jsonify({'error': 'Package not found'}), 404
    
    return jsonify({'message': 'Package deleted successfully'})

@packages_bp.route('/search', methods=['GET'])
@jwt_required()
def search_packages():
    """Search active packages by child name or phone for walkin integration"""
    query = request.args.get('q', '').strip().lower()
    
    if not query or len(query) < 2:
        return jsonify([])
    
    packages = check_and_update_expired_packages()
    
    results = []
    for p in packages:
        if p.get('status') == 'active':
            if query in p.get('childName', '').lower() or query in p.get('parentPhone', '').lower():
                total = int(p.get('totalVisits') or 0)
                used = int(p.get('usedVisits') or 0)
                remaining = total - used if p.get('packageType') != 'monthly' else 'Unlimited'
                
                results.append({
                    'id': p['id'],
                    'childName': p['childName'],
                    'parentName': p['parentName'],
                    'parentPhone': p.get('parentPhone', ''),
                    'packageType': p['packageType'],
                    'remaining': remaining,
                    'endDate': p.get('endDate', '')
                })
    
    return jsonify(results)
