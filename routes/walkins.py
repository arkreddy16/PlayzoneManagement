from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, current_user
from datetime import datetime
from services.csv_service import read_csv, write_csv, get_next_id, update_row, delete_row
import json

walkins_bp = Blueprint('walkins', __name__)

WALKINS_FILE = 'walkins.csv'
HEADERS = ['id', 'tagNo', 'childName', 'childAge', 'gender', 'dob', 'parentName', 'parentPhone', 'parentEmail', 'amount', 'paymentMode', 'checkInTime', 'checkOutTime', 'food', 'notes', 'createdBy', 'createdAt', 'updateHistory']

def get_current_user_data():
    """Get current user data from JWT identity"""
    identity = get_jwt_identity()
    if isinstance(identity, str):
        try:
            return json.loads(identity)
        except:
            return {'username': 'unknown'}
    return identity if identity else {'username': 'unknown'}

@walkins_bp.route('/search', methods=['GET'])
@jwt_required()
def search_walkins():
    """Search walkins by child name or phone number for autofill"""
    query = request.args.get('q', '').strip().lower()
    search_type = request.args.get('type', 'name')  # 'name' or 'phone'
    
    if not query or len(query) < 2:
        return jsonify([])
    
    walkins = read_csv(WALKINS_FILE)
    
    # Get unique entries based on child name + parent phone combination
    seen = set()
    results = []
    
    for w in reversed(walkins):  # Most recent first
        if search_type == 'phone':
            if query in w.get('parentPhone', '').lower():
                key = (w['childName'].lower(), w.get('parentPhone', ''))
                if key not in seen:
                    seen.add(key)
                    results.append({
                        'childName': w['childName'],
                        'childAge': w.get('childAge', ''),
                        'gender': w.get('gender', ''),
                        'dob': w.get('dob', ''),
                        'parentName': w['parentName'],
                        'parentPhone': w.get('parentPhone', ''),
                        'parentEmail': w.get('parentEmail', '')
                    })
        else:  # search by name
            if query in w.get('childName', '').lower():
                key = (w['childName'].lower(), w.get('parentPhone', ''))
                if key not in seen:
                    seen.add(key)
                    results.append({
                        'childName': w['childName'],
                        'childAge': w.get('childAge', ''),
                        'gender': w.get('gender', ''),
                        'dob': w.get('dob', ''),
                        'parentName': w['parentName'],
                        'parentPhone': w.get('parentPhone', ''),
                        'parentEmail': w.get('parentEmail', '')
                    })
        
        if len(results) >= 10:  # Limit results
            break
    
    return jsonify(results)

@walkins_bp.route('/', methods=['GET'])
@jwt_required()
def get_walkins():
    walkins = read_csv(WALKINS_FILE)
    return jsonify(walkins)

@walkins_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_walkins():
    today = datetime.now().strftime('%Y-%m-%d')
    walkins = read_csv(WALKINS_FILE)
    today_walkins = [w for w in walkins if w.get('checkInTime', '').startswith(today)]
    return jsonify(today_walkins)

@walkins_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_walkins():
    walkins = read_csv(WALKINS_FILE)
    active = [w for w in walkins if w.get('checkInTime') and not w.get('checkOutTime')]
    return jsonify(active)

@walkins_bp.route('/completed', methods=['GET'])
@jwt_required()
def get_completed_walkins():
    walkins = read_csv(WALKINS_FILE)
    completed = [w for w in walkins if w.get('checkOutTime')]
    return jsonify(completed)

@walkins_bp.route('/daterange', methods=['GET'])
@jwt_required()
def get_walkins_by_daterange():
    """Get walk-ins within a date range"""
    from_date = request.args.get('from', '')
    to_date = request.args.get('to', '')
    
    if not from_date or not to_date:
        return jsonify({'error': 'Both from and to dates are required'}), 400
    
    walkins = read_csv(WALKINS_FILE)
    
    # Filter by date range (using check-in date)
    filtered = []
    for w in walkins:
        check_in = w.get('checkInTime', '')[:10]  # Get date part only
        if check_in >= from_date and check_in <= to_date:
            filtered.append(w)
    
    return jsonify(filtered)

@walkins_bp.route('/monthly-summary', methods=['GET'])
@jwt_required()
def get_monthly_summary():
    year = request.args.get('year', datetime.now().year, type=int)
    month = request.args.get('month', datetime.now().month, type=int)
    
    # Calculate date range for the month
    first_day = f"{year}-{str(month).zfill(2)}-01"
    if month == 12:
        last_day = f"{year + 1}-01-01"
    else:
        last_day = f"{year}-{str(month + 1).zfill(2)}-01"
    
    walkins = read_csv(WALKINS_FILE)
    
    # Filter walkins for the month
    monthly_walkins = []
    for w in walkins:
        check_in = w.get('checkInTime', '')[:10]  # Get date part
        if check_in >= first_day and check_in < last_day:
            monthly_walkins.append(w)
    
    # Calculate totals
    total_count = len(monthly_walkins)
    total_amount = sum(float(w.get('amount') or 0) for w in monthly_walkins)
    total_food = sum(float(w.get('food') or 0) for w in monthly_walkins)
    
    return jsonify({
        'count': total_count,
        'amount': total_amount,
        'food': total_food
    })

