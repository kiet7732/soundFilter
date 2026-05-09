/**
 * AudioPlayer Component
 * Reusable audio player với play button và WaveSurfer
 */
import { Play, Pause } from "lucide-react";
import { WaveSurferPlayer } from "../WaveSurferPlayer";

interface AudioPlayerProps {
  audioUrl: string;
  isPlaying: boolean;
  progress: number;
  waveColor: string;
  progressColor: string;
  onTogglePlay: () => void;
  onSeek: (percent: number) => void; // Thêm prop onSeek
  onReady?: () => void;
}

export function AudioPlayer({
  audioUrl,
  isPlaying,
  progress,
  waveColor,
  progressColor,
  onTogglePlay,
  onSeek, // Nhận prop onSeek
  onReady,
}: AudioPlayerProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onTogglePlay}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center hover:scale-110 transition-transform"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          <Play className="w-5 h-5 text-white ml-0.5" />
        )}
      </button>
      <WaveSurferPlayer
        audioUrl={audioUrl}
        waveColor={waveColor}
        progressColor={progressColor}
        progress={progress}
        onSeek={onSeek} // Truyền prop onSeek xuống
        onReady={onReady}
      />
    </div>
  );
}
