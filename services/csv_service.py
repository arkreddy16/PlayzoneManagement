import os
import csv
from datetime import datetime
import bcrypt

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
BACKUPS_DIR = os.path.join(DATA_DIR, 'backups')

def ensure_directories():
    """Ensure data and backups directories exist"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(BACKUPS_DIR, exist_ok=True)

def initialize_data_files():
    """Initialize CSV files with headers if they don't exist"""
    ensure_directories()
    
    files = {
        'users.csv': ['id', 'username', 'password', 'role', 'fullName', 'email', 'createdAt', 'updatedAt'],
        'walkins.csv': ['id', 'tagNo', 'childName', 'childAge', 'gender', 'dob', 'parentName', 'parentPhone', 'parentEmail', 'amount', 'paymentMode', 'checkInTime', 'checkOutTime', 'food', 'notes', 'createdBy', 'createdAt'],
        'parties.csv': ['id', 'childName', 'childAge', 'parentName', 'parentPhone', 'partyDate', 'partyTime', 'guestCount', 'packageType', 'status', 'notes', 'createdBy', 'createdAt', 'updatedAt']
    }
    
    for filename, headers in files.items():
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(headers)
            print(f'Created {filename}')
    
    # Create default admin user if users.csv is empty
    users = read_csv('users.csv')
    if len(users) == 0:
        hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        now = datetime.now().isoformat()
        admin_user = {
            'id': '1',
            'username': 'admin',
            'password': hashed_password,
            'role': 'admin',
            'fullName': 'Administrator',
            'email': 'admin@pogoland.com',
            'createdAt': now,
            'updatedAt': now
        }
        append_csv('users.csv', admin_user)
        print('Created default admin user (username: admin, password: admin123)')

def read_csv(filename):
    """Read CSV file and return list of dictionaries"""
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    
    with open(filepath, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def write_csv(filename, data, headers):
    """Write list of dictionaries to CSV file"""
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data)

def append_csv(filename, row):
    """Append a single row to CSV file"""
    filepath = os.path.join(DATA_DIR, filename)
    
    # Get headers from existing file
    with open(filepath, 'r', newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
    
    with open(filepath, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writerow(row)

def get_next_id(filename):
    """Get next available ID for a table"""
    data = read_csv(filename)
    if not data:
        return 1
    
    max_id = max(int(row.get('id', 0)) for row in data)
    return max_id + 1

def find_by_field(filename, field, value):
    """Find a row by field value"""
    data = read_csv(filename)
    for row in data:
        if row.get(field) == value:
            return row
    return None

def update_row(filename, id, updates, headers):
    """Update a row by ID"""
    data = read_csv(filename)
    
    for i, row in enumerate(data):
        if row.get('id') == str(id):
            data[i] = {**row, **updates}
            write_csv(filename, data, headers)
            return data[i]
    
    return None

def delete_row(filename, id, headers):
    """Delete a row by ID"""
    data = read_csv(filename)
    
    for i, row in enumerate(data):
        if row.get('id') == str(id):
            data.pop(i)
            write_csv(filename, data, headers)
            return True
    
    return False
