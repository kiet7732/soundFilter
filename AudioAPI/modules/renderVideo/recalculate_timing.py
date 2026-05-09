def update_lyrics_in_json(input_json_path, segment_id, new_text, output_json_path):
    """
    Trình sửa cho ngdung
    Cập nhật lyrics cho 1 segment trong file JSON, đánh dấu thủ công, lưu ra file mới.
    """
    import json
    try:
        with open(input_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Lỗi đọc file: {e}")
        return False
    segments = data.get('segments', [])
    found = False
    for idx, seg in enumerate(segments):
        if seg.get('segment_id') == segment_id:
            updated_segment = ReCalculateTiming(seg, new_text)
            updated_segment['is_manually_edited'] = True
            segments[idx] = updated_segment
            found = True
            break
    if not found:
        print(f"Không tìm thấy segment_id = {segment_id}")
        return False
    data['segments'] = segments
    try:
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Lỗi ghi file: {e}")
        return False
    return True

def ReCalculateTiming(old_segment, new_text):
    """
    Karaoke timing: Chỉ phân bổ lại vùng bị chỉnh sửa (lõi), giữ nguyên hoàn toàn các timestamp và khoảng nghỉ ở đầu/cuối (prefix/suffix), không ép liền mạch tuyệt đối.
    """
    import re
    def split_words(text):
        return [w for w in re.split(r'\s+', text.strip()) if w]

    old_words = old_segment['words']
    segment_start = old_segment['start']
    segment_end = old_segment['end']
    new_words = split_words(new_text)
    n_old = len(old_words)
    n_new = len(new_words)

    # Tìm prefix giống nhau
    prefix_len = 0
    while prefix_len < min(n_old, n_new) and old_words[prefix_len]['word'] == new_words[prefix_len]:
        prefix_len += 1
    # Tìm suffix giống nhau
    suffix_len = 0
    while (suffix_len < (n_old - prefix_len) and suffix_len < (n_new - prefix_len)
           and old_words[-(suffix_len+1)]['word'] == new_words[-(suffix_len+1)]):
        suffix_len += 1

    # Nếu toàn bộ là giống nhau (chỉ sửa chữ, không thêm/xóa)
    if prefix_len + suffix_len == n_old == n_new:
        new_word_objs = []
        for i, word in enumerate(new_words):
            w = dict(old_words[i])
            w['word'] = word
            new_word_objs.append(w)
        return {
            **old_segment,
            'full_text': new_text,
            'words': new_word_objs
        }

    # Ghép prefix 
    new_word_objs = []
    for i in range(prefix_len):
        w = dict(old_words[i])
        w['word'] = new_words[i]
        new_word_objs.append(w)

    # Xác định vùng lõi cần phân bổ lại
    core_old = old_words[prefix_len:n_old-suffix_len if suffix_len > 0 else None]
    core_new = new_words[prefix_len:n_new-suffix_len if suffix_len > 0 else None]
    # Nếu không có từ cũ nào trong lõi (thêm mới hoàn toàn), mượn nhịp từ biên
    if core_old:
        core_start = core_old[0]['start']
        core_end = core_old[-1]['end']
    else:
        # Thêm vào đầu
        if prefix_len == 0:
            core_start = segment_start
            core_end = old_words[0]['start'] if old_words else segment_end
        # Thêm vào cuối
        else:
            core_start = old_words[-1]['end']
            core_end = segment_end
    # Phân bổ lại vùng lõi
    total_chars = sum(len(w) for w in core_new)
    duration = core_end - core_start
    time_per_char = duration / total_chars if total_chars > 0 else 0
    t = core_start
    for idx, word in enumerate(core_new):
        word_len = len(word)
        word_start = t
        if idx == len(core_new) - 1:
            word_end = core_end
        else:
            word_end = t + word_len * time_per_char
        new_word_objs.append({'word': word, 'start': word_start, 'end': word_end})
        t = word_end

    # Ghép suffix 
    for i in range(n_old-suffix_len, n_old):
        w = dict(old_words[i])
        w['word'] = new_words[prefix_len + len(core_new) + (i - (n_old-suffix_len))]
        new_word_objs.append(w)

    return {
        **old_segment,
        'full_text': new_text,
        'words': new_word_objs
    }
