import json
import sys
import os

def ass_header():
    return """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: KaraTop, Impact, 65, &H000000FF, &H00FFFFFF, &H00000000, &H80000000, 0, 0, 0, 0, 100, 110, 0, 0, 1, 5, 3, 1, 40, 40, 130, 1
Style: KaraBot, Impact, 65, &H000000FF, &H00FFFFFF, &H00000000, &H80000000, 0, 0, 0, 0, 100, 110, 0, 0, 1, 5, 3, 3, 40, 40, 30, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"""

def ass_time(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h:d}:{m:02d}:{s:05.2f}"

def build_karaoke_line(words):
    line = ""
    prev_end = None
    for w in words:
        clean_word = w['word'].replace(',', '').replace('.', '')
        # Hấp thụ khoảng lặng giữa các chữ để màu chạy không bị lệch
        if prev_end is not None:
            gap = w['start'] - prev_end
            if gap > 0:
                gap_k = int(round(gap * 100))
                line += f"{{\\k{gap_k}}} "
            else:
                line += " "
        
        dur = max(0, w['end'] - w['start'])
        k = int(round(dur * 100))
        line += f"{{\\kf{k}}}{clean_word}"
        prev_end = w['end']
        
    return line

def split_long_segments(segments, max_words=7):
    """
    Tự động chia nhỏ câu hát liên tục với các quy tắc thông minh:
    1. Ưu tiên ngắt trước chữ Viết Hoa (để mở đầu câu mới).
    2. Chống "mồ côi" chữ: Nếu ngắt mà làm 1 chữ bị rớt xuống dòng một mình trước chữ Viết Hoa, 
       thì thu gom chữ đó lên dòng trên luôn.
    """
    new_segments = []
    
    for seg in segments:
        words = seg.get('words', [])
        if not words:
            continue
            
        chunk = []
        i = 0
        n = len(words)
        
        while i < n:
            w = words[i]
            # Lọc dấu câu để kiểm tra viết hoa/thường cho chuẩn
            clean_word = w['word'].strip().strip(',.?!')
            is_upper = clean_word[0].isupper() if clean_word else False
            
            # --- QUY TẮC 1: Ưu tiên ngắt trước chữ Viết Hoa ---
            # Nếu chữ hiện tại Viết Hoa, và dòng hiện tại đã có một đoạn (>= 4 chữ)
            # Thì ta đóng gói dòng cũ lại và mở dòng mới bắt đầu bằng chữ Viết Hoa này.
            if is_upper and len(chunk) >= 4:
                new_segments.append({
                    'start': chunk[0]['start'],
                    'end': chunk[-1]['end'],
                    'words': chunk
                })
                chunk = [] 
                
            chunk.append(w)
            
            # --- QUY TẮC 2: Ngắt khi quá dài & NGOẠI LỆ (Chống mồ côi) ---
            if len(chunk) >= max_words or (',' in w['word'] and len(chunk) >= 4):
                
                # NGHIỆP VỤ XỬ LÝ NGOẠI LỆ
                # Kiểm tra chữ tiếp theo (i+1) và chữ sau nó (i+2)
                if i + 2 < n:
                    next_w = words[i+1]['word'].strip().strip(',.?!')
                    next_next_w = words[i+2]['word'].strip().strip(',.?!')
                    
                    next_is_lower = next_w[0].islower() if next_w else False
                    next_next_is_upper = next_next_w[0].isupper() if next_next_w else False
                    
                    # Nếu cắt bây giờ, chữ "mãi" (lower) sẽ rớt xuống, rồi đụng chữ "Bây" (Upper)
                    # => Hút luôn chữ "mãi" lên dòng này!
                    if next_is_lower and next_next_is_upper:
                        chunk.append(words[i+1])
                        i += 1 # Tăng index để vòng lặp nhảy cóc qua chữ đã bị hút
                
                # Thực hiện ngắt dòng
                new_segments.append({
                    'start': chunk[0]['start'],
                    'end': chunk[-1]['end'],
                    'words': chunk
                })
                chunk = []
                
            i += 1
            
        # Đóng gói nốt những chữ còn sót lại ở cuối cùng
        if chunk:
            new_segments.append({
                'start': chunk[0]['start'],
                'end': chunk[-1]['end'],
                'words': chunk
            })
            
    return new_segments

def json_to_ass(input_json, output_ass):
    with open(input_json, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    original_segments = data.get('segments', [])
    # Ép max_words=7 để vừa khít màn hình 1280px cho font size 65
    segments = split_long_segments(original_segments, max_words=7)
    
    events = []
    prev_start = 0.0
    prev_end = 0.0
    
    current_line = 1 
    force_next_start = None  

    for i, seg in enumerate(segments):
        start = seg['start']
        end = seg['end']
        
        countdown = False
        gap = start - prev_end
        
        if i == 0 or gap >= 6.0:
            countdown = True
            new_start = max(0, start - 6.0) 
            current_line = 0  
            force_next_start = new_start  
        else:
            current_line = 1 - current_line  
            
            if force_next_start is not None:
                new_start = force_next_start 
                force_next_start = None      
            else:
                half_prev = prev_start + (prev_end - prev_start) * 0.4
                new_start = min(half_prev, start - 1.5)
                new_start = max(0, new_start)
            
        if current_line == 0:
            style = "KaraTop"
            pos_tag = "\\pos(40,590)"
        else:
            style = "KaraBot"
            pos_tag = "\\pos(1240,690)"
            
        kara_text = build_karaoke_line(seg['words'])
        
        # LOGIC 1 DẤU CHẤM
        dots = '{\\k100}. \\k100}.\\k100}.' if countdown else ''
        
        wait_time = int(round((start - new_start) * 100))
        if countdown:
            silence = wait_time - 100 # Trừ 1 giây cho 1 dấu chấm
            if silence > 0:
                text_line = f"{{\\k{silence}}}{dots}{kara_text}"
            else:
                text_line = dots + kara_text
        else:
            if wait_time > 0:
                text_line = f"{{\\k{wait_time}}}" + kara_text
            else:
                text_line = kara_text
            
        # Thêm thẻ \pos vào ngay đầu mỗi câu hát
        text_line = f"{{{pos_tag}\\fad(0,500)}}" + text_line
        event_end = end + 0.5 
            
        events.append(f"Dialogue: 0,{ass_time(new_start)},{ass_time(event_end)},{style},,0,0,0,,{text_line}")

        prev_start = start
        prev_end = end

    with open(output_ass, 'w', encoding='utf-8-sig') as f:
        f.write(ass_header() + '\n')
        for ev in events:
            f.write(ev + '\n')
            
    print(f"[THÀNH CÔNG] Đã xuất file Subtitle hoàn hảo: {output_ass}")

if __name__ == "__main__":
    # Test block
    pass