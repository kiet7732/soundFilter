#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lyrics_checker.py
=================
Công cụ kiểm tra chất lượng lyrics tiếng Việt từ file JSON pipeline.

Các cơ chế phát hiện:
  1. Thiếu lyrics  — segment/word rỗng, khoảng trống thời gian bất thường,
                     mật độ từ quá thấp, thời lượng quá ngắn
  2. Sai chính tả — từ không hợp lệ theo quy tắc tiếng Việt (dấu thanh,
                     phụ âm đầu/cuối, tổ hợp vần), danh sách lỗi phổ biến
  3. Confidence   — cảnh báo segment có độ tin cậy thấp
  4. Định dạng    — thiếu trường bắt buộc, timestamp âm/đảo ngược

"""

import json
import re
import sys
import argparse
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
from datetime import datetime

# ──────────────────────────────────────────────────────────────────────────────
# Cấu hình mặc định
# ──────────────────────────────────────────────────────────────────────────────
DEFAULT_CONF_THRESHOLD   = 0.75   # confidence thấp hơn → cảnh báo
DEFAULT_GAP_THRESHOLD    = 5.0    # khoảng im lặng (giây) → nghi thiếu segment
DEFAULT_MIN_WORD_RATE    = 0.5    # từ/giây tối thiểu cho segment hợp lệ
DEFAULT_MIN_SEG_DURATION = 0.3    # giây — ngắn hơn rất nghi

# ──────────────────────────────────────────────────────────────────────────────
# Từ điển âm vị học tiếng Việt
# ──────────────────────────────────────────────────────────────────────────────

# Dấu thanh hợp lệ (đã bao gồm không dấu)
VALID_TONES = {
    "a": ["a", "à", "á", "ả", "ã", "ạ"],
    "ă": ["ă", "ằ", "ắ", "ẳ", "ẵ", "ặ"],
    "â": ["â", "ầ", "ấ", "ẩ", "ẫ", "ậ"],
    "e": ["e", "è", "é", "ẻ", "ẽ", "ẹ"],
    "ê": ["ê", "ề", "ế", "ể", "ễ", "ệ"],
    "i": ["i", "ì", "í", "ỉ", "ĩ", "ị"],
    "o": ["o", "ò", "ó", "ỏ", "õ", "ọ"],
    "ô": ["ô", "ồ", "ố", "ổ", "ỗ", "ộ"],
    "ơ": ["ơ", "ờ", "ớ", "ở", "ỡ", "ợ"],
    "u": ["u", "ù", "ú", "ủ", "ũ", "ụ"],
    "ư": ["ư", "ừ", "ứ", "ử", "ữ", "ự"],
    "y": ["y", "ỳ", "ý", "ỷ", "ỹ", "ỵ"],
}

# Tất cả nguyên âm hợp lệ (flat)
ALL_VOWELS = set(v for lst in VALID_TONES.values() for v in lst)

# Phụ âm đầu hợp lệ (onset)
VALID_ONSETS = {
    "b", "c", "ch", "d", "đ", "g", "gh", "gi", "h", "k", "kh",
    "l", "m", "n", "ng", "ngh", "nh", "p", "ph", "q", "qu", "r",
    "s", "t", "th", "tr", "v", "x", ""
}

# Phụ âm cuối hợp lệ (coda)
VALID_CODAS = {
    "", "c", "ch", "m", "n", "ng", "nh", "p", "t"
}

# Lỗi chính tả phổ biến: (sai → đúng)
COMMON_TYPOS = {
    # nhầm phụ âm
    "ko":   "không",
    "k":    "không",
    "mk":   "mình",
    "dc":   "được",
    "đc":   "được",
    "nx":   "nữa",
    "vs":   "với",
    "ms":   "mới",
    "đừg":  "đừng",
    "trg":  "trong",
    "ng":   "người",   # nếu đứng độc lập
    "j":    "gì",
    "z":    "vậy",
    "wa":   "qua",
    # nhầm dấu thanh
    "sao":  None,      # hợp lệ — không phải lỗi
    "nao":  "nào",
    "rôi":  "rồi",
    "thôi": None,      # hợp lệ
}

# Các ký tự không hợp lệ trong lyrics tiếng Việt
INVALID_CHARS_PATTERN = re.compile(r"[^a-zA-ZÀ-ỹà-ỹ\s\-\'\".,!?]", re.UNICODE)

# ──────────────────────────────────────────────────────────────────────────────
# Cấu trúc dữ liệu kết quả
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class Issue:
    """Một vấn đề được phát hiện."""
    level:      str   # "ERROR" | "WARNING" | "INFO"
    category:   str   # "MISSING_LYRICS" | "SPELLING" | "CONFIDENCE" | "FORMAT"
    segment_id: int
    time_range: str
    message:    str
    suggestion: Optional[str] = None

    def __str__(self):
        parts = [
            f"[{self.level}]",
            f"Segment {self.segment_id:02d}",
            f"({self.time_range})",
            f"[{self.category}]",
            self.message,
        ]
        s = "  ".join(parts)
        if self.suggestion:
            s += f"\n Gợi ý: {self.suggestion}"
        return s


@dataclass
class CheckReport:
    """Tổng hợp kết quả kiểm tra."""
    file_path:   str
    song:        str
    artist:      str
    checked_at:  str
    issues:      List[Issue] = field(default_factory=list)
    total_segs:  int = 0
    total_words: int = 0

    @property
    def errors(self):
        return [i for i in self.issues if i.level == "ERROR"]

    @property
    def warnings(self):
        return [i for i in self.issues if i.level == "WARNING"]

    @property
    def infos(self):
        return [i for i in self.issues if i.level == "INFO"]

    def summary(self) -> str:
        return (
            f"Tổng: {len(self.issues)} vấn đề  "
            f"({len(self.errors)} lỗi  |  "
            f"{len(self.warnings)} cảnh báo  |  "
            f"{len(self.infos)} thông tin)"
        )


# ──────────────────────────────────────────────────────────────────────────────
# Các hàm kiểm tra âm vị học tiếng Việt
# ──────────────────────────────────────────────────────────────────────────────

def strip_tone(char: str) -> str:
    """Loại bỏ dấu thanh khỏi một ký tự nguyên âm."""
    return unicodedata.normalize("NFD", char)[0]


def has_vowel(word: str) -> bool:
    """Kiểm tra từ có chứa nguyên âm (bắt buộc trong tiếng Việt)."""
    word_lower = word.lower()
    for ch in word_lower:
        if ch in ALL_VOWELS:
            return True
    return False


def count_tones(word: str) -> int:
    """Đếm số dấu thanh trong từ (tiếng Việt chuẩn chỉ có 1 dấu thanh/âm tiết)."""
    tone_marks = "àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ"
    count = 0
    for ch in word.lower():
        if ch in tone_marks:
            count += 1
    return count


def check_invalid_chars(word: str) -> Optional[str]:
    """Tìm ký tự không hợp lệ trong từ."""
    found = INVALID_CHARS_PATTERN.findall(word)
    if found:
        return f"Ký tự lạ: {''.join(set(found))!r}"
    return None


def check_multiple_tones(word: str) -> bool:
    """Phát hiện từ có nhiều hơn 1 dấu thanh (dấu hiệu lỗi OCR/nhận dạng)."""
    return count_tones(word) > 1


def check_common_typo(word: str) -> Optional[str]:
    """Kiểm tra danh sách lỗi chính tả phổ biến."""
    w_lower = word.lower()
    if w_lower in COMMON_TYPOS:
        correct = COMMON_TYPOS[w_lower]
        if correct is not None:
            return correct
    return None


def check_no_vowel(word: str) -> bool:
    """Từ tiếng Việt bắt buộc phải có nguyên âm (trừ âm tiết đặc biệt)."""
    # Ngoại lệ chấp nhận
    exceptions = {"đ", "ng", "nh", "gh", "ngh"}
    if word.lower() in exceptions:
        return False
    return len(word) > 1 and not has_vowel(word)


def check_repeated_chars(word: str) -> bool:
    """Phát hiện ký tự lặp bất thường (vd: 'aaaa', 'ủủủ')."""
    word_lower = word.lower()
    for i in range(len(word_lower) - 2):
        if word_lower[i] == word_lower[i+1] == word_lower[i+2]:
            # Cho phép một số trường hợp đặc biệt
            if word_lower[i] not in ('n', 'g'):  # ng + gh có thể lặp
                return True
    return False


def check_suspicious_pattern(word: str) -> Optional[str]:
    """Phát hiện các pattern nghi ngờ khác."""
    # Toàn ký tự thường không phải tiếng Việt (latin thuần, 1+ ký tự)
    if re.match(r'^[bcdfghjklmnpqrstvwxyz]{4,}$', word.lower()):
        return "Chuỗi phụ âm dài bất thường (có thể thiếu nguyên âm)"
    # Chứa số
    if re.search(r'\d', word):
        return "Chứa chữ số trong lyrics"
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Các hàm kiểm tra cấp segment
# ──────────────────────────────────────────────────────────────────────────────

def fmt_time(seconds: float) -> str:
    """Định dạng giây → mm:ss.xx"""
    m = int(seconds // 60)
    s = seconds % 60
    return f"{m:02d}:{s:05.2f}"


def check_segment_format(seg: dict) -> List[Issue]:
    """Kiểm tra cấu trúc và định dạng của segment."""
    issues = []
    seg_id = seg.get("segment_id", 0)
    start  = seg.get("start", 0)
    end    = seg.get("end", 0)
    tr     = f"{fmt_time(start)} → {fmt_time(end)}"

    # Thiếu trường bắt buộc
    for field_name in ("segment_id", "full_text", "start", "end", "words", "confidence"):
        if field_name not in seg:
            issues.append(Issue(
                level="ERROR", category="FORMAT",
                segment_id=seg_id, time_range=tr,
                message=f"Thiếu trường bắt buộc: '{field_name}'"
            ))

    # Timestamp không hợp lệ
    if start < 0:
        issues.append(Issue(
            level="ERROR", category="FORMAT",
            segment_id=seg_id, time_range=tr,
            message=f"start âm: {start}"
        ))
    if end <= start:
        issues.append(Issue(
            level="ERROR", category="FORMAT",
            segment_id=seg_id, time_range=tr,
            message=f"end ({end}) ≤ start ({start}) — timestamp đảo ngược"
        ))

    # Thời lượng quá ngắn
    duration = end - start
    if 0 < duration < DEFAULT_MIN_SEG_DURATION:
        issues.append(Issue(
            level="WARNING", category="FORMAT",
            segment_id=seg_id, time_range=tr,
            message=f"Segment cực ngắn ({duration:.2f}s) — có thể nhận dạng sai",
            suggestion="Kiểm tra lại đoạn audio tương ứng"
        ))

    return issues


def check_missing_lyrics_segment(seg: dict) -> List[Issue]:
    """Phát hiện thiếu lyrics trong segment."""
    issues = []
    seg_id = seg.get("segment_id", 0)
    start  = seg.get("start", 0)
    end    = seg.get("end", 0)
    tr     = f"{fmt_time(start)} → {fmt_time(end)}"
    text   = seg.get("full_text", "")
    words  = seg.get("words", [])
    duration = end - start

    # full_text rỗng
    if not text or not text.strip():
        issues.append(Issue(
            level="ERROR", category="MISSING_LYRICS",
            segment_id=seg_id, time_range=tr,
            message="full_text rỗng — lyrics bị thiếu hoàn toàn",
            suggestion="Nghe lại đoạn audio và nhập lyrics thủ công"
        ))
        return issues  # không cần kiểm tra thêm

    # Danh sách words rỗng nhưng full_text có nội dung
    if not words and text.strip():
        issues.append(Issue(
            level="ERROR", category="MISSING_LYRICS",
            segment_id=seg_id, time_range=tr,
            message="Có full_text nhưng danh sách words rỗng (thiếu word-level timing)",
            suggestion="Chạy lại alignment để có timestamp từng từ"
        ))

    # Số từ trong words không khớp full_text
    text_word_count = len(text.split())
    json_word_count = len(words)
    if json_word_count > 0 and abs(text_word_count - json_word_count) > 1:
        issues.append(Issue(
            level="WARNING", category="MISSING_LYRICS",
            segment_id=seg_id, time_range=tr,
            message=(
                f"Số từ không khớp: full_text có {text_word_count} từ "
                f"nhưng words[] có {json_word_count} từ"
            ),
            suggestion="Kiểm tra alignment — có thể mất từ hoặc từ bị ghép/tách sai"
        ))

    # Mật độ từ quá thấp (dấu hiệu segment có audio nhưng không nhận ra được)
    if duration > 1.5:
        word_rate = json_word_count / duration
        if word_rate < DEFAULT_MIN_WORD_RATE:
            issues.append(Issue(
                level="WARNING", category="MISSING_LYRICS",
                segment_id=seg_id, time_range=tr,
                message=(
                    f"Mật độ từ thấp: {word_rate:.2f} từ/giây "
                    f"({json_word_count} từ trong {duration:.2f}s)"
                ),
                suggestion="Đoạn audio dài nhưng ít từ — kiểm tra xem có lời bị bỏ sót"
            ))

    # Từ trong words có text rỗng
    for i, w in enumerate(words):
        w_text = w.get("word", "")
        if not w_text or not w_text.strip():
            issues.append(Issue(
                level="ERROR", category="MISSING_LYRICS",
                segment_id=seg_id, time_range=tr,
                message=f"Word #{i+1} có text rỗng tại "
                        f"{fmt_time(w.get('start', 0))}",
                suggestion="Từ này không được nhận dạng — cần kiểm tra thủ công"
            ))

    return issues


def check_gaps_between_segments(segments: List[dict], threshold: float) -> List[Issue]:
    """Phát hiện khoảng trống lớn bất thường giữa các segment (có thể thiếu đoạn)."""
    issues = []
    for i in range(len(segments) - 1):
        curr = segments[i]
        nxt  = segments[i + 1]
        gap  = nxt.get("start", 0) - curr.get("end", 0)
        if gap >= threshold:
            start_curr = curr.get("start", 0)
            end_curr   = curr.get("end", 0)
            start_next = nxt.get("start", 0)
            issues.append(Issue(
                level="WARNING", category="MISSING_LYRICS",
                segment_id=curr.get("segment_id", i + 1),
                time_range=f"{fmt_time(end_curr)} → {fmt_time(start_next)}",
                message=(
                    f"Khoảng im lặng {gap:.1f}s giữa segment "
                    f"{curr.get('segment_id')} và {nxt.get('segment_id')}"
                ),
                suggestion=f"Nghe lại từ {fmt_time(end_curr)} đến {fmt_time(start_next)} — có thể thiếu đoạn lời"
            ))
    return issues


def check_confidence(seg: dict, threshold: float) -> List[Issue]:
    """Kiểm tra độ tin cậy của segment."""
    issues = []
    seg_id = seg.get("segment_id", 0)
    start  = seg.get("start", 0)
    end    = seg.get("end", 0)
    tr     = f"{fmt_time(start)} → {fmt_time(end)}"
    conf   = seg.get("confidence")

    if conf is None:
        issues.append(Issue(
            level="WARNING", category="CONFIDENCE",
            segment_id=seg_id, time_range=tr,
            message="Thiếu giá trị confidence"
        ))
        return issues

    if conf < 0.5:
        issues.append(Issue(
            level="ERROR", category="CONFIDENCE",
            segment_id=seg_id, time_range=tr,
            message=f"Confidence rất thấp: {conf:.3f} — lyrics gần như không đáng tin",
            suggestion="Nghe lại và sửa thủ công toàn bộ segment này"
        ))
    elif conf < threshold:
        issues.append(Issue(
            level="WARNING", category="CONFIDENCE",
            segment_id=seg_id, time_range=tr,
            message=f"Confidence thấp: {conf:.3f} (ngưỡng: {threshold:.2f})",
            suggestion="Xác nhận lại lyrics bằng cách nghe audio"
        ))

    return issues


def check_spelling(seg: dict) -> List[Issue]:
    """Kiểm tra chính tả từng từ trong segment."""
    issues = []
    seg_id = seg.get("segment_id", 0)
    start  = seg.get("start", 0)
    end    = seg.get("end", 0)
    tr     = f"{fmt_time(start)} → {fmt_time(end)}"
    words  = seg.get("words", [])

    for w_obj in words:
        word = w_obj.get("word", "").strip()
        if not word:
            continue

        w_start = w_obj.get("start", start)
        w_end   = w_obj.get("end", end)
        w_tr    = f"{fmt_time(w_start)}→{fmt_time(w_end)}"

        # 1. Ký tự lạ / không hợp lệ
        inv = check_invalid_chars(word)
        if inv:
            issues.append(Issue(
                level="ERROR", category="SPELLING",
                segment_id=seg_id, time_range=tr,
                message=f"Từ '{word}' ({w_tr}): {inv}",
                suggestion="Xoá hoặc thay thế ký tự không hợp lệ"
            ))

        # 2. Nhiều dấu thanh (lỗi nhận dạng)
        if check_multiple_tones(word):
            issues.append(Issue(
                level="ERROR", category="SPELLING",
                segment_id=seg_id, time_range=tr,
                message=f"Từ '{word}' ({w_tr}): có {count_tones(word)} dấu thanh — bất thường",
                suggestion="Tiếng Việt chuẩn chỉ có 1 dấu thanh mỗi âm tiết"
            ))

        # 3. Không có nguyên âm
        if check_no_vowel(word):
            issues.append(Issue(
                level="WARNING", category="SPELLING",
                segment_id=seg_id, time_range=tr,
                message=f"Từ '{word}' ({w_tr}): không có nguyên âm",
                suggestion="Có thể nhận dạng sai — từ tiếng Việt bắt buộc có nguyên âm"
            ))

        # 4. Ký tự lặp bất thường
        if check_repeated_chars(word):
            issues.append(Issue(
                level="WARNING", category="SPELLING",
                segment_id=seg_id, time_range=tr,
                message=f"Từ '{word}' ({w_tr}): ký tự lặp bất thường",
                suggestion="Kiểm tra xem đây có phải lỗi nhận dạng không"
            ))

        # 5. Lỗi chính tả phổ biến
        suggestion = check_common_typo(word)
        if suggestion:
            issues.append(Issue(
                level="WARNING", category="SPELLING",
                segment_id=seg_id, time_range=tr,
                message=f"Từ '{word}' ({w_tr}): có thể là viết tắt/lỗi chính tả",
                suggestion=f"Thay bằng: '{suggestion}'"
            ))

        # 6. Pattern nghi ngờ khác
        suspicious = check_suspicious_pattern(word)
        if suspicious:
            issues.append(Issue(
                level="WARNING", category="SPELLING",
                segment_id=seg_id, time_range=tr,
                message=f"Từ '{word}' ({w_tr}): {suspicious}",
                suggestion="Xem xét lại từ này"
            ))

    # 7. Kiểm tra full_text vs. ghép words
    full_text   = seg.get("full_text", "")
    words_joined = " ".join(w.get("word", "") for w in words)
    if full_text and words_joined and full_text.strip() != words_joined.strip():
        # Chỉ cảnh báo nếu khác biệt đáng kể
        ft_words = set(full_text.lower().split())
        wj_words = set(words_joined.lower().split())
        diff = ft_words.symmetric_difference(wj_words)
        if len(diff) > 1:
            issues.append(Issue(
                level="INFO", category="SPELLING",
                segment_id=seg_id, time_range=tr,
                message=(
                    f"full_text và words[] không khớp hoàn toàn.\n"
                    f"              full_text : {full_text}\n"
                    f"              words[]   : {words_joined}"
                ),
                suggestion="Kiểm tra xem full_text hay words[] là nguồn đúng"
            ))

    return issues


# ──────────────────────────────────────────────────────────────────────────────
# Hàm tổng hợp kiểm tra
# ──────────────────────────────────────────────────────────────────────────────

def run_checks(
    data: dict,
    file_path: str,
    conf_threshold: float = DEFAULT_CONF_THRESHOLD,
    gap_threshold:  float = DEFAULT_GAP_THRESHOLD,
) -> CheckReport:
    """Chạy toàn bộ kiểm tra và trả về CheckReport."""
    meta = data.get("metadata", {})
    report = CheckReport(
        file_path  = file_path,
        song       = meta.get("song",   "?"),
        artist     = meta.get("artist", "?"),
        checked_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        total_segs = meta.get("total_segments", 0),
    )

    segments = data.get("segments", [])
    report.total_words = sum(len(s.get("words", [])) for s in segments)

    if not segments:
        report.issues.append(Issue(
            level="ERROR", category="MISSING_LYRICS",
            segment_id=0, time_range="--:-- → --:--",
            message="File không có segment nào — dữ liệu trống hoàn toàn"
        ))
        return report

    # Kiểm tra từng segment
    for seg in segments:
        report.issues += check_segment_format(seg)
        report.issues += check_missing_lyrics_segment(seg)
        report.issues += check_confidence(seg, conf_threshold)
        report.issues += check_spelling(seg)

    # Kiểm tra khoảng trống giữa segments
    report.issues += check_gaps_between_segments(segments, gap_threshold)

    # Sắp xếp theo segment_id rồi theo level
    level_order = {"ERROR": 0, "WARNING": 1, "INFO": 2}
    report.issues.sort(key=lambda x: (x.segment_id, level_order.get(x.level, 9)))

    return report


# ──────────────────────────────────────────────────────────────────────────────
# In báo cáo
# ──────────────────────────────────────────────────────────────────────────────

LEVEL_ICON = {"ERROR": "🔴", "WARNING": "🟡", "INFO": "🔵"}
CATEGORY_LABEL = {
    "MISSING_LYRICS": "Thiếu lyrics",
    "SPELLING":       "Chính tả",
    "CONFIDENCE":     "Độ tin cậy",
    "FORMAT":         "Định dạng",
}


def format_report(report: CheckReport, verbose: bool = True) -> str:
    lines = []
    sep = "═" * 72

    lines.append(sep)
    lines.append("  BÁO CÁO KIỂM TRA LYRICS")
    lines.append(sep)
    lines.append(f"  Bài hát : {report.song}")
    lines.append(f"  Ca sĩ   : {report.artist}")
    lines.append(f"  File    : {report.file_path}")
    lines.append(f"  Kiểm tra: {report.checked_at}")
    lines.append(f"  Segment : {report.total_segs}  |  Tổng từ: {report.total_words}")
    lines.append(sep)

    if not report.issues:
        lines.append("")
        lines.append("    Không phát hiện vấn đề nào!")
        lines.append("")
        lines.append(sep)
        return "\n".join(lines)

    # Nhóm theo category
    categories = ["MISSING_LYRICS", "SPELLING", "CONFIDENCE", "FORMAT"]
    for cat in categories:
        cat_issues = [i for i in report.issues if i.category == cat]
        if not cat_issues:
            continue
        lines.append("")
        n_err  = sum(1 for i in cat_issues if i.level == "ERROR")
        n_warn = sum(1 for i in cat_issues if i.level == "WARNING")
        n_info = sum(1 for i in cat_issues if i.level == "INFO")
        label  = CATEGORY_LABEL.get(cat, cat)
        lines.append(f"  ── {label} ({n_err} lỗi, {n_warn} cảnh báo, {n_info} thông tin) ──")
        for issue in cat_issues:
            icon = LEVEL_ICON.get(issue.level, "⚪")
            lines.append(f"  {icon}  {issue}")
        lines.append("")

    lines.append(sep)
    lines.append(f"   {report.summary()}")
    lines.append(sep)

    # Thống kê nhanh theo segment
    segs_with_issues = sorted(set(i.segment_id for i in report.issues))
    if segs_with_issues:
        lines.append("")
        lines.append("  📋  Các segment cần xem xét:")
        for sid in segs_with_issues:
            seg_issues = [i for i in report.issues if i.segment_id == sid]
            errors   = sum(1 for i in seg_issues if i.level == "ERROR")
            warnings = sum(1 for i in seg_issues if i.level == "WARNING")
            infos    = sum(1 for i in seg_issues if i.level == "INFO")
            parts = []
            if errors:   parts.append(f"🔴{errors}")
            if warnings: parts.append(f"🟡{warnings}")
            if infos:    parts.append(f"🔵{infos}")
            lines.append(f"    Segment {sid:02d}:  {' '.join(parts)}")
        lines.append("")
        lines.append(sep)

    return "\n".join(lines)


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="Kiểm tra chất lượng lyrics tiếng Việt từ file JSON pipeline"
    )
    parser.add_argument("json_file", help="Đường dẫn tới file JSON cần kiểm tra")
    parser.add_argument(
        "--threshold", type=float, default=DEFAULT_CONF_THRESHOLD,
        help=f"Ngưỡng confidence (mặc định: {DEFAULT_CONF_THRESHOLD})"
    )
    parser.add_argument(
        "--gap", type=float, default=DEFAULT_GAP_THRESHOLD,
        help=f"Ngưỡng khoảng im lặng giây (mặc định: {DEFAULT_GAP_THRESHOLD})"
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Lưu báo cáo ra file text (tuỳ chọn)"
    )
    parser.add_argument(
        "--json-out", type=str, default=None,
        help="Xuất danh sách issue ra file JSON (tuỳ chọn)"
    )
    parser.add_argument(
        "--only-errors", action="store_true",
        help="Chỉ hiển thị lỗi ERROR, bỏ qua WARNING và INFO"
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # Đọc file
    json_path = Path(args.json_file)
    if not json_path.exists():
        print(f"[LỖI] Không tìm thấy file: {json_path}", file=sys.stderr)
        sys.exit(1)

    try:
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"[LỖI] File JSON không hợp lệ: {e}", file=sys.stderr)
        sys.exit(1)

    # Chạy kiểm tra
    report = run_checks(
        data       = data,
        file_path  = str(json_path),
        conf_threshold = args.threshold,
        gap_threshold  = args.gap,
    )

    # Lọc nếu cần
    if args.only_errors:
        report.issues = report.errors

    # In ra màn hình
    output_text = format_report(report)
    print(output_text)

    # Lưu text report
    if args.output:
        out_path = Path(args.output)
        out_path.write_text(output_text, encoding="utf-8")
        print(f"\n✅  Báo cáo đã lưu: {out_path}")

    # Xuất JSON report
    if args.json_out:
        json_report = {
            "song":       report.song,
            "artist":     report.artist,
            "checked_at": report.checked_at,
            "summary": {
                "total":    len(report.issues),
                "errors":   len(report.errors),
                "warnings": len(report.warnings),
                "infos":    len(report.infos),
            },
            "issues": [
                {
                    "level":      i.level,
                    "category":   i.category,
                    "segment_id": i.segment_id,
                    "time_range": i.time_range,
                    "message":    i.message,
                    "suggestion": i.suggestion,
                }
                for i in report.issues
            ],
        }
        out_json = Path(args.json_out)
        out_json.write_text(
            json.dumps(json_report, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        print(f"  JSON report đã lưu: {out_json}")

    # Exit code: 1 nếu có lỗi
    sys.exit(1 if report.errors else 0)


if __name__ == "__main__":
    main()