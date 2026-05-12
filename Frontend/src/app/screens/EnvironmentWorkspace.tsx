// EnvironmentWorkspace - Refactored Version 
import { Navigate, useLocation } from "react-router";
import { Download, Volume2, Play, Pause, Zap, Loader2 } from "lucide-react";
import { Switch } from "../components/ui/switch";
import { useState, useCallback, useRef } from "react";
import { useEnvironmentTracks } from "../hooks/useEnvironmentTracks";
import { getResultUrl } from "../services/api";
import { downloadAllAsZip, handleDownload } from "../utils/downloadHelpers";
import type { EnvironmentTrack } from "../types/environment.types";
import { MessageCircle, Car, CloudRain, Wind, Music, Bird, Activity } from "lucide-react";
import { WaveSurferPlayer } from "../components/WaveSurferPlayer";

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

export function EnvironmentWorkspace() {
  const location = useLocation();
  const taskId = location.state?.taskId;
  const originalFileName = location.state?.fileName || "noisy_environment.wav";

  if (!location.state || !location.state.taskId) {
    return <Navigate to="/" replace />;
  }

  // Use hooks
  const { isLoading, tracks, toggleDSP } = useEnvironmentTracks(taskId);

  // Audio states
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [originalProgress, setOriginalProgress] = useState(0);

  const [playingTracks, setPlayingTracks] = useState<Record<string, boolean>>({});
  const [trackProgress, setTrackProgress] = useState<Record<string, number>>({});

  const originalRef = useRef<HTMLAudioElement>(null);
  const trackRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // URL helpers
  const getOriginalUrl = () => `http://127.0.0.1:8000/api/uploads/${taskId}_${originalFileName}`;

  // Handlers
  const toggleOriginalPlay = () => {
    if (!originalRef.current) return;
    if (playingOriginal) {
      originalRef.current.pause();
      setPlayingOriginal(false);
    } else {
      originalRef.current.play();
      setPlayingOriginal(true);
    }
  };

  const toggleTrackPlay = (trackId: string) => {
    const audio = trackRefs.current?.[trackId];
    if (!audio) return;

    if (playingTracks[trackId]) {
      audio.pause();
      setPlayingTracks(prev => ({ ...prev, [trackId]: false }));
    } else {
      audio.play();
      setPlayingTracks(prev => ({ ...prev, [trackId]: true }));
    }
  };

  const handleDownloadSingle = async (url: string, filename: string) => {
    await handleDownload(url, filename);
  };

  const handleDownloadAllZIP = async () => {
    const files = [
      { url: getOriginalUrl(), filename: `Original_${originalFileName}` },
      ...tracks.map((track: EnvironmentTrack) => ({
        url: getResultUrl(taskId, track.fileName),
        filename: track.fileName,
      })),
    ];
    await downloadAllAsZip(files, `Environment_Export_${Date.now()}.zip`);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0F172A] space-y-4">
        <Loader2 className="w-12 h-12 text-[#06B6D4] animate-spin" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
          Đang phân tích âm thanh...
        </h2>
        <p className="text-gray-400">Vui lòng chờ AI xử lý</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* THẺ AUDIO ẨN */}
      <audio
        ref={originalRef}
        src={getOriginalUrl()}
        onEnded={() => setPlayingOriginal(false)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setOriginalProgress((el.currentTime / el.duration) * 100);
        }}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent">
              Smart Environment Workspace
            </h1>
            <p className="text-gray-400 mt-1">File: {originalFileName}</p>
          </div>
          <button
            onClick={handleDownloadAllZIP}
            className="px-6 py-3 bg-gradient-to-r from-[#06B6D4] to-cyan-600 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 text-white"
          >
            <Download className="w-4 h-4" /> Export All Tracks (ZIP)
          </button>
        </div>

        {/* Original Audio Player */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#06B6D4]/10 to-[#8B5CF6]/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-[#06B6D4]" /> Original Audio
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleOriginalPlay}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] flex items-center justify-center hover:scale-110 transition-transform"
              >
                {playingOriginal ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
              </button>
              <div className="flex-1 flex items-center">
                <WaveSurferPlayer
                  audioUrl={getOriginalUrl()}
                  waveColor="#06B6D4"
                  progressColor="#8B5CF6"
                  progress={originalProgress}
                  height={64}
                  onSeek={(percent) => {
                    const el = originalRef.current;
                    if (el && el.duration) el.currentTime = percent * el.duration;
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Detection Tags */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" /> CLAP AI Detection Results
            </h3>
            <div className="flex flex-wrap gap-3">
              {tracks.map((track: EnvironmentTrack) => {
                const IconComponent = iconMap[track.icon] || Activity;
                return (
                  <div key={`tag-${track.id}`} className="relative group/tag overflow-hidden rounded-xl transition-all hover:scale-105">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundColor: track.color }}></div>
                    <div className="relative px-5 py-3 border backdrop-blur-sm" style={{ borderColor: `${track.color}40`, backgroundColor: `${track.color}10` }}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${track.color}30`, color: track.color }}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{track.name}</span>
                            <span className="text-sm font-bold" style={{ color: track.color }}>{track.confidence}%</span>
                          </div>
                          <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                            <div className="h-full rounded-full transition-all" style={{ width: `${track.confidence}%`, backgroundColor: track.color }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Isolated Tracks Rendering */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-[#06B6D4]" /> Isolated Audio Tracks
          </h3>

          {tracks.length === 0 && <p className="text-gray-400">Không tìm thấy âm thanh nào.</p>}

          {tracks.map((track: EnvironmentTrack) => {
            const IconComponent = iconMap[track.icon] || Activity;
            return (
              <div key={track.id} className="relative group/track">
                {/* Audio Ẩn */}
                <audio
                  ref={el => { trackRefs.current[track.id] = el; }}
                  src={getResultUrl(taskId, track.fileName)}
                  onEnded={() => setPlayingTracks(prev => ({ ...prev, [track.id]: false }))}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    if (el.duration) setTrackProgress(prev => ({ ...prev, [track.id]: (el.currentTime / el.duration) * 100 }));
                  }}
                />

                <div className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover/track:opacity-100 transition-opacity" style={{ backgroundColor: `${track.color}15` }}></div>
                <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl" style={{ backgroundColor: `${track.color}20`, borderColor: `${track.color}40`, borderWidth: "1px", color: track.color }}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-3">{track.name}</h4>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleTrackPlay(track.id)}
                          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                          style={{ backgroundColor: `${track.color}30` }}
                        >
                          {playingTracks[track.id] ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                        </button>
                        <div className="flex-1 flex items-center">
                          <WaveSurferPlayer
                            audioUrl={getResultUrl(taskId, track.fileName)}
                            waveColor={`${track.color}80`}
                            progressColor={track.color}
                            progress={trackProgress[track.id] || 0}
                            height={48}
                            onSeek={(percent) => {
                              const el = trackRefs.current[track.id];
                              if (el && el.duration) el.currentTime = percent * el.duration;
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                      <label className="text-xs text-gray-400 text-center">Apply DSP<br />Noise Filter</label>
                      <Switch checked={track.dspEnabled} onCheckedChange={() => toggleDSP(track.id)} />
                    </div>

                    <button
                      onClick={() => handleDownloadSingle(getResultUrl(taskId, track.fileName), track.fileName)}
                      className="p-4 rounded-xl border transition-all hover:scale-110"
                      style={{ backgroundColor: `${track.color}15`, borderColor: `${track.color}30`, color: track.color }}
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
          })}
        </div>
      </div>
    </div>
  );
}
