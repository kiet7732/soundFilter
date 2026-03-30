import torch
import librosa
import soundfile as sf
import numpy as np
import os
import json
import urllib.request
import gc 
from pipeline import build_audiosep, separate_audio
from transformers import ClapModel, ClapProcessor


class SmartAnalyzer:
    
    def __init__(self, device='cuda'):
        self.device = device
        self.clap_model = ClapModel.from_pretrained("laion/clap-htsat-unfused").to(device)
        self.clap_processor = ClapProcessor.from_pretrained("laion/clap-htsat-unfused")
        self.audioset_labels = self._load_audioset()

    def _load_audioset(self):
        url = "https://raw.githubusercontent.com/audioset/ontology/master/ontology.json"
        local_filename = "audioset_ontology.json"
        try:
            if not os.path.exists(local_filename):
                with urllib.request.urlopen(url) as response:
                    data = json.loads(response.read().decode())
                    with open(local_filename, 'w', encoding='utf-8') as f: json.dump(data, f)
            else:
                with open(local_filename, 'r', encoding='utf-8') as f: data = json.load(f)
            return [item['name'] for item in data]
        except: return ["Speech", "Music", "Noise"]

    def scan_content(self, audio_path):
        
        y, sr = librosa.load(audio_path, sr=48000)
        total_duration = librosa.get_duration(y=y, sr=sr)
        if total_duration <= 30: chunk, stride = 10, 5
        elif total_duration <= 120: chunk, stride = 20, 20
        else: chunk, stride = 30, 30

        chunks = []
        for start in np.arange(0, total_duration, stride):
            end = start + chunk
            if end > total_duration: end = total_duration
            segment = y[int(start*48000):int(end*48000)]
            if len(segment) > 48000: chunks.append(segment)

        batch_size = 64
        batches = [self.audioset_labels[i:i + batch_size] for i in range(0, len(self.audioset_labels), batch_size)]
        scores = {} 

        for seg in chunks:
            audio_inputs = self.clap_processor(audios=seg, return_tensors="pt", sampling_rate=48000, padding=True)
            audio_inputs = {k: v.to(self.device) for k, v in audio_inputs.items()}
            with torch.no_grad():
                audio_embed = self.clap_model.get_audio_features(**audio_inputs)

            for batch_labels in batches:
                text_inputs = self.clap_processor(text=batch_labels, return_tensors="pt", padding=True)
                text_inputs = {k: v.to(self.device) for k, v in text_inputs.items()}
                with torch.no_grad():
                    text_embed = self.clap_model.get_text_features(**text_inputs)
                    sim = torch.matmul(audio_embed, text_embed.t()) * self.clap_model.logit_scale_a.exp()
                    probs = sim.softmax(dim=-1).detach().cpu().numpy()[0]
                
                for j, s in enumerate(probs):
                    if self.audioset_labels.index(batch_labels[j]) not in scores or s > scores[self.audioset_labels.index(batch_labels[j])][1]:
                         scores[self.audioset_labels.index(batch_labels[j])] = (batch_labels[j], s)

        sorted_items = sorted(scores.values(), key=lambda x: x[1], reverse=True)
        blacklist = ["Audio", "Sound", "Inside", "Outside", "Noise", "Silence", "Recording"]
        
        candidates = []
        for label, score in sorted_items:
            if label not in blacklist and score > 0.10:
                candidates.append((label, float(score))) # Convert numpy float to python float cho JSON
                if len(candidates) >= 5: break
        return candidates


def is_related(target, noise):
    
    t = target.lower()
    n = noise.lower()
    if t in n or n in t: return True
    music_keywords = ["music", "singing", "vocal", "song", "melody", "instrument", "band"]
    if any(k in t for k in music_keywords) and any(k in n for k in music_keywords): return True
    speech_keywords = ["speech", "talk", "conversation", "voice", "narration", "shout", "hubbub"]
    if any(k in t for k in speech_keywords) and any(k in n for k in speech_keywords): return True
    if "dog" in t and "animal" in n: return True
    if "cat" in t and "animal" in n: return True
    return False


