from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from apscheduler.schedulers.background import BackgroundScheduler
import os
from datetime import timedelta

# Import routes
from routes.auth import auth_bp
from routes.users import users_bp
from routes.walkins import walkins_bp
from routes.parties import parties_bp
from routes.packages import packages_bp
from routes.backup import backup_bp

# Import services
from services.csv_service import initialize_data_files
from services.backup_service import create_backup

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'pogoland-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)
app.config['JWT_JSON_KEY'] = 'token'
import json
jwt = JWTManager(app)

# Configure JWT to handle dict identity
@jwt.user_identity_loader
def user_identity_lookup(user):
    if isinstance(user, dict):
        return json.dumps(user)
    return user

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data['sub']
    try:
        return json.loads(identity)
    except:
        return identity

# Initialize data files
initialize_data_files()

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(walkins_bp, url_prefix='/api/walkins')
app.register_blueprint(parties_bp, url_prefix='/api/parties')
app.register_blueprint(packages_bp, url_prefix='/api/packages')
app.register_blueprint(backup_bp, url_prefix='/api/backup')

# Health check endpoint
@app.route('/api/health')
def health_check():
    from datetime import datetime
    return {'status': 'ok', 'timestamp': datetime.now().isoformat()}

# Serve React app
@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

# Schedule daily backup at 11:59 PM
scheduler = BackgroundScheduler()
scheduler.add_job(
    func=create_backup,
    trigger='cron',
    hour=23,
    minute=59,
    id='daily_backup'
)
scheduler.start()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
