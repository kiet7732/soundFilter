import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

export interface WaveSurferPlayerProps {
  audioUrl: string;
  waveColor: string;
  progressColor: string;
  progress: number; // 0 đến 100
  height?: number;
  onSeek: (percent: number) => void;
  onReady?: () => void;
}

export function WaveSurferPlayer({
  audioUrl,
  waveColor,
  progressColor,
  progress,
  height = 60,
  onSeek,
  onReady,
}: WaveSurferPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  // Khởi tạo WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      cursorColor: waveColor,
      cursorWidth: 2,
      height,
      barWidth: 5,
      barGap: 1.5,
      barRadius: 3,
    });

    if (onReady) {
      ws.once("ready", onReady);
      ws.once("error", (err) => {
        console.error("WaveSurfer load error:", err);
        onReady();
      });
    }

    ws.load(audioUrl);
    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [audioUrl, waveColor, progressColor, height, onReady]);

  // Đồng bộ tiến trình phát nhạc từ Component Cha truyền vào
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    const seek = () => ws.seekTo(Math.max(0, Math.min(1, progress / 100)));
    if (ws.getDuration()) seek();
    else ws.once("ready", seek);
  }, [progress]);

  // Tính toán % khi người dùng click tua nhạc
  const handleInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(percent);
  };

  return <div ref={containerRef} className="flex-1 min-w-0 cursor-pointer" onClick={handleInteraction} />;
}