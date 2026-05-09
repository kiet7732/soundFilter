#!/usr/bin/env python3
"""
Karaoke Core Modules
Chứa các class và hàm hỗ trợ cho quá trình đồng bộ lyrics.
"""

import re
import requests
import unicodedata
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np
from difflib import SequenceMatcher
from rapidfuzz import fuzz

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("[ERROR] faster_whisper not installed. Run: pip install faster-whisper")
    exit(1)


# ═══════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def normalize_text(text: str) -> str:
    """Normalize text for comparison"""
    text = text.lower()
    text = unicodedata.normalize('NFC', text)
    text = re.sub(r'[^\w\s]', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def parse_srt_to_lyrics(srt_file: str) -> Tuple[List[str], List[Tuple[float, float]]]:
    """Parse SRT file to extract lyrics and timings"""
    lines = Path(srt_file).read_text(encoding='utf-8').strip().split('\n')
    
    lyrics = []
    timings = []
    i = 0
    
    while i < len(lines):
        if not lines[i].strip() or lines[i].isdigit():
            i += 1
            continue
        
        if '-->' in lines[i]:
            timecode = lines[i]
            text = lines[i + 1] if i + 1 < len(lines) else ""
            
            # Parse time
            times = re.findall(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})', timecode)
            if len(times) >= 2:
                start_parts = times[0]
                end_parts = times[1]
                
                start = int(start_parts[0])*3600 + int(start_parts[1])*60 + int(start_parts[2]) + int(start_parts[3])/1000
                end = int(end_parts[0])*3600 + int(end_parts[1])*60 + int(end_parts[2]) + int(end_parts[3])/1000
                
                if text.strip() and not text.lower().startswith('la la la'):
                    lyrics.append(text.strip())
                    timings.append((start, end))
            
            i += 2
        else:
            i += 1
    
    return lyrics, timings


