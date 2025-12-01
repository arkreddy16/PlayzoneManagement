from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from services.csv_service import read_csv, write_csv, get_next_id, update_row, delete_row
import json

parties_bp = Blueprint('parties', __name__)

PARTIES_FILE = 'parties.csv'
HEADERS = ['id', 'childName', 'childAge', 'parentName', 'parentPhone', 'partyDate', 'partyTime', 'guestCount', 'packageType', 'advance', 'totalAmount', 'status', 'notes', 'createdBy', 'createdAt', 'updatedAt', 'updateHistory']

def get_current_user_data():
    """Get current user data from JWT identity"""
    identity = get_jwt_identity()
    if isinstance(identity, str):
        try:
            return json.loads(identity)
        except:
            return {'username': 'unknown'}
    return identity if identity else {'username': 'unknown'}

@parties_bp.route('/', methods=['GET'])
@jwt_required()
def get_parties():
    parties = read_csv(PARTIES_FILE)
    return jsonify(parties)

@parties_bp.route('/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_parties():
    # Get date range from query params, default to current month
    today = datetime.now()
    first_day = today.replace(day=1)
    # Calculate last day of month
    if today.month == 12:
        last_day = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        last_day = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    from_date = request.args.get('from', first_day.strftime('%Y-%m-%d'))
    to_date = request.args.get('to', last_day.strftime('%Y-%m-%d'))
    
    parties = read_csv(PARTIES_FILE)
    upcoming = [p for p in parties if p.get('partyDate', '') >= from_date and p.get('partyDate', '') <= to_date and p.get('status') != 'cancelled']
    # Sort by date
    upcoming.sort(key=lambda x: x.get('partyDate', ''))
    return jsonify(upcoming)

@parties_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_parties():
    today = datetime.now().strftime('%Y-%m-%d')
    parties = read_csv(PARTIES_FILE)
    today_parties = [p for p in parties if p.get('partyDate') == today]
    return jsonify(today_parties)

@parties_bp.route('/completed', methods=['GET'])
@jwt_required()
def get_completed_parties():
    parties = read_csv(PARTIES_FILE)
    completed = [p for p in parties if p.get('status') == 'completed']
    return jsonify(completed)

@parties_bp.route('/daterange', methods=['GET'])
@jwt_required()
def get_parties_by_daterange():
    """Get parties within a date range"""
    from_date = request.args.get('from', '')
    to_date = request.args.get('to', '')
    
    if not from_date or not to_date:
        return jsonify({'error': 'Both from and to dates are required'}), 400
    
    parties = read_csv(PARTIES_FILE)
    
    # Filter by date range (using party date)
    filtered = [p for p in parties if p.get('partyDate', '') >= from_date and p.get('partyDate', '') <= to_date]
    filtered.sort(key=lambda x: x.get('partyDate', ''))
    
    return jsonify(filtered)

@parties_bp.route('/thismonth', methods=['GET'])
@jwt_required()
def get_thismonth_parties():
    today = datetime.now()
    first_day = today.replace(day=1).strftime('%Y-%m-%d')
    # Calculate last day of month
    if today.month == 12:
        last_day = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        last_day = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    last_day_str = last_day.strftime('%Y-%m-%d')
    
    parties = read_csv(PARTIES_FILE)
    thismonth = [p for p in parties if p.get('partyDate', '') >= first_day and p.get('partyDate', '') <= last_day_str]
    thismonth.sort(key=lambda x: x.get('partyDate', ''))
    return jsonify(thismonth)

@parties_bp.route('/monthly-summary', methods=['GET'])
@jwt_required()
def get_monthly_party_summary():
    year = request.args.get('year', datetime.now().year, type=int)
    month = request.args.get('month', datetime.now().month, type=int)
    
    # Calculate date range for the month
    first_day = f"{year}-{str(month).zfill(2)}-01"
    if month == 12:
        next_month_first = f"{year + 1}-01-01"
    else:
        next_month_first = f"{year}-{str(month + 1).zfill(2)}-01"
    
    parties = read_csv(PARTIES_FILE)
    
    # Filter parties for the month (exclude cancelled)
    monthly_parties = [p for p in parties 
                       if p.get('partyDate', '') >= first_day 
                       and p.get('partyDate', '') < next_month_first
                       and p.get('status') != 'cancelled']
    
    # Calculate totals
    total_advance = sum(float(p.get('advance') or 0) for p in monthly_parties)
    total_amount = sum(float(p.get('totalAmount') or 0) for p in monthly_parties)
    
    return jsonify({
        'count': len(monthly_parties),
        'advance': total_advance,
        'totalAmount': total_amount
    })

@parties_bp.route('/monthly', methods=['GET'])
@jwt_required()
def get_monthly_parties():
    year = request.args.get('year', datetime.now().year, type=int)
    month = request.args.get('month', datetime.now().month, type=int)
    
    # Calculate date range for the month
    first_day = f"{year}-{str(month).zfill(2)}-01"
    if month == 12:
        next_month_first = f"{year + 1}-01-01"
    else:
        next_month_first = f"{year}-{str(month + 1).zfill(2)}-01"
    
    parties = read_csv(PARTIES_FILE)
    
    # Filter parties for the month (exclude cancelled)
    monthly_parties = [p for p in parties 
                       if p.get('partyDate', '') >= first_day 
                       and p.get('partyDate', '') < next_month_first
                       and p.get('status') != 'cancelled']
    
    # Sort by date
    monthly_parties.sort(key=lambda x: x.get('partyDate', ''))
    
    return jsonify(monthly_parties)

@parties_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_party(id):
    parties = read_csv(PARTIES_FILE)
    for p in parties:
        if p['id'] == id:
            return jsonify(p)
    return jsonify({'error': 'Party not found'}), 404

@parties_bp.route('/', methods=['POST'])
@jwt_required()
def create_party():
    data = request.get_json()
    user_data = get_current_user_data()
    
    child_name = data.get('childName')
    parent_name = data.get('parentName')
    party_date = data.get('partyDate')
    
    if not child_name or not parent_name or not party_date:
        return jsonify({'error': 'Child name, parent name, and party date are required'}), 400
    
    now = datetime.now().isoformat()
    new_party = {
        'id': str(get_next_id(PARTIES_FILE)),
        'childName': child_name,
        'childAge': data.get('childAge', ''),
        'parentName': parent_name,
        'parentPhone': data.get('parentPhone', ''),
        'partyDate': party_date,
        'partyTime': data.get('partyTime', ''),
        'guestCount': data.get('guestCount', ''),
        'packageType': data.get('packageType', 'standard'),
        'advance': data.get('advance', ''),
        'totalAmount': data.get('totalAmount', ''),
        'status': 'booked',
        'notes': data.get('notes', ''),
        'createdBy': user_data.get('username', 'unknown'),
        'createdAt': now,
        'updatedAt': now
    }
    
    parties = read_csv(PARTIES_FILE)
    parties.append(new_party)
    write_csv(PARTIES_FILE, parties, HEADERS)
    
    return jsonify(new_party), 201

@parties_bp.route('/<id>', methods=['PUT'])
@jwt_required()
def update_party(id):
    data = request.get_json()
    user_data = get_current_user_data()
    now = datetime.now().isoformat()
    data['updatedAt'] = now
    
    # Get existing record to append to update history
    parties = read_csv(PARTIES_FILE)
    existing = None
    for p in parties:
        if p['id'] == id:
            existing = p
            break
    
    if not existing:
        return jsonify({'error': 'Party not found'}), 404
    
    # Build update history entry
    history_entry = f"{user_data.get('username', 'unknown')}|{now}"
    existing_history = existing.get('updateHistory', '')
    if existing_history:
        data['updateHistory'] = existing_history + ';' + history_entry
    else:
        data['updateHistory'] = history_entry
    
    updated = update_row(PARTIES_FILE, id, data, HEADERS)
    
    return jsonify(updated)

@parties_bp.route('/<id>/status', methods=['PATCH'])
@jwt_required()
def update_party_status(id):
    data = request.get_json()
    status = data.get('status')
    
    valid_statuses = ['booked', 'confirmed', 'in-progress', 'completed', 'cancelled']
    if status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
    
    updated = update_row(PARTIES_FILE, id, {
        'status': status,
        'updatedAt': datetime.now().isoformat()
    }, HEADERS)
    
    if not updated:
        return jsonify({'error': 'Party not found'}), 404
    
    return jsonify(updated)

@parties_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
def delete_party(id):
    if not delete_row(PARTIES_FILE, id, HEADERS):
        return jsonify({'error': 'Party not found'}), 404
    
    return jsonify({'message': 'Party deleted successfully'})
