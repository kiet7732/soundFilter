// Quản lý logic video rendering và image upload
import { useState, useRef, useEffect } from "react";
import { renderVideo, checkVideoStatus } from "../services/videoApi";
import { getResultUrl } from "../services/api";
import { compressImage } from "../utils/imageCompressor";
import type { VideoStatus } from "../types/music.types";

export function useVideoRenderer(taskId: string) {
  const [bgImage, setBgImage] = useState<File | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const bgImageRef = useRef<HTMLInputElement>(null);
  const checkVideoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling khi unmount
  useEffect(() => {
    return () => {
      if (checkVideoRef.current) clearInterval(checkVideoRef.current);
    };
  }, []);

  // Handle image upload với compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 500 * 1024; // 500KB

    if (file.size <= MAX_SIZE) {
      setBgImage(file);
      setVideoStatus("idle");
      return;
    }

    // Dùng Canvas để nén ảnh nếu dung lượng vượt quá 500KB
    try {
      const compressedFile = await compressImage(file, MAX_SIZE);
      setBgImage(compressedFile);
      setVideoStatus("idle");
      console.log(`✅ Đã nén ảnh từ ${(file.size / 1024).toFixed(0)}KB xuống ${(compressedFile.size / 1024).toFixed(0)}KB`);
    } catch (error) {
      console.error("Lỗi khi nén ảnh:", error);
      alert("Không thể xử lý ảnh. Vui lòng chọn ảnh khác!");
    }
  };

  // Handle render video
  const handleRenderVideo = async () => {
    if (!bgImage) {
      alert("Vui lòng chọn ảnh nền trước!");
      return;
    }

    setVideoStatus("rendering");

    try {
      await renderVideo(taskId, bgImage);

      // Polling để kiểm tra video đã render xong chưa
      checkVideoRef.current = setInterval(async () => {
        const isReady = await checkVideoStatus(taskId);
        if (isReady) {
          if (checkVideoRef.current) clearInterval(checkVideoRef.current);
          setVideoStatus("ready");
          setVideoUrl(getResultUrl(taskId, "Final_Karaoke.mp4"));
          console.log("✅ Video đã render xong!");
        }
      }, 3000);
    } catch (error) {
      console.error("Lỗi khi render video:", error);
      setVideoStatus("idle");
      alert("Đã xảy ra lỗi khi render video!");
    }
  };

  return {
    bgImage,
    setBgImage,
    videoStatus,
    setVideoStatus,
    videoUrl,
    bgImageRef,
    handleImageUpload,
    handleRenderVideo,
  };
}
