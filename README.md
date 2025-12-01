# 🎈 POGO LAND Management App

A comprehensive management application for POGO LAND playzone, built with Python Flask and vanilla JavaScript. Track kids walk-ins, party bookings, and subscription packages with ease.

## Features

### 👶 Kids Walk-ins
- Track daily walk-ins with check-in/check-out
- Store child and parent information
- Quick search by name or phone number
- Auto-fill from previous visits
- Payment tracking (Cash, GPay, Card, Bank Transfer)

### 🎉 Party Bookings
- Manage party reservations
- Track advance payments and total amounts
- Status management (Booked, Confirmed, In-Progress, Completed, Cancelled)
- AM/PM time picker for scheduling

### 📦 Packages
- Support for visit-based packages (10/20/30 visits)
- Monthly unlimited packages
- Automatic expiration tracking
- Visit usage logging
- Color-coded status indicators

### 📊 Dashboard & Reports
- Real-time statistics
- Monthly summary (Admin only)
- Detailed reports with revenue breakdown
- Upcoming parties calendar view

### 👥 User Management
- Role-based access control (Admin / Store Manager)
- Admin: Full access to all features
- Store Manager: Limited to today's data and last 7 days

### 🔒 Security Features
- JWT authentication
- Password hashing with bcrypt
- Role-based permissions
- Update history tracking

## Tech Stack

- **Backend:** Python 3.x, Flask 3.0.0
- **Authentication:** Flask-JWT-Extended
- **Storage:** CSV files (no database required)
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Scheduler:** APScheduler (for daily backups)

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ramshukla-winwire/pogoland.git
   cd pogoland
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**
   
   Windows:
   ```bash
   .\venv\Scripts\activate
   ```
   
   macOS/Linux:
   ```bash
   source venv/bin/activate
   ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. **Access the app**
   
   Open your browser and go to: `http://127.0.0.1:5000`

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |

> ⚠️ **Important:** Change the default admin password after first login!

## Project Structure

```
pl-app/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── .gitignore            # Git ignore rules
├── data/                 # CSV data storage
│   ├── users.csv
│   ├── walkins.csv
│   ├── parties.csv
│   └── packages.csv
├── routes/               # API route handlers
│   ├── auth.py          # Authentication routes
│   ├── users.py         # User management
│   ├── walkins.py       # Walk-in management
│   ├── parties.py       # Party booking management
│   ├── packages.py      # Package management
│   └── backup.py        # Backup operations
├── services/            # Business logic services
│   ├── csv_service.py   # CSV file operations
│   └── backup_service.py # Backup service
└── static/              # Frontend files
    ├── index.html       # Main HTML page
    ├── styles.css       # Stylesheet
    └── app.js           # JavaScript application
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Walk-ins
- `GET /api/walkins/` - Get all walk-ins
- `GET /api/walkins/today` - Get today's walk-ins
- `GET /api/walkins/active` - Get active (not checked out) walk-ins
- `POST /api/walkins/` - Create new walk-in
- `PUT /api/walkins/<id>` - Update walk-in
- `POST /api/walkins/<id>/checkout` - Check out a walk-in
- `DELETE /api/walkins/<id>` - Delete walk-in

### Parties
- `GET /api/parties/` - Get all parties
- `GET /api/parties/upcoming` - Get upcoming parties
- `GET /api/parties/today` - Get today's parties
- `POST /api/parties/` - Create new party booking
- `PUT /api/parties/<id>` - Update party
- `DELETE /api/parties/<id>` - Delete party

### Packages
- `GET /api/packages/` - Get all packages
- `GET /api/packages/active` - Get active packages
- `POST /api/packages/` - Create new package
- `PUT /api/packages/<id>` - Update package
- `POST /api/packages/<id>/use-visit` - Record a visit
- `DELETE /api/packages/<id>` - Delete package

### Users (Admin only)
- `GET /api/users/` - Get all users
- `POST /api/users/` - Create new user
- `PUT /api/users/<id>` - Update user
- `DELETE /api/users/<id>` - Delete user

## Role Permissions

| Feature | Admin | Store Manager |
|---------|-------|---------------|
| View Dashboard | ✅ | ✅ |
| Monthly Summary | ✅ | ❌ |
| Reports Tab | ✅ | ❌ |
| User Management | ✅ | ❌ |
| Backup Management | ✅ | ❌ |
| View All Data | ✅ | Last 7 days only |
| Delete Completed Records | ✅ | ❌ |
| Edit All Fields | ✅ | Limited |

## Backup

- Automatic daily backups at 11:59 PM
- Manual backup available in Backup tab (Admin only)
- Backups stored in `data/backups/` folder

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET_KEY` | Secret key for JWT tokens | `pogoland-secret-key-change-in-production` |

For production, set a secure JWT secret:
```bash
export JWT_SECRET_KEY="your-secure-secret-key"
```

## License

This project is proprietary software for POGO LAND.

## Support

For issues or feature requests, please contact the development team.

---

Made with ❤️ for POGO LAND
