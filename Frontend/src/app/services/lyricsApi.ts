/**
 * Lyrics API Service
 * Các API calls liên quan đến lyrics
 */
import axios from "axios";
import { getResultUrl, API_BASE_URL } from "./api";
import type { LyricLine } from "../types/music.types";

/**
 * Fetch lyrics từ server
 */
export async function fetchLyrics(taskId: string): Promise<LyricLine[]> {
  try {
    const response = await axios.get(getResultUrl(taskId, "lyrics.json"));
    return response.data?.segments || [];
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return [];
  }
}

/**
 * Fetch issues từ server
 */
export async function fetchIssues(taskId: string): Promise<any[]> {
  try {
    const response = await axios.get(getResultUrl(taskId, "issues.json"));
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.log("Không có issue báo cáo (Tốt)");
    return [];
  }
}

/**
 * Update lyrics segment
 */
export async function updateLyric(
  taskId: string,
  segmentId: number,
  newText: string
): Promise<{ status: string; message: string }> {
  const formData = new FormData();
  formData.append("task_id", taskId);
  formData.append("segment_id", segmentId.toString());
  formData.append("new_text", newText);

  const response = await axios.post(`${API_BASE_URL}/api/update-lyric`, formData);
  return response.data;
}
