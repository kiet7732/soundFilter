import { Navigate, useLocation } from "react-router";
import { Download, Music, Loader2 } from "lucide-react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { useLyrics } from "../hooks/useLyrics";
import { useVideoRenderer } from "../hooks/useVideoRenderer";
import { LyricsEditor } from "../components/lyrics/LyricsEditor";
import { VideoRenderer } from "../components/karaoke/VideoRenderer";
import { WaveSurferPlayer } from "../components/WaveSurferPlayer";
import { getResultUrl, getOriginalUrl } from "../services/api";
import { downloadAllAsZip, handleDownload } from "../utils/downloadHelpers";
import { STEMS_CONFIG } from "../config/stems.config";
import { Play, Pause } from "lucide-react";
import { useState, useCallback } from "react";
import type { TrackId } from "../types/music.types";

export function MusicWorkspace() {
  const location = useLocation();
  const taskId = location.state?.taskId;
  const fileName = location.state?.fileName || "summer_vibes.mp3";
  const isKaraokeMode: boolean = location.state?.isKaraokeMode ?? true;

  if (!location.state || !location.state.taskId) {
    return <Navigate to="/" replace />;
  }

  // Use hooks
  const audioPlayer = useAudioPlayer();
  const lyrics = useLyrics(taskId, isKaraokeMode);
  const videoRenderer = useVideoRenderer(taskId);

  // Loading state
  const [readyCount, setReadyCount] = useState(0);
  const totalWaves = 6;
  const isFullyLoaded = readyCount >= totalWaves;

  const handleWaveReady = useCallback(() => {
    setReadyCount((prev) => prev + 1);
  }, []);

  // Download all handler
  const handleDownloadAll = async () => {
    const files = [
      { url: getOriginalUrl(taskId), filename: `Original_${fileName}` },
      { url: getResultUrl(taskId, "vocals.mp3"), filename: "Vocals.mp3" },
      { url: getResultUrl(taskId, "bass.mp3"), filename: "Bass.mp3" },
      { url: getResultUrl(taskId, "drums.mp3"), filename: "Drums.mp3" },
      { url: getResultUrl(taskId, "other.mp3"), filename: "Other.mp3" },
      { url: getResultUrl(taskId, "beat.mp3"), filename: "Beat_Karaoke.mp3" },
    ];
    await downloadAllAsZip(files, `OmniSplit_Export_${Date.now()}.zip`);
  };

  return (
    <>
      {/* Loading Overlay */}
      {!isFullyLoaded && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0F172A] space-y-4">
          <Loader2 className="w-12 h-12 text-[#06B6D4] animate-spin" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
            Đang giải mã sóng âm...
          </h2>
          <p className="text-gray-400">Vui lòng chờ giây lát ({readyCount}/{totalWaves})</p>
        </div>
      )}

      <div className={`min-h-screen p-8 transition-opacity duration-700 ${!isFullyLoaded ? "opacity-0 h-screen overflow-hidden pointer-events-none" : "opacity-100"}`}>

        {/* Hidden Audio Elements */}
        {(["original", "vocals", "bass", "drums", "other", "beat"] as TrackId[]).map((id) => {
          const src = id === "original" ? getOriginalUrl(taskId) : getResultUrl(taskId, `${id}.mp3`);
          return (
            <audio
              key={id}
              ref={audioPlayer.refMap.current[id]}
              src={src}
              onTimeUpdate={() => audioPlayer.handleTimeUpdate(audioPlayer.refMap.current[id], id)}
              onEnded={() => audioPlayer.handleEnded(id)}
            />
          );
        })}

        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
                Music & Karaoke Workspace
              </h1>
              <p className="text-gray-400 mt-1">File: {fileName}</p>
            </div>
            <button
              onClick={handleDownloadAll}
              className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-purple-600 rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>

          {/* Original Audio Player */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/10 to-[#06B6D4]/10 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-[#8B5CF6]" />
                Original Audio
              </h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => audioPlayer.togglePlay("original")}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center hover:scale-110 transition-transform"
                >
                  {audioPlayer.playing.original ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>
                <WaveSurferPlayer
                  audioUrl={getOriginalUrl(taskId)}
                  waveColor="#5df9de"
                  progressColor="#1e594f"
                  progress={audioPlayer.progress.original}
                  height={64}
                  onSeek={(percent) => {
                    const el = audioPlayer.originalRef.current;
                    if (el && el.duration) el.currentTime = percent * el.duration;
                  }}
                  onReady={handleWaveReady}
                />
              </div>
            </div>
          </div>

          {/* Stems Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {STEMS_CONFIG.map((stem) => {
              const trackId = stem.id as TrackId;
              const isPlaying = audioPlayer.playing[trackId];
              const progress = audioPlayer.progress[trackId];
              const ref = audioPlayer.refMap.current[trackId];

              return (
                <div key={stem.id} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/5 rounded-2xl blur-xl" />
                  <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <stem.icon className="w-5 h-5 text-gray-300" />
                        {stem.title}
                      </h3>
                      <button
                        onClick={() => handleDownload(getResultUrl(taskId, stem.fileName), stem.fileName)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => audioPlayer.togglePlay(trackId)}
                        className={`w-12 h-12 rounded-full bg-gradient-to-r ${stem.colorFrom} ${stem.colorTo} flex items-center justify-center hover:scale-110 transition-transform shadow-lg shrink-0`}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </button>
                      <WaveSurferPlayer
                        audioUrl={getResultUrl(taskId, stem.fileName)}
                        waveColor={stem.waveColor}
                        progressColor={stem.progressColor}
                        progress={progress}
                        height={56}
                        onSeek={(percent) => {
                          const el = ref.current;
                          if (el && el.duration) el.currentTime = percent * el.duration;
                        }}
                        onReady={handleWaveReady}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Beat Section */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#06B6D4]/10 to-cyan-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#06B6D4]" />
                  Beat / Instrumental
                </h3>
                <button
                  onClick={() => handleDownload(getResultUrl(taskId, "beat.mp3"), "Beat_Karaoke.mp3")}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => audioPlayer.togglePlay("beat")}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-[#06B6D4] to-cyan-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg shrink-0"
                >
                  {audioPlayer.playing.beat ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>
                <WaveSurferPlayer
                  audioUrl={getResultUrl(taskId, "beat.mp3")}
                  waveColor="#5df9de"
                  progressColor="#1e594f"
                  progress={audioPlayer.progress.beat}
                  height={56}
                  onSeek={(percent) => {
                    const el = audioPlayer.beatRef.current;
                    if (el && el.duration) el.currentTime = percent * el.duration;
                  }}
                  onReady={handleWaveReady}
                />
              </div>
            </div>
          </div>

          {/* Karaoke Mode */}
          {isKaraokeMode && (
            <>
              {/* Lyrics Editor */}
              <LyricsEditor
                lyrics={lyrics.lyrics}
                issues={lyrics.issues}
                isExpanded={lyrics.isLyricsExpanded}
                editingLyric={lyrics.editingLyric}
                onToggleExpand={() => lyrics.setIsLyricsExpanded(!lyrics.isLyricsExpanded)}
                onStartEdit={lyrics.setEditingLyric}
                onUpdateLyric={lyrics.handleUpdateLyric}
              />

              {/* Video Renderer */}
              <VideoRenderer
                bgImage={videoRenderer.bgImage}
                videoStatus={videoRenderer.videoStatus}
                videoUrl={videoRenderer.videoUrl}
                bgImageRef={videoRenderer.bgImageRef}
                onImageUpload={videoRenderer.handleImageUpload}
                onRenderVideo={videoRenderer.handleRenderVideo}
                onRemoveImage={() => {
                  videoRenderer.setBgImage(null);
                  videoRenderer.setVideoStatus("idle");
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}