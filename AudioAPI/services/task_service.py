"""
Task Service
Xử lý các thao tác liên quan đến task status
"""
import os
import json
from config.settings import RESULT_DIR


def get_task_status(task_id: str) -> dict:
    """
    Lấy trạng thái của task từ file status.json.
    
    Args:
        task_id: ID của task
        
    Returns:
        Dict chứa status information
    """
    status_file = os.path.join(RESULT_DIR, task_id, "status.json")
    
    # Nếu file status.json tồn tại, tức là AI đã chạy xong (hoặc bị lỗi)
    if os.path.exists(status_file):
        with open(status_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    
    return {"status": "processing"}
