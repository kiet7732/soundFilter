/**
 * VideoRenderer Component
 * UI cho video rendering với image upload và render button
 */
import { Upload, Film, Loader2, X } from "lucide-react";
import type { VideoStatus } from "../../types/music.types";

interface VideoRendererProps {
  bgImage: File | null;
  videoStatus: VideoStatus;
  videoUrl: string | null;
  bgImageRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRenderVideo: () => void;
  onRemoveImage: () => void;
}

export function VideoRenderer({
  bgImage,
  videoStatus,
  videoUrl,
  bgImageRef,
  onImageUpload,
  onRenderVideo,
  onRemoveImage,
}: VideoRendererProps) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/10 to-pink-500/10 rounded-2xl blur-xl" />
      <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-[#8B5CF6]" />
          🎬 Karaoke Video Engine
        </h3>

        <div className="space-y-4">
          {/* Background Image Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
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
                    ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/15"
                    : "border-white/15 bg-white/[0.03] text-gray-400 hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 hover:text-gray-200"
                  }
                `}
              >
                {bgImage ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/10 shrink-0">
                    <img
                      src={URL.createObjectURL(bgImage)}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage();
                      }}
                      className="absolute top-0 right-0 p-1 bg-black/50 rounded-bl-lg text-white/80 hover:text-white hover:bg-black/70 transition-all"
                      title="Xóa ảnh nền"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all
                      ${bgImage ? "bg-[#8B5CF6]/20" : "bg-white/5 group-hover/upload:bg-white/10"}`}
                  >
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
                {bgImage && <div className="ml-auto shrink-0 w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
              <p className="text-[11px] text-gray-600 px-1">No image? A default template will be used.</p>
            </div>
            <div className="hidden sm:block self-stretch w-px bg-white/[0.06] mx-2" />
          </div>

          {/* Render Button */}
          <button
            onClick={onRenderVideo}
            disabled={videoStatus === "rendering" || !bgImage}
            className="relative w-full py-5 rounded-2xl font-bold text-[15px] overflow-hidden
               transition-all duration-200 hover:scale-[1.015] active:scale-[0.995]
               disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100
               focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/60"
          >
            {/* Gradient layers */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] via-fuchsia-500 to-pink-500 transition-opacity duration-300 group-hover:opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-[#8B5CF6] opacity-0 hover:opacity-100 transition-opacity duration-300" />
            {/* Shimmer effect */}
            {videoStatus !== "rendering" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none" />
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
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
                    style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
              <p className="text-sm text-[#8B5CF6]/90">
                Processing your video — this usually takes 2–3 minutes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
