"""
Separation Routes
API endpoints cho audio separation (Music & Environment)
"""
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Form
from middleware.validation import validate_file_size
from services.file_service import generate_task_id, save_uploaded_file, save_uploaded_file_with_name
from helpers.audio_converter import sanitize_to_wav
from modules.demucs_task import run_demucs_task
from modules.audiosep_task import run_audiosep_task
from config.settings import RESULT_DIR

router = APIRouter()


@router.post("/api/separate-music")
async def separate_music(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    karaoke_mode: str = Form("true"), 
    song_name: str = Form(None)
):
    """
    API: Chế độ Âm nhạc (Tách Demucs)
    Tách audio thành vocals, bass, drums, other và tạo beat track
    """
    validate_file_size(file)

    task_id = generate_task_id()
    save_path = save_uploaded_file(file, task_id)
    clean_wav_path = sanitize_to_wav(save_path, task_id)
    
    # Ép kiểu karaoke_mode từ string sang boolean
    is_karaoke = karaoke_mode.lower() == "true"
    
    print(f"[{task_id}] Đã nhận yêu cầu tách nhạc. Tên bài hát: {song_name} - Karaoke: {is_karaoke}")
    
    # Truyền biến is_karaoke (boolean) vào background task
    background_tasks.add_task(run_demucs_task, task_id, clean_wav_path, RESULT_DIR, song_name, is_karaoke)
    
    return {
        "status": "processing",
        "task_id": task_id,
        "message": "Đã nhận file. Đang đưa vào tiến trình Demucs."
    }


@router.post("/api/separate-env")
async def separate_environment(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    prompt: str = Form(None)
):
    """
    API: Chế độ Môi trường (Tách AudioSep)
    Tách audio dựa trên CLAP detection tự động
    """
    validate_file_size(file)

    task_id = generate_task_id()
    save_path = save_uploaded_file_with_name(file, task_id)
    clean_wav_path = sanitize_to_wav(save_path, task_id)
    
    background_tasks.add_task(run_audiosep_task, task_id, clean_wav_path, RESULT_DIR)
    
    return {
        "status": "processing",
        "task_id": task_id,
        "message": "Đã nhận file. Đang dùng CLAP quét tự động..."
    }
