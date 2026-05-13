/**
 * API Configuration
 * Base configuration cho tất cả API calls
 */
import axios from "axios";

export const API_BASE_URL = "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Helper để tạo URL cho result files
 */
export function getResultUrl(taskId: string, fileName: string): string {
  return `${API_BASE_URL}/api/files/${taskId}/${fileName}`;
}

/**
 * Helper để tạo URL cho original file
 */
export function getOriginalUrl(taskId: string): string {
  return `${API_BASE_URL}/api/uploads/${taskId}_sanitized.wav`;
}
