"""
File Service
Xử lý các thao tác liên quan đến file upload và lưu trữ
"""
import os
import uuid
import shutil
from fastapi import UploadFile
from config.settings import UPLOAD_DIR


def generate_task_id() -> str:
    """
    Tạo task ID duy nhất.
    
    Returns:
        UUID string
    """
    return str(uuid.uuid4())


def save_uploaded_file(file: UploadFile, task_id: str) -> str:
    """
    Lưu file upload vào thư mục uploads.
    
    Args:
        file: UploadFile object từ FastAPI
        task_id: ID của task
        
    Returns:
        Đường dẫn file đã lưu
    """
    file_extension = file.filename.split(".")[-1]
    save_path = os.path.join(UPLOAD_DIR, f"{task_id}.{file_extension}")
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return save_path


def save_uploaded_file_with_name(file: UploadFile, task_id: str) -> str:
    """
    Lưu file upload với tên gốc (dùng cho environment mode).
    
    Args:
        file: UploadFile object từ FastAPI
        task_id: ID của task
        
    Returns:
        Đường dẫn file đã lưu
    """
    save_path = os.path.join(UPLOAD_DIR, f"{task_id}_{file.filename}")
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return save_path