@walkins_bp.route('/monthly', methods=['GET'])
@jwt_required()
def get_monthly_walkins():
    year = request.args.get('year', datetime.now().year, type=int)
    month = request.args.get('month', datetime.now().month, type=int)
    
    # Calculate date range for the month
    first_day = f"{year}-{str(month).zfill(2)}-01"
    if month == 12:
        last_day = f"{year + 1}-01-01"
    else:
        last_day = f"{year}-{str(month + 1).zfill(2)}-01"
    
    walkins = read_csv(WALKINS_FILE)
    
    # Filter walkins for the month
    monthly_walkins = []
    for w in walkins:
        check_in = w.get('checkInTime', '')[:10]  # Get date part
        if check_in >= first_day and check_in < last_day:
            monthly_walkins.append(w)
    
    # Sort by date
    monthly_walkins.sort(key=lambda x: x.get('checkInTime', ''))
    
    return jsonify(monthly_walkins)

@walkins_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_walkin(id):
    walkins = read_csv(WALKINS_FILE)
    for w in walkins:
        if w['id'] == id:
            return jsonify(w)
    return jsonify({'error': 'Walkin not found'}), 404

@walkins_bp.route('/', methods=['POST'])
@jwt_required()
def create_walkin():
    data = request.get_json()
    user_data = get_current_user_data()
    
    child_name = data.get('childName')
    parent_name = data.get('parentName')
    
    parent_phone = data.get('parentPhone', '').strip()
    
    if not child_name or not parent_name:
        return jsonify({'error': 'Child name and parent name are required'}), 400
    
    if not parent_phone:
        return jsonify({'error': 'Mobile number is required'}), 400
    
    now = datetime.now().isoformat()
    new_walkin = {
        'id': str(get_next_id(WALKINS_FILE)),
        'tagNo': data.get('tagNo', ''),
        'childName': child_name,
        'childAge': data.get('childAge', ''),
        'gender': data.get('gender', ''),
        'dob': data.get('dob', ''),
        'parentName': parent_name,
        'parentPhone': parent_phone,
        'parentEmail': data.get('parentEmail', ''),
        'amount': data.get('amount', ''),
        'paymentMode': data.get('paymentMode', ''),
        'checkInTime': now,
        'checkOutTime': '',
        'food': '',
        'notes': data.get('notes', ''),
        'createdBy': user_data.get('username', 'unknown'),
        'createdAt': now
    }
    
    walkins = read_csv(WALKINS_FILE)
    walkins.append(new_walkin)
    write_csv(WALKINS_FILE, walkins, HEADERS)
    
    return jsonify(new_walkin), 201

@walkins_bp.route('/<id>', methods=['PUT'])
@jwt_required()
def update_walkin(id):
    data = request.get_json()
    user_data = get_current_user_data()
    
    # Get existing record to append to update history
    walkins = read_csv(WALKINS_FILE)
    existing = None
    for w in walkins:
        if w['id'] == id:
            existing = w
            break
    
    if not existing:
        return jsonify({'error': 'Walkin not found'}), 404
    
    # Build update history entry
    now = datetime.now().isoformat()
    history_entry = f"{user_data.get('username', 'unknown')}|{now}"
    
    # Append to existing history
    existing_history = existing.get('updateHistory', '')
    if existing_history:
        data['updateHistory'] = existing_history + ';' + history_entry
    else:
        data['updateHistory'] = history_entry
    
    updated = update_row(WALKINS_FILE, id, data, HEADERS)
    
    return jsonify(updated)

@walkins_bp.route('/<id>/checkout', methods=['POST'])
@jwt_required()
def checkout_walkin(id):
    user_data = get_current_user_data()
    now = datetime.now().isoformat()
    
    # Get existing record to append to update history
    walkins = read_csv(WALKINS_FILE)
    existing = None
    for w in walkins:
        if w['id'] == id:
            existing = w
            break
    
    if not existing:
        return jsonify({'error': 'Walkin not found'}), 404
    
    # Build update history entry
    history_entry = f"{user_data.get('username', 'unknown')}|{now}|checkout"
    existing_history = existing.get('updateHistory', '')
    if existing_history:
        update_history = existing_history + ';' + history_entry
    else:
        update_history = history_entry
    
    updated = update_row(WALKINS_FILE, id, {'checkOutTime': now, 'updateHistory': update_history}, HEADERS)
    
    return jsonify(updated)

@walkins_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
def delete_walkin(id):
    if not delete_row(WALKINS_FILE, id, HEADERS):
        return jsonify({'error': 'Walkin not found'}), 404
    
    return jsonify({'message': 'Walkin deleted successfully'})
