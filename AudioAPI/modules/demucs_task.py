from weakref import ref

import torch
import torchaudio
from demucs.pretrained import get_model
from demucs.apply import apply_model
import os
import json

def run_demucs_task(task_id: str, file_path: str, result_dir: str):
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
        
        #chuẩn hóa
        sources = sources * ref.std() + ref.mean()

        source_names = ["drums", "bass", "other", "vocals"]
        generated_files = []
        
        # Lưu file
        for i, name in enumerate(source_names):
            track = sources[i] 
            save_path = os.path.join(task_output_dir, f"{name}.wav")
            torchaudio.save(save_path, track, sr)
            generated_files.append(f"{name}.wav")
        
        # ==========================================
        # Cộng gộp 3 phần (drums, bass, other) để tạo nhạc nền karaoke
        beat_track = sources[0] + sources[1] + sources[2]
        beat_path = os.path.join(task_output_dir, "beat.wav")
        torchaudio.save(beat_path, beat_track, sr)
        generated_files.append("beat.wav") # Cập nhật file beat vào danh sách
        # ==========================================
        
        # QUAN TRỌNG: Ghi file status.json để báo cho React biết đã xong
        with open(os.path.join(task_output_dir, 'status.json'), 'w', encoding='utf-8') as f:
            json.dump({
                "status": "completed", 
                "files": generated_files,
                "mode": "music"
            }, f)
            
        print(f"[Task {task_id}] Hoàn tất tách nhạc Demucs!")
        
    except Exception as e:
        print(f"[Task {task_id}] Lỗi Demucs: {e}")
        with open(os.path.join(task_output_dir, 'status.json'), 'w', encoding='utf-8') as f:
            json.dump({"status": "error", "message": str(e)}, f)