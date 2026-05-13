"""
Karaoke Routes
API endpoints cho karaoke video rendering và lyrics update
"""
import os
import shutil
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Form
from modules.renderVideo.cook import render_karaoke_video_from_image
from modules.renderVideo.recalculate_timing import update_lyrics_in_json
from modules.renderVideo.json_to_ass import json_to_ass
from config.settings import RESULT_DIR

router = APIRouter()


@router.post("/api/render-video")
async def render_video(
    background_tasks: BackgroundTasks, 
    task_id: str = Form(...), 
    image: UploadFile = File(...)
):
    """
    API: Render Karaoke Video
    Tạo video karaoke từ lyrics và ảnh nền
    """
    # 1. Lưu ảnh nền người dùng up lên
    image_path = os.path.join(RESULT_DIR, task_id, "background.jpg")
    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
        
    # 2. Định nghĩa các đường dẫn
    json_path = os.path.join(RESULT_DIR, task_id, "lyrics.json")
    ass_path = os.path.join(RESULT_DIR, task_id, "karaoke.ass")
    beat_path = os.path.join(RESULT_DIR, task_id, "beat.mp3")
    video_path = os.path.join(RESULT_DIR, task_id, "Final_Karaoke.mp4")
    
    # Xóa file cũ nếu có để tránh Frontend báo thành công bằng file cũ
    if os.path.exists(video_path):
        try:
            os.remove(video_path)
        except Exception:
            pass

    # 3. Chạy hàm chuyển JSON -> ASS
    json_to_ass(json_path, ass_path)
    
    # 4. Chạy FFmpeg Render Video ngầm
    background_tasks.add_task(
        render_karaoke_video_from_image,
        image_path, beat_path, ass_path, video_path
    )
    
    return {"status": "rendering", "message": "Đang nướng video..."}


@router.post("/api/update-lyric")
async def update_lyric(
    task_id: str = Form(...), 
    segment_id: int = Form(...), 
    new_text: str = Form(...)
):
    """
    API: Update Lyrics
    Cập nhật lyrics và tính toán lại timing
    """
    json_path = os.path.join(RESULT_DIR, task_id, "lyrics.json")
    
    # Kiểm tra file tồn tại
    if not os.path.exists(json_path):
        return {
            "status": "error", 
            "message": f"Không tìm thấy file lyrics.json cho task {task_id}"
        }
    
    # Hàm sẽ tự động phân bổ lại nhịp (timing) cho chữ mới
    success = update_lyrics_in_json(json_path, segment_id, new_text, json_path)
    
    if success:
        return {
            "status": "success", 
            "message": f"Đã cập nhật lyrics segment {segment_id} và tính toán lại timing"
        }
    
    return {
        "status": "error", 
        "message": f"Không thể cập nhật segment {segment_id}"
    }
