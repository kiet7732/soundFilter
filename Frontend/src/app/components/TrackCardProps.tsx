import { Play, Pause, Download, Volume2, Music } from "lucide-react";

// 1. Khai báo kiểu dữ liệu cho các "cổng cắm" (Props) của Component
export interface TrackCardProps {
  title: string;
  icon: React.ElementType; // Nhận icon từ Lucide
  fileName: string;
  themeColor: "purple" | "cyan";
  waveMath: "sin" | "cos"; // Để sóng nhạc uốn lượn khác nhau
  isPlaying: boolean;
  onTogglePlay: () => void;
  onDownload: () => void;
}

// 2. Xây dựng Component TrackCard
export function TrackCard({
  title,
  icon: Icon,
  themeColor,
  waveMath,
  isPlaying,
  onTogglePlay,
  onDownload,
}: TrackCardProps) {
  // Tự động chọn bộ màu dựa vào themeColor truyền vào
  const theme = themeColor === "purple" ? {
      glow: "bg-purple-500/10",
      borderHover: "hover:border-purple-400/30",
      iconTxt: "text-purple-400",
      btnBg: "bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30",
      playBg: "bg-purple-500/30 hover:bg-purple-500/40",
      waveColor: "bg-purple-400",
    } : {
      glow: "bg-cyan-500/10",
      borderHover: "hover:border-cyan-400/30",
      iconTxt: "text-cyan-400",
      btnBg: "bg-cyan-500/20 border-cyan-500/30 hover:bg-cyan-500/30",
      playBg: "bg-cyan-500/30 hover:bg-cyan-500/40",
      waveColor: "bg-cyan-400",
    };

  return (
    <div className="relative group">
      <div className={`absolute inset-0 ${theme.glow} rounded-2xl blur-xl`}></div>
      <div className={`relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all ${theme.borderHover}`}>
        
        {/* Tiêu đề & Nút Tải */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Icon className={`w-5 h-5 ${theme.iconTxt}`} />
            {title}
          </h3>
          <button
            onClick={onDownload}
            className={`px-4 py-2 border rounded-lg transition-all flex items-center gap-2 text-sm text-white ${theme.btnBg}`}
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>

        {/* Trình Phát Nhạc & Sóng Âm */}
        <div className="flex items-center gap-4">
          <button
            onClick={onTogglePlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme.playBg}`}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>

          <div className="flex-1 flex items-center gap-0.5 h-12">
            {Array.from({ length: 60 }).map((_, i) => {
              // Tính toán sóng nhạc động
              const heightMath = waveMath === "sin"
                ? Math.abs(Math.sin(i * 0.4)) * 60 + 20
                : Math.abs(Math.cos(i * 0.35)) * 50 + 25;
              const opacityMath = waveMath === "sin" ? 0.4 + (i % 8) * 0.05 : 0.4 + (i % 7) * 0.06;
              
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${theme.waveColor}`}
                  style={{ height: `${heightMath}%`, opacity: opacityMath }}
                ></div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}