class AdaptiveSignalProcessor:
    
    def __init__(self):
        pass
    def get_strategy(self, label):
        label = label.lower()
        if any(x in label for x in ['speech', 'voice', 'talk', 'narration', 'shout']):
            return {'method': 'wiener', 'alpha': 1.2, 'softness': 1.0}
        elif any(x in label for x in ['music', 'song', 'singing', 'melody', 'instrument', 'guitar', 'piano']):
            return {'method': 'soft_mask', 'alpha': 1.0, 'softness': 2.0}
        else:
            return {'method': 'power_mask', 'alpha': 1.5, 'softness': 1.0}

    def process(self, original_path, target_path, noise_paths, target_label):
        strategy = self.get_strategy(target_label)
        y_mix, sr = librosa.load(original_path, sr=None)
        y_target, _ = librosa.load(target_path, sr=sr)
        
        min_len = min(len(y_mix), len(y_target))
        y_mix, y_target = y_mix[:min_len], y_target[:min_len]

        n_fft, hop = 2048, 512
        S_mix = librosa.stft(y_mix, n_fft=n_fft, hop_length=hop)
        mag_mix, phase_mix = librosa.magphase(S_mix)
        
        S_target = librosa.stft(y_target, n_fft=n_fft, hop_length=hop)
        mag_target, _ = librosa.magphase(S_target)

        mag_noise_total = np.zeros_like(mag_target)
        for n_path in noise_paths:
            y_n, _ = librosa.load(n_path, sr=sr)
            y_n = y_n[:min_len]
            S_n = librosa.stft(y_n, n_fft=n_fft, hop_length=hop)
            mag_n, _ = librosa.magphase(S_n)
            mag_noise_total = np.maximum(mag_noise_total, mag_n)

        eps = 1e-10
        est_target = mag_target ** strategy['alpha']
        est_noise = mag_noise_total ** strategy['alpha']
        mask = est_target / (est_target + est_noise + eps)
        
        if strategy['method'] == 'soft_mask': mask = mask ** (1.0 / strategy['softness'])
        elif strategy['method'] == 'wiener': mask = mask * mask 

        mag_clean = mag_mix * mask
        y_clean = librosa.istft(mag_clean * phase_mix, hop_length=hop)
        return y_clean, sr

def process_option(model, audio_file, target_label, all_detected_labels, output_folder, device):
    
    noise_list = []
    skipped_list = []
    for lbl, _ in all_detected_labels:
        if lbl == target_label: continue
        if is_related(target_label, lbl): skipped_list.append(lbl) 
        else: noise_list.append(lbl)
    
    target_path = os.path.join(output_folder, f"Temp_Target_{target_label}.wav")
    separate_audio(model, audio_file, target_label, target_path, device)
    
    if not noise_list:
        final_name = f"OPTION_{target_label.replace(' ', '_')}.wav"
        y, sr = librosa.load(target_path, sr=None)
        sf.write(os.path.join(output_folder, final_name), y, sr)
        return final_name

    noise_paths = []
    for n_label in noise_list:
        n_path = os.path.join(output_folder, f"Temp_Noise_{n_label}.wav")
        if not os.path.exists(n_path):
            separate_audio(model, audio_file, n_label, n_path, device)
        noise_paths.append(n_path)

    if noise_paths:
        try:
            processor = AdaptiveSignalProcessor()
            y_clean, sr = processor.process(original_path=audio_file, target_path=target_path, noise_paths=noise_paths, target_label=target_label)
            rms = np.sqrt(np.mean(y_clean**2))
            if rms < 0.005: y_clean, sr = librosa.load(target_path, sr=None)
            final_name = f"OPTION_{target_label.replace(' ', '_')}.wav"
            sf.write(os.path.join(output_folder, final_name), y_clean, sr)
            if os.path.exists(target_path): os.remove(target_path)
            return final_name
        except Exception as e:
            final_name = f"OPTION_{target_label.replace(' ', '_')}_Raw.wav"
            y, sr = librosa.load(target_path, sr=None)
            sf.write(os.path.join(output_folder, final_name), y, sr)
            return final_name
    return None

def run_audiosep_task(task_id: str, audio_file: str, result_dir: str):
    print(f"[Task {task_id}] Đang khởi động tiến trình Smart Environment...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Tạo thư mục riêng cho task
    task_output_dir = os.path.join(result_dir, task_id)
    os.makedirs(task_output_dir, exist_ok=True)
    
    try:
        # BƯỚC 1: Quét âm thanh (CLAP)
        analyzer = SmartAnalyzer(device)
        candidates = analyzer.scan_content(audio_file)
        del analyzer
        torch.cuda.empty_cache()
        gc.collect()

        if not candidates:
            raise Exception("Không tìm thấy sự kiện âm thanh nào rõ ràng.")

        # BƯỚC 2: Tách & DSP (AudioSep)
        audiosep_model = build_audiosep(
            config_yaml='config/audiosep_base.yaml',
            checkpoint_path='checkpoint/audiosep_base_4M_steps.ckpt',
            device=device
        )

        generated_files = []
        for target_label, score in candidates:
            fname = process_option(audiosep_model, audio_file, target_label, candidates, task_output_dir, device)
            if fname:
                generated_files.append({"label": target_label, "confidence": score, "file": fname})
                
        # Dọn dẹp Temp files
        for f in os.listdir(task_output_dir):
            if f.startswith("Temp_"):
                os.remove(os.path.join(task_output_dir, f))

        # QUAN TRỌNG: Ghi kết quả báo cáo về cho React
        with open(os.path.join(task_output_dir, 'status.json'), 'w', encoding='utf-8') as f:
            json.dump({
                "status": "completed", 
                "mode": "environment",
                "tracks": generated_files # Gửi kèm danh sách nhãn để Frontend hiển thị
            }, f)
            
        print(f"[Task {task_id}] Hoàn tất xử lý Smart Environment!")

    except Exception as e:
        print(f"[Task {task_id}] Lỗi Environment Mode: {e}")
        with open(os.path.join(task_output_dir, 'status.json'), 'w', encoding='utf-8') as f:
            json.dump({"status": "error", "message": str(e)}, f)