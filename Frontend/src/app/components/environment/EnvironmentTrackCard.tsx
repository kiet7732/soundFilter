/**
 * EnvironmentTrackCard Component
 * Card hiển thị một environment track với audio player và DSP toggle
 */
import { Play, Pause, Download, Zap, MessageCircle, Car, CloudRain, Wind, Music, Bird, Activity } from "lucide-react";
import { Switch } from "../ui/switch";
import { WaveSurferPlayer } from "../WaveSurferPlayer";
import type { EnvironmentTrack } from "../../types/environment.types";

interface EnvironmentTrackCardProps {
  track: EnvironmentTrack;
  isPlaying: boolean;
  progress: number;
  audioUrl: string;
  onTogglePlay: () => void;
  onToggleDSP: () => void;
  onDownload: () => void;
  onSeek: (percent: number) => void;
  onReady?: () => void;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  MessageCircle,
  Car,
  CloudRain,
  Wind,
  Music,
  Bird,
};

export function EnvironmentTrackCard({
  track,
  isPlaying,
  progress,
  audioUrl,
  onTogglePlay,
  onToggleDSP,
  onDownload,
  onSeek,
  onReady,
}: EnvironmentTrackCardProps) {
  const IconComponent = iconMap[track.icon] || Activity;

  return (
    <div className="relative group">
      <div className="absolute inset-0 rounded-2xl blur-xl opacity-50" style={{ backgroundColor: track.color }} />
      <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${track.color}20`, color: track.color }}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{track.name}</h3>
              <p className="text-sm text-gray-400">Confidence: {track.confidence}%</p>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            style={{ background: `linear-gradient(135deg, ${track.color}, ${track.color}dd)` }}
          >
            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
          </button>
          <WaveSurferPlayer
            audioUrl={audioUrl}
            waveColor={track.color}
            progressColor={`${track.color}80`}
            progress={progress}
            height={56}
            onSeek={onSeek}
            onReady={onReady}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400 text-center">
              Apply DSP
              <br />
              Noise Filter
            </label>
            <Switch checked={track.dspEnabled} onCheckedChange={onToggleDSP} />
          </div>

          <button
            onClick={onDownload}
            className="p-4 rounded-xl border transition-all hover:scale-110"
            style={{
              backgroundColor: `${track.color}15`,
              borderColor: `${track.color}30`,
              color: track.color,
            }}
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        {track.dspEnabled && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300">DSP noise reduction active • Enhanced clarity</span>
          </div>
        )}
      </div>
    </div>
  );
}
