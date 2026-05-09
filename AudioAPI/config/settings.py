"""
Application Configuration
Chứa tất cả constants và settings cho ứng dụng
"""
import os

# ─── Directory Paths ──────────────────────────────────────────────────────────
UPLOAD_DIR = "data/uploads"
RESULT_DIR = "data/results"

# Tạo thư mục nếu chưa tồn tại
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

# ─── File Upload Settings ─────────────────────────────────────────────────────
MAX_FILE_SIZE = 60 * 1024 * 1024  # 60MB

# ─── CORS Settings ────────────────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000"
]

# ─── API Settings ─────────────────────────────────────────────────────────────
API_TITLE = "OmniSplit AI Backend"
API_VERSION = "1.0.0"
