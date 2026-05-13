"""
File Validation Middleware
Kiểm tra tính hợp lệ của file upload
"""
from fastapi import UploadFile, HTTPException
from config.settings import MAX_FILE_SIZE


def validate_file_size(file: UploadFile):
    """
    Kiểm tra kích thước file tải lên không được vượt quá giới hạn (60MB).
    
    Args:
        file: UploadFile object từ FastAPI
        
    Raises:
        HTTPException: Nếu file vượt quá kích thước cho phép
    """
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)  # Trả con trỏ về đầu file
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File audio không được vượt quá 60MB. Vui lòng chọn file nhỏ hơn."
        )
