import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from config import Config

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'webm'}

def allowed_file(filename, file_type='image'):
    if '.' not in filename:
        return False
    
    ext = filename.rsplit('.', 1)[1].lower()
    
    if file_type == 'image':
        return ext in ALLOWED_IMAGE_EXTENSIONS
    elif file_type == 'video':
        return ext in ALLOWED_VIDEO_EXTENSIONS
    
    return False


def save_media_file(file, media_type='snapshot'):
    if not file or file.filename == '':
        return None
    
    file_category = 'image' if media_type == 'snapshot' else 'video'
    if not allowed_file(file.filename, file_category):
        return None
    
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{ext}"
    filename = secure_filename(filename)
    
    if media_type == 'snapshot':
        folder = Config.SNAPSHOTS_FOLDER
        relative_path = f"snapshots/{filename}"
    else:
        folder = Config.VIDEOS_FOLDER
        relative_path = f"videos/{filename}"
    
    try:
        filepath = os.path.join(folder, filename)
        file.save(filepath)
        return relative_path
    except Exception as e:
        print(f"Error saving file: {e}")
        return None


def get_media_full_path(relative_path):
    return os.path.join(Config.MEDIA_FOLDER, relative_path)