def fetch_lyrics_api(song_name: str) -> Optional[str]:
    """Fetch lyrics from lrclib.net API"""
    print(f"  [API] Searching: {song_name}...")
    url = f"https://lrclib.net/api/search?q={requests.utils.quote(song_name)}"
    
    try:
        resp = requests.get(url, timeout=15)
        data = resp.json()
        
        if data and isinstance(data, list):
            for item in data:
                if item.get('plainLyrics'):
                    print(f"  [API] ✓ Found: {item['trackName']} - {item['artistName']}")
                    return item['plainLyrics']
        
        print("  [API] No lyrics found in API")
        return None
        
    except Exception as e:
        print(f"  [API] Error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════
# WHISPER ASR PIPELINE
# ═══════════════════════════════════════════════════════════════════════════

class WhisperASRPipeline:
    """Optimized Whisper ASR for Vietnamese singing"""
    
    def __init__(self, model_size: str = "medium"):
        self.model_size = model_size
        self.model = None
        print(f"[INIT] Loading Whisper model: {model_size}...")
        self.model = WhisperModel(
            model_size,
            device="cuda",
            compute_type="float16"
        )
    
    def transcribe(self, audio_path: str, initial_prompt: Optional[str] = None) -> List[Dict]:
        """Transcribe audio with optimized parameters"""
        print(f"  [ASR] Transcribing with {self.model_size}...")
        
        segments, info = self.model.transcribe(
            audio_path,
            beam_size=5,
            best_of=5,
            language="vi",
            word_timestamps=True,
            condition_on_previous_text=True,  # Đổi thành True để AI giữ được mạch câu sau khoảng nghỉ
            vad_filter=True,
            vad_parameters=dict(
                threshold=0.25,               # HẠ XUỐNG 0.25: Cực kỳ nhạy. Bắt được cả tiếng ngân thì thầm hoặc tiếng lấy hơi nhỏ nhất của ca sĩ Bolero.
                min_silence_duration_ms=2000, # mức 2000ms: Vẫn đảm bảo cắt bỏ chính xác các đoạn nhạc dạo dài.
                speech_pad_ms=1200            # MỨC ĐỆM 1.2 GIÂY: Đây là giới hạn an toàn tối đa. Đủ để bọc hậu cho Bolero mà không bị lẹm sang câu sau của nhạc Rap.
            ),
            temperature=0.0,
            initial_prompt=initial_prompt
        )
        
        result = []
        for seg in segments:
            words = []
            if hasattr(seg, 'words') and seg.words:
                for w in seg.words:
                    duration = abs(w.end - w.start)
                    if duration >= 0.01:
                        words.append({
                            'word': w.word.strip(),
                            'start': w.start,
                            'end': w.end
                        })
            
            if words:
                raw_text = " ".join([w['word'] for w in words]).strip()
                result.append({
                    'text': raw_text,
                    'words': words,
                    'start': seg.start,
                    'end': seg.end,
                    'confidence': 1.0 - (seg.no_speech_prob if hasattr(seg, 'no_speech_prob') else 0)
                })
        
        # Xử lý hiện tượng ảo giác (Hallucination) của Whisper
        deduped_result = []
        last_norm_text = ""
        for seg in result:
            norm_text = normalize_text(seg['text'])
            # Bỏ qua nếu câu bị lặp lại y hệt liên tiếp
            if norm_text == last_norm_text and norm_text != "":
                print(f"    [FILTER] Lọc bỏ câu ảo giác: '{seg['text']}'")
                continue
            deduped_result.append(seg)
            last_norm_text = norm_text
            
        return deduped_result


# ═══════════════════════════════════════════════════════════════════════════
# ALIGNMENT ENGINE
# ═══════════════════════════════════════════════════════════════════════════

class AlignmentEngine:
    """Intelligent alignment with multiple strategies"""
    
    def __init__(self, reference_lyrics: str):
        self.reference_lines = [
            line.strip() 
            for line in reference_lyrics.split('\n') 
            if line.strip()
        ]
        self.current_position = 0
        self.chorus_groups = self._detect_chorus_groups()
    
    def _detect_chorus_groups(self) -> Dict[int, List[int]]:
        """Detect repeated lyrics (choruses)"""
        repeated = {}
        normalized = [normalize_text(line) for line in self.reference_lines]
        
        for i in range(len(normalized)):
            if i in repeated:
                continue
            
            similar = [i]
            for j in range(i + 1, len(normalized)):
                score = fuzz.token_set_ratio(normalized[i], normalized[j]) / 100.0
                if score >= 0.85:
                    similar.append(j)
            
            if len(similar) > 1:
                for idx in similar:
                    repeated[idx] = similar
        
        return repeated
    
    def align(self, whisper_text: str) -> Optional[Tuple[str, int, float]]:
        """Find best matching line in reference lyrics"""
        whisper_norm = normalize_text(whisper_text)
        
        # Sliding window search
        search_start = max(0, self.current_position - 1)
        search_end = min(len(self.reference_lines), self.current_position + 5)
        
        best_score = 0
        best_idx = -1
        
        for i in range(search_start, search_end):
            ref_norm = normalize_text(self.reference_lines[i])
            score = fuzz.token_set_ratio(whisper_norm, ref_norm) / 100.0
            
            if score > best_score:
                best_score = score
                best_idx = i
        
        # If good match found, update position
        if best_score >= 0.35 and best_idx >= 0:
            self.current_position = best_idx + 1
            return self.reference_lines[best_idx], best_idx, best_score
        
        # Full search as fallback
        for i in range(len(self.reference_lines)):
            ref_norm = normalize_text(self.reference_lines[i])
            score = fuzz.token_set_ratio(whisper_norm, ref_norm) / 100.0
            
            if score > best_score:
                best_score = score
                best_idx = i
        
        if best_idx >= 0 and best_score >= 0.35:
            return self.reference_lines[best_idx], best_idx, best_score
        
        return None


# ═══════════════════════════════════════════════════════════════════════════
# TIMING RECONSTRUCTION
# ═══════════════════════════════════════════════════════════════════════════

class TimingReconstructor:
    """Reconstruct word-level timing"""
    
    @staticmethod
    def reconstruct(whisper_words: List[Dict], reference_text: str, 
                   segment_start: float, segment_end: float) -> List[Dict]:
        """Reconstruct timing for reference words"""
        if not whisper_words or not reference_text:
            return []
        
        reference_words = reference_text.split()
        whisper_count = len(whisper_words)
        ref_count = len(reference_words)
        
        # Case 1: Perfect count match
        if whisper_count == ref_count:
            return [
                {
                    'word': reference_words[i],
                    'start': round(whisper_words[i]['start'], 2),
                    'end': round(whisper_words[i]['end'], 2)
                }
                for i in range(ref_count)
            ]
        
        # Case 2: Mismatch - distribute by character length
        total_chars = sum(len(w) for w in reference_words)
        if total_chars == 0:
            total_chars = len(reference_words)
        
        total_duration = segment_end - segment_start
        result = []
        current_time = segment_start
        
        for word in reference_words:
            char_ratio = len(word) / total_chars
            word_duration = total_duration * char_ratio
            word_end = current_time + word_duration
            
            result.append({
                'word': word,
                'start': round(current_time, 2),
                'end': round(word_end, 2)
            })
            current_time = word_end
        
        # Ensure last word ends exactly at segment_end
        if result:
            result[-1]['end'] = round(segment_end, 2)
        
        return result


# ═══════════════════════════════════════════════════════════════════════════
# VALIDATION & METRICS
# ═══════════════════════════════════════════════════════════════════════════

class ValidationMetrics:
    """Calculate quality metrics"""
    
    @staticmethod
    def calculate_wer(predicted_words: List[str], truth_words: List[str]) -> float:
        """Word Error Rate"""
        matcher = SequenceMatcher(None, predicted_words, truth_words)
        matches = sum(block.size for block in matcher.get_matching_blocks())
        
        if len(truth_words) == 0:
            return 0.0
        
        wer = 1.0 - (matches / len(truth_words))
        return min(1.0, max(0.0, wer))
    
    @staticmethod
    def calculate_timing_error(predicted: List[Dict], truth: List[Dict]) -> Tuple[float, float, float]:
        """Mean, median, max timing error (in seconds)"""
        if not predicted or not truth:
            return 0.0, 0.0, 0.0
        
        errors = []
        for i, (p, t) in enumerate(zip(predicted, truth)):
            start_err = abs(float(p.get('start', 0)) - float(t.get('start', 0)))
            end_err = abs(float(p.get('end', 0)) - float(t.get('end', 0)))
            errors.append(max(start_err, end_err))
        
        if not errors:
            return 0.0, 0.0, 0.0
        
        errors.sort()
        mean_err = np.mean(errors)
        median_err = errors[len(errors) // 2]
        max_err = max(errors)
        
        return mean_err, median_err, max_err