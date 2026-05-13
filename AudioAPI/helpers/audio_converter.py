"""
Audio Conversion Utilities
Xử lý chuyển đổi định dạng audio
"""
import os
import subprocess
from config.settings import UPLOAD_DIR


def sanitize_to_wav(input_path: str, task_id: str) -> str:
    """
    Ép mọi định dạng audio về chuẩn WAV 44.1kHz.
    
    Args:
        input_path: Đường dẫn file audio đầu vào
        task_id: ID của task để logging
        
    Returns:
        Đường dẫn file WAV đã được chuẩn hóa
    """
    # Nếu file tải lên đã là wav, không cần làm gì cả
    if input_path.lower().endswith(".wav"):
        return input_path
        
    print(f"[{task_id}] Định dạng lạ. Đang ép chuẩn về WAV...")
    output_path = os.path.join(UPLOAD_DIR, f"{task_id}_sanitized.wav")
    
    # Lệnh FFmpeg: chuyển đổi mọi thứ thành .wav chuẩn (PCM 16-bit, 44100Hz)
    subprocess.run([
        "ffmpeg", "-y", "-i", input_path,
        "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", 
        output_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Trả về đường dẫn của file WAV sạch sẽ vừa tạo
    return output_path
