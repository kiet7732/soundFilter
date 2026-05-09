// Quản lý logic lyrics editing và fetching
import { useState, useEffect } from "react";
import { fetchLyrics, fetchIssues, updateLyric } from "../services/lyricsApi";
import type { LyricLine } from "../types/music.types";

export function useLyrics(taskId: string, isKaraokeMode: boolean) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [editingLyric, setEditingLyric] = useState<number | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);

  // Fetch lyrics và issues khi component mount
  useEffect(() => {
    if (!isKaraokeMode || !taskId) return;

    fetchLyrics(taskId).then(setLyrics);
    fetchIssues(taskId).then(setIssues);
  }, [taskId, isKaraokeMode]);

  // Handle update lyric
  const handleUpdateLyric = async (segmentId: number, newText: string) => {
    // Cập nhật state local trước để UI phản hồi nhanh (Optimistic Update)
    setLyrics((prev) =>
      prev.map((l) =>
        l.segment_id === segmentId ? { ...l, full_text: newText, text: newText } : l
      )
    );
    setEditingLyric(null);

    // Gọi API để lưu vào server và tính toán lại timing
    try {
      const response = await updateLyric(taskId, segmentId, newText);

      if (response.status === "success") {
        console.log(`✅ Đã lưu lyrics segment ${segmentId} thành công. Timing đã được tính toán lại.`);
      } else {
        console.error("⚠️ API trả về lỗi:", response);
      }
    } catch (error) {
      console.error("❌ Lỗi khi gọi API update-lyric:", error);
      alert("Không thể lưu thay đổi lên server. Vui lòng kiểm tra kết nối!");
    }
  };

  return {
    lyrics,
    setLyrics,
    editingLyric,
    setEditingLyric,
    issues,
    isLyricsExpanded,
    setIsLyricsExpanded,
    handleUpdateLyric,
  };
}
