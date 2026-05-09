"""
OmniSplit AI Backend - Main Application
Entry point cho FastAPI application với kiến trúc modular
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config.settings import API_TITLE, API_VERSION, CORS_ORIGINS, UPLOAD_DIR, RESULT_DIR
from routes import separation, status, karaoke

# Application Setup
app = FastAPI(title=API_TITLE, version=API_VERSION)

# CORS Middleware 
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files
# Mở cửa thư mục kết quả cho frontend truy cập trực tiếp
app.mount("/api/files", StaticFiles(directory=RESULT_DIR), name="files")
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Routes
app.include_router(separation.router, tags=["Separation"])
app.include_router(status.router, tags=["Status"])
app.include_router(karaoke.router, tags=["Karaoke"])
