import { useState, useRef, useEffect } from "react";
import { Navigate, useLocation } from "react-router";
import { Play, Pause, Download, Volume2, Car, CloudRain, MessageCircle, Wind, Zap, Music, Activity, Bird } from "lucide-react";
import { Switch } from "../components/ui/switch"; 
import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// Interface hứng dữ liệu từ Backend
interface BackendTrack {
  label: string;
  confidence: number;
  file: string;
}

// Interface dùng để vẽ Giao diện
interface UI_Track {
  id: string;
  name: string;
  fileName: string;
  confidence: number;
  icon: React.ReactNode;
  color: string;
  dspEnabled: boolean;
}

export function EnvironmentWorkspace() {
  const location = useLocation();
  const taskId = location.state?.taskId;
  const originalFileName = location.state?.fileName || "noisy_environment.wav";

  if (!location.state || !location.state.taskId) {
    return <Navigate to="/" replace />;
  }

  const [isLoading, setIsLoading] = useState(true);
  const [tracks, setTracks] = useState<UI_Track[]>([]);
  
  // Trạng thái Play
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingTracks, setPlayingTracks] = useState<Record<string, boolean>>({});
  
  // Refs
  const originalRef = useRef<HTMLAudioElement>(null);
  const trackRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // ĐƯỜNG LINK
  const getResultUrl = (name: string) => `http://127.0.0.1:8000/api/files/${taskId}/${name}`;
  const getOriginalUrl = () => `http://127.0.0.1:8000/api/uploads/${taskId}_${originalFileName}`;

  // ==========================================
  // 1. TỰ ĐỘNG LẤY DANH SÁCH FILE TỪ BACKEND
  // ==========================================
  useEffect(() => {
    const fetchAITracks = async () => {
      if (!taskId) return;
      try {
        const res = await axios.get(`http://127.0.0.1:8000/api/status/${taskId}`);
        if (res.data.status === "completed" && res.data.tracks) {
          
          // Danh sách màu ngẫu nhiên cho đẹp mắt
          const colors = ["#8B5CF6", "#06B6D4", "#3B82F6", "#10B981", "#F59E0B", "#EC4899"];
          
          // Chuyển đổi dữ liệu backend thành dữ liệu UI
          const uiTracks: UI_Track[] = res.data.tracks.map((t: BackendTrack, index: number) => {
            const lbl = t.label.toLowerCase();
            let icon = <Activity className="w-5 h-5" />; // Default icon
            
            // Tự động đoán icon dựa vào tên nhãn (label) AI trả về
            if (lbl.includes("speech") || lbl.includes("voice") || lbl.includes("talk")) icon = <MessageCircle className="w-5 h-5" />;
            else if (lbl.includes("car") || lbl.includes("vehicle") || lbl.includes("engine")) icon = <Car className="w-5 h-5" />;
            else if (lbl.includes("rain") || lbl.includes("water")) icon = <CloudRain className="w-5 h-5" />;
            else if (lbl.includes("wind")) icon = <Wind className="w-5 h-5" />;
            else if (lbl.includes("music") || lbl.includes("song")) icon = <Music className="w-5 h-5" />;
            else if (lbl.includes("bird") || lbl.includes("animal")) icon = <Bird className="w-5 h-5" />;

            return {
              id: t.file, // Dùng tên file làm ID duy nhất
              name: t.label,
              fileName: t.file,
              confidence: Math.round(t.confidence * 100), // Backend trả 0.95 -> đổi thành 95%
              icon: icon,
              color: colors[index % colors.length],
              dspEnabled: lbl.includes("speech") ? true : false, // Mặc định bật DSP cho giọng nói
            };
          });

          setTracks(uiTracks);
        }
      } catch (error) {
        console.error("Lỗi lấy thông tin files:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAITracks();
  }, [taskId]);

  // ==========================================
  // 2. PHÁT NHẠC ĐỘC QUYỀN (KILL SWITCH)
  // ==========================================
  const pauseAll = () => {
    originalRef.current?.pause();
    setPlayingOriginal(false);
    
    Object.values(trackRefs.current).forEach(el => el?.pause());
    setPlayingTracks({});
  };

  const toggleOriginalPlay = () => {
    if (playingOriginal) {
      originalRef.current?.pause();
      setPlayingOriginal(false);
    } else {
      pauseAll();
      originalRef.current?.play();
      setPlayingOriginal(true);
    }
  };

  const toggleTrackPlay = (id: string) => {
    const isPlaying = playingTracks[id];
    const audioEl = trackRefs.current[id];

    if (isPlaying) {
      audioEl?.pause();
      setPlayingTracks(prev => ({ ...prev, [id]: false }));
    } else {
      pauseAll(); // Tắt hết nhạc khác
      audioEl?.play(); // Bật nhạc hiện tại
      setPlayingTracks({ [id]: true });
    }
  };

  // ==========================================
  // 3. TẢI XUỐNG CÁ NHÂN VÀ TẢI TẤT CẢ (ZIP)
  // ==========================================
  const handleDownloadSingle = async (url: string, downloadName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert("Lỗi tải xuống!");
    }
  };

  const handleDownloadAllZIP = async () => {
    try {
      alert("Đang đóng gói file. Vui lòng chờ vài giây...");
      const zip = new JSZip();

      const addFileToZip = async (url: string, filename: string) => {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          zip.file(filename, blob);
        }
      };

      const promises = [addFileToZip(getOriginalUrl(), `Original_${originalFileName}`)];
      tracks.forEach(t => promises.push(addFileToZip(getResultUrl(t.fileName), t.fileName)));

      await Promise.all(promises);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `OmniSplit_Environment_${Date.now()}.zip`);
    } catch (error) {
      alert("Lỗi nén ZIP!");
    }
  };

  const toggleDSP = (id: string) => {
    setTracks(tracks.map(track => track.id === id ? { ...track, dspEnabled: !track.dspEnabled } : track));
  };

  // ==========================================
  // GIAO DIỆN
  // ==========================================
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Đang tải dữ liệu từ AI...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      {/* THẺ AUDIO ẨN */}
      <audio ref={originalRef} src={getOriginalUrl()} onEnded={() => setPlayingOriginal(false)} />

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
              <div className="flex-1 flex items-center gap-0.5 h-16">
                {Array.from({ length: 120 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-[#06B6D4] to-[#8B5CF6] rounded-full transition-all" style={{ height: `${Math.random() * 60 + 30}%`, opacity: 0.3 + Math.random() * 0.4 }}></div>
                ))}
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
              {tracks.map((track) => (
                <div key={`tag-${track.id}`} className="relative group/tag overflow-hidden rounded-xl transition-all hover:scale-105">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundColor: track.color }}></div>
                  <div className="relative px-5 py-3 border backdrop-blur-sm" style={{ borderColor: `${track.color}40`, backgroundColor: `${track.color}10` }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${track.color}30`, color: track.color }}>{track.icon}</div>
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
              ))}
            </div>
          </div>
        </div>

        {/* Isolated Tracks Rendering */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-[#06B6D4]" /> Isolated Audio Tracks
          </h3>

          {tracks.length === 0 && <p className="text-gray-400">Không tìm thấy âm thanh nào.</p>}

          {tracks.map((track) => (
            <div key={track.id} className="relative group/track">
              {/* Audio Ẩn */}
              <audio 
                ref={el => { trackRefs.current[track.id] = el; }}
                src={getResultUrl(track.fileName)} 
                onEnded={() => setPlayingTracks(prev => ({ ...prev, [track.id]: false }))} 
              />

              <div className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover/track:opacity-100 transition-opacity" style={{ backgroundColor: `${track.color}15` }}></div>
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl" style={{ backgroundColor: `${track.color}20`, borderColor: `${track.color}40`, borderWidth: "1px", color: track.color }}>
                    {track.icon}
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
                      <div className="flex-1 flex items-center gap-0.5 h-12">
                        {Array.from({ length: 80 }).map((_, i) => (
                          <div key={i} className="flex-1 rounded-full" style={{ backgroundColor: track.color, height: `${Math.random() * 50 + 30}%`, opacity: 0.3 + Math.random() * 0.4 }}></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                    <label className="text-xs text-gray-400 text-center">Apply DSP<br />Noise Filter</label>
                    <Switch checked={track.dspEnabled} onCheckedChange={() => toggleDSP(track.id)} />
                  </div>

                  <button
                    onClick={() => handleDownloadSingle(getResultUrl(track.fileName), track.fileName)}
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
          ))}
        </div>
      </div>
    </div>
  );
}