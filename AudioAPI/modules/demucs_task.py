from weakref import ref
import torch
import torchaudio
from demucs.pretrained import get_model
from demucs.apply import apply_model
import os
import json
import subprocess

from modules.whisper.Whisper_unified_v2 import SongConfig, process_song
from modules.whisper.karaoke_core import WhisperASRPipeline

def run_demucs_task(task_id: str, file_path: str, result_dir: str, song_name: str = None, karaoke_mode: bool = False):
    print(f"[Task {task_id}] Đang khởi động Demucs Engine...")
    
    # Tạo thư mục riêng cho task này: data/results/{task_id}/
    task_output_dir = os.path.join(result_dir, task_id)
    os.makedirs(task_output_dir, exist_ok=True)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    try:
        model = get_model('htdemucs').to(device)
        wav, sr = torchaudio.load(file_path)
        
        # Chuẩn hóa
        if sr != model.samplerate:
            wav = torchaudio.functional.resample(wav, sr, model.samplerate)
            sr = model.samplerate
            
        if wav.shape[0] == 1:
            wav = wav.repeat(2, 1)
        else:
            wav = wav[:2]

        ref = wav.mean(0)
        wav = (wav - ref.mean()) / ref.std()
        wav_input = wav.unsqueeze(0).to(device)

        # Chạy model
        with torch.no_grad():
            sources = apply_model(model, wav_input, shifts=1, split=True, overlap=0.1, progress=True)[0]
        sources = sources.cpu()
        
        # chuẩn hóa
        sources = sources * ref.std() + ref.mean()

        source_names = ["drums", "bass", "other", "vocals"]
        generated_files = []
        
        print(f"[Task {task_id}] Tách xong. Đang nén file sang MP3 (192kbps) để tối ưu Web...")
        
        # ==========================================
        # 1. Lưu các file stem thành MP3
        # ==========================================
        for i, name in enumerate(source_names):
            track = sources[i] 
            wav_path = os.path.join(task_output_dir, f"{name}.wav")
            mp3_path = os.path.join(task_output_dir, f"{name}.mp3")
            
            # Xuất file WAV tạm
            torchaudio.save(wav_path, track, sr)
            # Dùng FFmpeg nén sang MP3 
            subprocess.run(['ffmpeg', '-y', '-i', wav_path, '-b:a', '192k', mp3_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            # Xóa file WAV tạm
            if os.path.exists(wav_path):
                os.remove(wav_path)
            
            generated_files.append(f"{name}.mp3")
        
        # ==========================================
        # 2. Cộng gộp Beat và nén MP3
        # ==========================================
        beat_track = sources[0] + sources[1] + sources[2]
        beat_wav = os.path.join(task_output_dir, "beat.wav")
        beat_mp3 = os.path.join(task_output_dir, "beat.mp3")
        
        torchaudio.save(beat_wav, beat_track, sr)
        subprocess.run(['ffmpeg', '-y', '-i', beat_wav, '-b:a', '192k', beat_mp3], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(beat_wav):
            os.remove(beat_wav)
            
        generated_files.append("beat.mp3") # Cập nhật file beat vào danh sách
        
        # Giải phóng VRAM GPU trước khi chạy Whisper
        import gc
        del model
        torch.cuda.empty_cache()
        gc.collect()

        from modules.whisper.Whisper_unified_v2 import run_whisper_task
        
        # Đưa file MP3 vào Whisper (Whisper tự xử lý được MP3)
        vocal_path = os.path.join(task_output_dir, "vocals.mp3")
        whisper_success = False

        # Chỉ chạy Whisper khi karaoke_mode là True
        if karaoke_mode:
            print(f"[Task {task_id}] Chế độ Karaoke bật: Đang trích xuất lời bài hát...")
            whisper_success = run_whisper_task(task_id, vocal_path, song_name, result_dir)
        else:
            print(f"[Task {task_id}] Chế độ Karaoke tắt: Bỏ qua bước trích xuất lời.")

        # Cập nhật status.json với thông tin file lyrics (nếu có)
        with open(os.path.join(task_output_dir, 'status.json'), 'w', encoding='utf-8') as f:
            json.dump({
                "status": "completed", 
                "files": generated_files,
                "lyrics_file": "lyrics.json" if whisper_success else None,
                "mode": "music"
            }, f)
            
        print(f"[Task {task_id}] Hoàn tất toàn bộ chu trình (Demucs + Whisper)!")
        
    except Exception as e:
        print(f"[Task {task_id}] Lỗi hệ thống: {e}")
        with open(os.path.join(task_output_dir, 'status.json'), 'w', encoding='utf-8') as f:
            json.dump({"status": "error", "message": str(e)}, f)