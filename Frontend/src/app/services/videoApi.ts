/**
 * Video API Service
 * Các API calls liên quan đến video rendering
 */
import axios from "axios";
import { API_BASE_URL, getResultUrl } from "./api";

/**
 * Render karaoke video
 */
export async function renderVideo(
  taskId: string,
  imageFile: File
): Promise<{ status: string; message: string }> {
  const formData = new FormData();
  formData.append("task_id", taskId);
  formData.append("image", imageFile);

  const response = await axios.post(`${API_BASE_URL}/api/render-video`, formData);
  return response.data;
}

/**
 * Check video status (polling)
 */
export async function checkVideoStatus(taskId: string): Promise<boolean> {
  try {
    const response = await axios.head(getResultUrl(taskId, "Final_Karaoke.mp4"));
    return response.status === 200;
  } catch {
    return false;
  }
}
