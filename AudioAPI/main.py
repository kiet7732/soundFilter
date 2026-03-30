import json
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid

# 1. ĐÃ SỬA TÊN HÀM IMPORT CHO ĐÚNG VỚI FILE
from modules.demucs_task import run_demucs_task
from modules.audiosep_task import run_audiosep_task
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="OmniSplit AI Backend")

# CẤU HÌNH CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173", 
        "http://localhost:3000"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# để "Mở cửa" thư mục kết quả cho frontend truy cập trực tiếp
app.mount("/api/files", StaticFiles(directory="data/results"), name="files") #đã tách
app.mount("/api/uploads", StaticFiles(directory="data/uploads"), name="uploads") #âm gốc

# Khai báo đường dẫn hệ thống tệp
UPLOAD_DIR = "data/uploads"
RESULT_DIR = "data/results"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

# 2. API: Chế độ Âm nhạc (Tách Demucs)
@app.post("/api/separate-music")
async def separate_music(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    karaoke_mode: str = Form("true") 
):
    task_id = str(uuid.uuid4())
    file_extension = file.filename.split(".")[-1]
    save_path = os.path.join(UPLOAD_DIR, f"{task_id}.{file_extension}")
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    background_tasks.add_task(run_demucs_task, task_id, save_path, RESULT_DIR)
    
    return {
        "status": "processing",
        "task_id": task_id,
        "message": "Đã nhận file. Đang đưa vào tiến trình Demucs."
    }

# 3. API: Chế độ Môi trường (Tách AudioSep)
@app.post("/api/separate-env")
# Dùng Form(None) cho prompt để Frontend có gửi hay không cũng không bị lỗi
async def separate_environment(background_tasks: BackgroundTasks, file: UploadFile = File(...), prompt: str = Form(None)):
    task_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{task_id}_{file.filename}")
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # ĐÃ SỬA: Gọi đúng tên hàm run_audiosep_task và KHÔNG truyền prompt vào nữa (vì CLAP tự lo)
    background_tasks.add_task(run_audiosep_task, task_id, save_path, RESULT_DIR)
    
    return {
        "status": "processing",
        "task_id": task_id,
        "message": "Đã nhận file. Đang dùng CLAP quét tự động..."
    }

# API kiểm tra trạng thái (Để React hỏi thăm liên tục)
@app.get("/api/status/{task_id}")
async def check_status(task_id: str):
    status_file = os.path.join(RESULT_DIR, task_id, "status.json")
    
    # Nếu file status.json tồn tại, tức là AI đã chạy xong (hoặc bị lỗi)
    if os.path.exists(status_file):
        with open(status_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data 
    
    return {"status": "processing"}