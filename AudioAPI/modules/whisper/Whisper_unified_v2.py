#!/usr/bin/env python3
"""
Unified Karaoke Sync Pipeline v2 - Whisper.py
Tích hợp toàn bộ logic xử lý karaoke synchronization
Xử lý 3 file vocal thực tế: Ballad x2, Rap x1
So sánh kết quả với TurboScribe benchmark

Features:
  - Multi-model ASR optimization
  - Intelligent chorus detection
  - Graph-based timing reconstruction
  - Comprehensive validation & benchmarking
"""

import os
import json
import traceback
import subprocess
from pathlib import Path
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass

from modules.whisper.karaoke_core import (
    normalize_text,
    fetch_lyrics_api,
    WhisperASRPipeline,
    AlignmentEngine,
    TimingReconstructor,
    ValidationMetrics
)


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class SongConfig:
    """Configuration for each song processing"""
    audio_path: str
    song_name: str
    artist: str
    output_name: str

OUTPUT_DIR = "data/results"
SONGS_TO_PROCESS = []

# ═══════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════════════════

def process_song(config: SongConfig, asr_pipeline: WhisperASRPipeline) -> Dict:
    """Process single song"""
    print(f"\n{'='*70}")
    print(f"Processing: {config.song_name} ({config.artist})")
    print(f"{'='*70}")
    
    try:
        # Verify files exist
        if not os.path.exists(config.audio_path):
            print(f"[ERROR] Audio not found: {config.audio_path}")
            return None
        
        # Fetch lyrics from lrclib
        print("\n[LYRICS] Fetching from lrclib API...")
        reference_text = fetch_lyrics_api(config.song_name)
        
        # Xử lý Audio (Pre-processing) bằng FFmpeg để fix lỗi PyAV IndexError
        print("\n[AUDIO] Converting audio to standard 16kHz WAV...")
        safe_audio_path = str(Path(OUTPUT_DIR) / f"temp_{config.output_name}.wav")
        try:
            subprocess.run([
                "ffmpeg", "-i", config.audio_path,
                "-ac", "1", "-ar", "16000",
                "-acodec", "pcm_s16le",
                "-y", safe_audio_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            audio_to_transcribe = safe_audio_path
            print("  [AUDIO] ✓ Conversion successful")
        except Exception as e:
            print(f"  [AUDIO] ⚠️ FFmpeg error, using original file: {e}")
            audio_to_transcribe = config.audio_path

        # Transcribe audio
        print("\n[ASR] Transcribing audio...")
        whisper_segments = asr_pipeline.transcribe(audio_to_transcribe)
        
        # Xóa file temp audio sau khi nghe xong
        if audio_to_transcribe != config.audio_path and os.path.exists(audio_to_transcribe):
            try:
                os.remove(audio_to_transcribe)
            except:
                pass
        
        print(f"  [ASR] ✓ Transcribed {len(whisper_segments)} segments")
        
        if not whisper_segments:
            print("[ERROR] Transcription failed")
            return None
        
        word_accuracy = 0.0
        wer = 0.0
        
        if reference_text:
            print("\n[ALIGNMENT] Aligning to lyrics from lrclib...")
            aligner = AlignmentEngine(reference_text)
            reconstructor = TimingReconstructor()
            
            final_segments = []
            segment_id = 1
            last_match_idx = -1
            
            prev_segment = None
            for seg in whisper_segments:
                whisper_text = seg['text']
                whisper_words = seg['words']
                
                alignment = aligner.align(whisper_text)
                alignment = aligner.align(whisper_text)
                
                # --- PHẦN 1: NẾU KHÔNG TÌM THẤY TRONG LRCLIB ---
                if not alignment:
                    # SỬA LỖI MẤT CHỮ ĐUÔI: Gộp chữ lẻ tẻ vào câu hát trước đó
                    time_gap = seg.get('start', 0) - prev_segment['end'] if prev_segment else 999
                    if prev_segment is not None and time_gap < 1.5:
                        prev_segment['full_text'] += ' ' + whisper_text
                        prev_segment['words'].extend([
                            {'word': w['word'], 'start': round(w['start'], 2), 'end': round(w['end'], 2)} for w in whisper_words
                        ])
                        if prev_segment['words']:
                            prev_segment['end'] = prev_segment['words'][-1]['end']
                            
                            print(f"    [TEST TIMING] Gộp chữ '{whisper_text}' vào câu trước. Thời gian chữ này: {seg.get('start', 0)}s -> {seg.get('end', 0)}s")
                        continue

                    # Fallback cho câu độc lập (Đã XÓA điều kiện len > 6)
                    if seg.get('confidence', 0) > 0.6:
                        final_segments.append({
                            'segment_id': segment_id,
                            'full_text': whisper_text,
                            'start': round(seg.get('start', 0), 2),
                            'end': round(seg.get('end', 0), 2),
                            'words': [
                                {'word': w['word'], 'start': round(w['start'], 2), 'end': round(w['end'], 2)} for w in whisper_words
                            ],
                            'confidence': round(seg.get('confidence', 0), 3)
                        })
                        segment_id += 1
                        prev_segment = final_segments[-1] 
                    else:
                        print(f"    [WARN] Bỏ qua tạp âm: '{whisper_text[:30]}...'")
                    continue
                
                # --- PHẦN 2: NẾU TÌM THẤY TRONG LRCLIB ---
                matched_text, match_idx, score = alignment
                # Nếu map trùng dòng lrclib với segment trước, thì merge vào segment trước đó
                if match_idx == last_match_idx and prev_segment is not None:
                    prev_segment['full_text'] += ' ' + whisper_text
                    prev_segment['words'].extend([
                        {'word': w['word'], 'start': round(w['start'], 2), 'end': round(w['end'], 2)} for w in whisper_words
                    ])
                    if prev_segment['words']:
                        prev_segment['end'] = prev_segment['words'][-1]['end']
                        print(f"    [TEST TIMING] Gộp chữ '{whisper_text}' vào câu trước. Thời gian chữ này: {seg.get('start', 0)}s -> {seg.get('end', 0)}s")
                        
                    prev_segment['confidence'] = max(prev_segment['confidence'], round(score, 3))
                    continue
                last_match_idx = match_idx
                
                # Reconstruct timing ( dùng text Whisper)
                aligned_words = reconstructor.reconstruct(
                    whisper_words,
                    whisper_text,
                    seg.get('start', 0),
                    seg.get('end', 0)
                )
                if aligned_words:
                    new_segment = {
                        'segment_id': segment_id,
                        'full_text': whisper_text,
                        'start': aligned_words[0]['start'],
                        'end': aligned_words[-1]['end'] if aligned_words else round(seg.get('end', 0), 2),
                        'words': aligned_words,
                        'confidence': round(score, 3)
                    }
                    final_segments.append(new_segment)
                    prev_segment = new_segment
                    segment_id += 1
            
            print(f"  [ALIGNMENT] ✓ Aligned {len(final_segments)} segments")
            pipeline_version = '2.2_lrclib_aligned'
            
            # Validation against lrclib text
            pred_words = []
            for seg in final_segments:
                pred_words.extend(seg['words'])
                
            reference_words_list = reference_text.split()
            pred_word_texts = [normalize_text(w.get('word', '')) for w in pred_words]
            truth_word_texts = [normalize_text(w) for w in reference_words_list]
            
            wer = ValidationMetrics.calculate_wer(pred_word_texts, truth_word_texts)
            word_accuracy = 1.0 - wer
            print(f"  [METRICS] Word Accuracy (vs lrclib): {word_accuracy:.1%}")
            
        else:
            print("\n[ALIGNMENT] Không tìm thấy lyrics từ lrclib. Giữ nguyên kết quả ASR...")
            final_segments = []
            for i, seg in enumerate(whisper_segments, 1):
                final_segments.append({
                    'segment_id': i,
                    'full_text': seg['text'],
                    'start': round(seg['start'], 2),
                    'end': round(seg['end'], 2),
                    'words': [{
                        'word': w['word'],
                        'start': round(w['start'], 2),
                        'end': round(w['end'], 2)
                    } for w in seg['words']],
                    'confidence': round(seg['confidence'], 3)
                })
            pipeline_version = '2.2_raw_asr'

            # Save Whisper-only output to a new file if no lyrics found
            whisper_only_path = Path(OUTPUT_DIR) / f"{config.song_name}_whisper_only_full.txt"
            with open(whisper_only_path, 'w', encoding='utf-8') as f:
                for seg in final_segments:
                    f.write(f"{seg['full_text']}\n")
            print(f"[SAVE] ✓ Saved Whisper-only lyrics: {whisper_only_path}")
        
        # Build output
        output = {
            'metadata': {
                'song': config.song_name,
                'artist': config.artist,
                'audio_file': config.audio_path,
                'total_segments': len(final_segments),
                'pipeline_version': pipeline_version
            },
            'segments': final_segments,
            'validation': {
                'word_accuracy': round(word_accuracy, 3),
                'wer': round(wer, 3),
                'mean_timing_error_ms': 0.0,
                'median_timing_error_ms': 0.0,
                'max_timing_error_ms': 0.0
            }
        }
        
        return output
    except Exception as e:
        print(f"\n[ERROR] Lỗi không xác định khi xử lý bài hát {config.song_name}: {e}")
        traceback.print_exc()
        return None


def main():
    """Main entry point"""
    print("\n" + "="*70)
    print(" KARAOKE SYNC PIPELINE v2 - UNIFIED WHISPER.PY ".center(70, "="))
    print("="*70)
    print(f"Output directory: {OUTPUT_DIR}\n")
    
    # Create output directory
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    # Initialize ASR pipeline
    asr_pipeline = WhisperASRPipeline(model_size="medium")
    
    # Process each song
    results = {}
    for config in SONGS_TO_PROCESS:
        try:
            output = process_song(config, asr_pipeline)
            
            # Ghi file an toàn: Bắt buộc phải có segments thì mới xuất file json
            if output and output.get('segments'):
                results[config.output_name] = output
                
                # Save JSON
                output_path = Path(OUTPUT_DIR) / f"{config.output_name}_v2.json"
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(output, f, ensure_ascii=False, indent=2)
                
                # Save LRC (Lyrics format with timestamps)
                lrc_path = Path(OUTPUT_DIR) / f"{config.output_name}.lrc"
                with open(lrc_path, 'w', encoding='utf-8') as f:
                    f.write(f"[ti:{config.song_name}]\n")
                    f.write(f"[ar:{config.artist}]\n")
                    for seg in output['segments']:
                        minutes = int(seg['start'] // 60)
                        seconds = seg['start'] % 60
                        f.write(f"[{minutes:02d}:{seconds:05.2f}] {seg['full_text']}\n")
                        
                # Save plain text Lyrics
                txt_path = Path(OUTPUT_DIR) / f"{config.output_name}.txt"
                with open(txt_path, 'w', encoding='utf-8') as f:
                    for seg in output['segments']:
                        f.write(f"{seg['full_text']}\n")
                
                print(f"\n  [SAVE] ✓ Saved JSON: {output_path}")
                print(f"  [SAVE] ✓ Saved LRC:  {lrc_path}")
                print(f"  [SAVE] ✓ Saved TXT:  {txt_path}")
            else:
                print(f"\n  [SKIP] Dữ liệu rỗng, bỏ qua bước lưu file cho {config.song_name}.")
        except Exception as e:
            print(f"\n  [ERROR] Lỗi không xác định với bài hát {config.song_name}: {e}")
            traceback.print_exc()
    
    # Summary report
    print("\n" + "="*70)
    print("SUMMARY REPORT".center(70))
    print("="*70)
    
    summary = {
        'total_songs': len(SONGS_TO_PROCESS),
        'processed': len(results),
        'songs': {}
    }
    
    for name, output in results.items():
        summary['songs'][name] = {
            'song': output['metadata']['song'],
            'artist': output['metadata']['artist'],
            'segments': output['metadata']['total_segments'],
            'word_accuracy': output['validation']['word_accuracy'],
            'mean_timing_error_ms': output['validation']['mean_timing_error_ms']
        }
    
    # Save summary
    summary_path = Path(OUTPUT_DIR) / "summary.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print("\nResults:")
    for name, data in summary['songs'].items():
        print(f"\n  {data['song']} ({data['artist']})")
        print(f"    Segments: {data['segments']}")
        print(f"    Word Accuracy: {data['word_accuracy']:.1%}")
        print(f"    Timing Error: {data['mean_timing_error_ms']:.1f}ms")
    
    print("\n" + "="*70)
    print(f"All results saved to: {OUTPUT_DIR}".center(70))
    print("="*70 + "\n")


if __name__ == "__main__":
    main()


def run_whisper_task(task_id: str, vocal_path: str, song_name: str, result_dir: str):
    """
    Hàm này nhận tham số động từ FastAPI và chạy quy trình nhận diện lời bài hát.
    """
    import os
    import json
    
    print(f"[Task {task_id}] Đang khởi động Whisper Engine cho bài: {song_name}...")
    
    # Tạo thư mục động theo task_id (Ví dụ: data/results/abc-123)
    task_output_dir = os.path.join(result_dir, task_id)
    os.makedirs(task_output_dir, exist_ok=True)
    
    # Khởi tạo cấu hình tự động (Không cần hardcode file D:\DATN nữa)
    config = SongConfig(
        audio_path=vocal_path,
        song_name=song_name or "Unknown Song",
        artist="Unknown Artist",
        output_name= song_name or "Unknown Song" 
    )
    
    # Khởi tạo Model
    asr_pipeline = WhisperASRPipeline(model_size="medium")
    
    try:
        # Chạy thuật toán lõi
        output = process_song(config, asr_pipeline)
        
        if output and output.get('segments'):
           # ...
            # Lưu JSON động vào đúng thư mục của user
            json_path = os.path.join(task_output_dir, "lyrics.json")
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
                
            try:
                # SỬA LẠI ĐƯỜNG DẪN IMPORT Ở ĐÂY CHO ĐÚNG:
                from modules.check_lyrics import run_checks
                # Chạy tool kiểm tra 
                report = run_checks(data=output, file_path=json_path)
                
                # Ép dữ liệu thành JSON để React đọc được
                issues_data = [
                    {
                        "level": i.level,
                        "category": i.category,
                        "segment_id": i.segment_id,
                        "message": i.message,
                        "suggestion": i.suggestion,
                    }
                    for i in report.issues
                ]
                
                # Lưu file issues.json bên cạnh lyrics.json
                issues_path = os.path.join(task_output_dir, "issues.json")
                with open(issues_path, 'w', encoding='utf-8') as f:
                    json.dump(issues_data, f, ensure_ascii=False, indent=2)
                    
            except Exception as check_err:
                print(f"[Task {task_id}] Không thể chạy check_lyrics: {check_err}")
                import traceback
                traceback.print_exc() # In ra lỗi chi tiết để dễ debug nếu vẫn lỗi
                
            print(f"[Task {task_id}] Hoàn tất xuất file: {json_path}")
            return True
        else:
            print(f"[Task {task_id}] Lỗi: Dữ liệu Whisper trả về rỗng.")
            return False
            
    except Exception as e:
        print(f"[Task {task_id}] Lỗi hệ thống Whisper: {e}")
        return False