// VideoRenderer Component
import { Upload, Film, Loader2, X, Download } from "lucide-react";
import type { VideoStatus } from "../../types/music.types";

interface VideoRendererProps {
  bgImage: File | null;
  videoStatus: VideoStatus;
  videoUrl: string | null;
  bgImageRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRenderVideo: () => void;
  onRemoveImage: () => void;
  onDownloadVideo?: (url: string, filename: string) => void;
}

export function VideoRenderer({
  bgImage,
  videoStatus,
  videoUrl,
  bgImageRef,
  onImageUpload,
  onRenderVideo,
  onRemoveImage,
  onDownloadVideo,
}: VideoRendererProps) {
  return (
    <div className="relative group">
      {/* Ambient glow layers */}
      <div className="absolute -inset-px bg-gradient-to-r from-[#8B5CF6] via-fuchsia-500 to-pink-500 rounded-3xl opacity-30 blur-sm" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/10 via-transparent to-pink-500/10 rounded-3xl blur-3xl" />

      <div className="relative bg-[#0d0d14]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">

        {/* ── Header bar ─────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-8 py-5 border-b border-white/[0.07] bg-gradient-to-r from-[#8B5CF6]/10 to-pink-500/10">
          {/* Icon */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6] to-pink-500 rounded-xl blur-md opacity-60" />
            <div className="relative bg-gradient-to-br from-[#8B5CF6] to-pink-500 p-3 rounded-xl">
              <Film className="w-6 h-6 text-white" />
            </div>
          </div>
          {/* Title */}
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Karaoke Video Engine</h3>
            <p className="text-[13px] text-gray-500 mt-0.5">Render synchronized lyrics video • 1080p MP4</p>
          </div>
          {/* Render time badge */}
          <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/70 animate-pulse" />
            ~2–3 min render
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="p-8 space-y-8">

          {/* ── Video preview ── */}
          {videoUrl && videoStatus !== "rendering" && (
            <div className="space-y-4">
              {/* Video player */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl shadow-black/60">
                {/* Corner accent lines */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#8B5CF6]/60 rounded-tl-2xl pointer-events-none z-10" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-pink-500/60 rounded-br-2xl pointer-events-none z-10" />
                <div className="aspect-video">
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Download current video */}
              <button
                onClick={() => {
                  if (onDownloadVideo) {
                    onDownloadVideo(videoUrl, "Final_Karaoke.mp4");
                  } else {
                    window.open(videoUrl, '_blank');
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
             bg-white/5 border border-white/10 text-sm font-semibold text-gray-200
             hover:bg-white/10 hover:border-[#8B5CF6]/40 hover:text-white
             active:scale-[0.99] transition-all duration-150"
              >
                <Download className="w-4 h-4 text-[#8B5CF6]" />
                Download Current Video
              </button>
            </div>
          )}

          {videoStatus !== "rendering" && (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">

              {/* Background image upload card */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 px-1">
                  Background Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={bgImageRef}
                  onChange={onImageUpload}
                />

                <button
                  onClick={() => bgImageRef.current?.click()}
                  className={`
                  w-full flex items-center gap-3 px-5 py-4 rounded-2xl border-2 border-dashed
                  transition-all duration-200 text-left group/upload
                  ${bgImage
                      ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/10 text-white"
                      : "border-white/15 bg-white/[0.03] text-gray-400 hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 hover:text-gray-200"
                    }
                `}>

                  {bgImage ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/10 shrink-0">
                      <img src={URL.createObjectURL(bgImage)} alt="Background preview" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveImage(); }}
                        className="absolute top-0 right-0 p-1 bg-black/50 rounded-bl-lg text-white/80 hover:text-white hover:bg-black/70 transition-all"
                        title="Xóa ảnh nền"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all
                      ${bgImage ? "bg-[#8B5CF6]/20" : "bg-white/5 group-hover/upload:bg-white/10"}`}>
                      <Upload className={`w-5 h-5 ${bgImage ? "text-[#8B5CF6]" : "text-gray-500"}`} />
                    </div>
                  )}

                  <div className="min-w-0">
                    {bgImage ? (
                      <>
                        <p className="text-sm font-semibold text-white truncate">{bgImage.name}</p>
                        <p className="text-[11px] text-[#8B5CF6]/80 mt-0.5">Click to replace</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Upload background image</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">PNG, JPG, WebP — any aspect ratio</p>
                      </>
                    )}
                  </div>
                  {bgImage && (
                    <div className="ml-auto shrink-0 w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
                <p className="text-[11px] text-gray-600 px-1">No image? A default template will be used.</p>
              </div>
              <div className="hidden sm:block self-stretch w-px bg-white/[0.06] mx-2" />
            </div>
          )}

          <button
            onClick={onRenderVideo}
            disabled={videoStatus === "rendering" || !bgImage}
            className="relative w-full py-5 rounded-2xl font-bold text-[15px] overflow-hidden
               transition-all duration-200 hover:scale-[1.015] active:scale-[0.995]
               disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100
               focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/60"
          >
            {/* Gradient layers */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] via-fuchsia-500 to-pink-500 transition-opacity duration-300
                    group-hover:opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-[#8B5CF6]
                    opacity-0 hover:opacity-100 transition-opacity duration-300" />
            {/* Shimmer effect */}
            {videoStatus !== "rendering" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                      -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none" />
            )}
            {/* Label */}
            <span className="relative z-10 flex items-center justify-center gap-3 text-white drop-shadow-sm">
              {videoStatus === "rendering" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Rendering Video…</span>
                </>
              ) : videoUrl ? (
                <>
                  <Film className="w-5 h-5" />
                  <span>🎬 Render Again (MP4)</span>
                </>
              ) : (
                <>
                  <Film className="w-5 h-5" />
                  <span>🎬 Render Karaoke Video (MP4)</span>
                </>
              )}
            </span>
          </button>

          {/* Render progress hint */}
          {videoStatus === "rendering" && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}></div>
                ))}
              </div>
              <p className="text-sm text-[#8B5CF6]/90">Processing your video — this usually takes 2–3 minutes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
