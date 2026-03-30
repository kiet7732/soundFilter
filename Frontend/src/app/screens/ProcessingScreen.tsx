import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, Navigate } from "react-router";
import { Loader2, Sparkles, Brain, Mic2, Wind, Activity, CheckCircle2 } from "lucide-react";
import axios from "axios";

interface ProcessingStep {
  name: string;
  description: string;
  progress: number;
  icon: React.ReactNode;
  color: string;
}

export function ProcessingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  if (!location.state || !location.state.target) {
    return <Navigate to="/" replace />;
  }

  const selectedMode = (location.state?.target as "music" | "environment") || "music";
  const fileName = location.state?.fileName || "demo_audio_file.mp3";
  const taskId = location.state?.taskId; // Nhận taskId từ màn Upload

  const isKaraokeMode = location.state?.isKaraokeMode ?? true;

  const initialSteps = useMemo(() => {
    if (selectedMode === "environment") {
      return [
        { name: "Noise Profiling", description: "Identifying background hum...", progress: 0, icon: <Wind className="w-5 h-5" />, color: "#06B6D4" },
        { name: "Speech Isolation", description: "Enhancing vocal frequencies...", progress: 0, icon: <Activity className="w-5 h-5" />, color: "#8B5CF6" },
        { name: "Deep Clean AI", description: "Finalizing audio restoration...", progress: 0, icon: <Brain className="w-5 h-5" />, color: "#06B6D4" },
      ];
    }
    
    if (!isKaraokeMode) {
      return [
        { name: "Demucs Engine", description: "Splitting stems (Vocals, Drums...)", progress: 0, icon: <Sparkles className="w-5 h-5" />, color: "#8B5CF6" },
        { name: "Acoustic Analysis", description: "Detecting BPM, Key & Energy...", progress: 0, icon: <Brain className="w-5 h-5" />, color: "#8B5CF6" },
      ];
    }

    return [
      { name: "Demucs Engine", description: "Splitting stems (Vocals, Drums...)", progress: 0, icon: <Sparkles className="w-5 h-5" />, color: "#8B5CF6" },
      { name: "Whisper AI", description: "Generating synchronized lyrics...", progress: 0, icon: <Mic2 className="w-5 h-5" />, color: "#06B6D4" },
      { name: "Acoustic Analysis", description: "Detecting BPM, Key & Energy...", progress: 0, icon: <Brain className="w-5 h-5" />, color: "#8B5CF6" },
    ];
  }, [selectedMode]);

  const [steps, setSteps] = useState<ProcessingStep[]>(initialSteps);

  useEffect(() => {
    if (!taskId) {
      console.warn("Không tìm thấy Task ID, chạy chế độ Demo...");
    }

    // 1. Giả lập hiệu ứng phần trăm (chạy tối đa đến 95% để chờ API)
    const visualInterval = setInterval(() => {
      setSteps((prev) =>
        prev.map((step) => ({
          ...step,
          progress: Math.min(step.progress + Math.random() * 8, 95),
        }))
      );
    }, 800);

    // 2. Chức năng Polling: Hỏi thăm Backend thực tế
    const pollInterval = setInterval(async () => {
      if (!taskId) return; // Nếu không có taskId (test UI), bỏ qua gọi API

      try {
        const res = await axios.get(`http://127.0.0.1:8000/api/status/${taskId}`);
        if (res.data.status === "completed") {
          // Khi server báo xong -> Kéo phần trăm lên 100%
          setSteps((prev) => prev.map((step) => ({ ...step, progress: 100 })));

          clearInterval(pollInterval);
          clearInterval(visualInterval);

          // Chờ 1 giây cho user xem tick xanh rồi mới chuyển trang
          setTimeout(() => {
            const path = selectedMode === "music" ? "/music-workspace" : "/environment-workspace";
            // Kèm taskId sang Workspace để phát nhạc thật
            navigate(path, { 
              replace: true, 
              state: { fileName, taskId, isKaraokeMode } 
            });
          }, 1500);
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái AI:", error);
      }
    }, 3000);

    // Dành cho chế độ thiết kế UI không có Backend (Tự động chuyển trang sau 8 giây)
    let demoTimeout: ReturnType<typeof setTimeout>;
    if (!taskId) {
      demoTimeout = setTimeout(() => {
        setSteps((prev) => prev.map((step) => ({ ...step, progress: 100 })));
        setTimeout(() => {
          const path = selectedMode === "music" ? "/music-workspace" : "/environment-workspace";
          navigate(path, { state: { fileName, isKaraokeMode } });
        }, 1500);
      }, 8000);
    }

    return () => {
      clearInterval(visualInterval);
      clearInterval(pollInterval);
      if (demoTimeout) clearTimeout(demoTimeout);
    };
  }, [navigate, selectedMode, fileName, taskId, isKaraokeMode]);

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-8 overflow-hidden font-sans">
      <div className="max-w-4xl w-full space-y-10 relative">

        {/* Glow Effects */}
        <div className="absolute -top-40 -left-20 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -bottom-40 -right-20 w-80 h-80 bg-cyan-600/15 rounded-full blur-[100px] animate-pulse"></div>

        {/* Top Section */}
        <div className="text-center space-y-4 relative">
          <div className="inline-flex p-4 rounded-full bg-white/5 border border-white/10 mb-2">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-[#8B5CF6] via-white to-[#06B6D4] bg-clip-text text-transparent">
            {selectedMode === "music" ? "AI Stem Separation" : "Smart Audio Enhancement"}
          </h1>
          <p className="text-gray-400 text-lg">
            Processing: <span className="text-white font-mono">{fileName}</span>
          </p>
        </div>

        {/* Waveform Visualization */}
        <div className="relative bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl p-10 shadow-2xl">
          <div className="flex items-end justify-center gap-1.5 h-20">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-[#8B5CF6] to-[#06B6D4] rounded-full transition-all duration-300"
                style={{
                  height: `${20 + Math.random() * 80}%`,
                  opacity: 0.3 + Math.random() * 0.7,
                  animation: `demoWave ${0.6 + Math.random()}s ease-in-out infinite`,
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Processing Steps List */}
        <div className="grid gap-4">
          {steps.map((step, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-all">
              <div className="flex items-center gap-5">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${step.color}20`, color: step.color }}>
                  {step.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white tracking-wide">{step.name}</span>
                    <span className="text-sm font-mono font-bold" style={{ color: step.color }}>
                      {Math.round(step.progress)}%
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${step.progress}%`,
                        background: `linear-gradient(90deg, ${step.color}, #fff)`
                      }}
                    />
                  </div>
                </div>

                <div className="w-10 flex justify-center">
                  {step.progress >= 100 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400 animate-bounce" />
                  ) : (
                    <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-ping" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes demoWave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4); }
        }
      `}</style>
    </div>
  );
}