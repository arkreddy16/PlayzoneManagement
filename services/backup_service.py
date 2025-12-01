import os
import zipfile
from datetime import datetime
from services.csv_service import DATA_DIR, BACKUPS_DIR, ensure_directories

def create_backup():
    """Create a backup of all CSV files"""
    ensure_directories()
    
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    backup_filename = f'backup_{timestamp}.zip'
    backup_path = os.path.join(BACKUPS_DIR, backup_filename)
    
    with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for filename in os.listdir(DATA_DIR):
            if filename.endswith('.csv'):
                filepath = os.path.join(DATA_DIR, filename)
                zipf.write(filepath, filename)
    
    return {
        'filename': backup_filename,
        'path': backup_path,
        'size': os.path.getsize(backup_path)
    }

def list_backups():
    """List all available backups"""
    ensure_directories()
    
    backups = []
    for filename in os.listdir(BACKUPS_DIR):
        if filename.endswith('.zip'):
            filepath = os.path.join(BACKUPS_DIR, filename)
            stat = os.stat(filepath)
            backups.append({
                'filename': filename,
                'size': stat.st_size,
                'createdAt': datetime.fromtimestamp(stat.st_ctime).isoformat()
            })
    
    # Sort by creation date descending
    backups.sort(key=lambda x: x['createdAt'], reverse=True)
    return backups

def restore_backup(backup_filename):
    """Restore from a backup file"""
    backup_path = os.path.join(BACKUPS_DIR, backup_filename)
    
    if not os.path.exists(backup_path):
        raise FileNotFoundError('Backup file not found')
    
    restored_files = []
    with zipfile.ZipFile(backup_path, 'r') as zipf:
        for name in zipf.namelist():
            if name.endswith('.csv'):
                zipf.extract(name, DATA_DIR)
                restored_files.append(name)
    
    return {
        'restored': restored_files,
        'timestamp': datetime.now().isoformat()
    }

def restore_from_buffer(file_buffer):
    """Restore from uploaded backup file"""
    import io
    
    restored_files = []
    with zipfile.ZipFile(io.BytesIO(file_buffer), 'r') as zipf:
        for name in zipf.namelist():
            if name.endswith('.csv'):
                zipf.extract(name, DATA_DIR)
                restored_files.append(name)
    
    if not restored_files:
        raise ValueError('Invalid backup: no CSV files found')
    
    return {
        'restored': restored_files,
        'timestamp': datetime.now().isoformat()
    }

def delete_backup(backup_filename):
    """Delete a backup file"""
    backup_path = os.path.join(BACKUPS_DIR, backup_filename)
    
    if not os.path.exists(backup_path):
        raise FileNotFoundError('Backup file not found')
    
    os.remove(backup_path)
    return True

def get_backup_path(backup_filename):
    """Get backup file path for download"""
    backup_path = os.path.join(BACKUPS_DIR, backup_filename)
    
    if not os.path.exists(backup_path):
        return None
    
    return backup_path

def cleanup_old_backups(keep_count=7):
    """Cleanup old backups, keeping last N backups"""
    backups = list_backups()
    to_delete = backups[keep_count:]
    
    for backup in to_delete:
        delete_backup(backup['filename'])
    
    return {
        'deleted': len(to_delete),
        'remaining': min(len(backups), keep_count)
    }
