import { useState } from "react";
import { useNavigate } from "react-router";
import { CloudUpload, Music, Mic, Wind, Activity, ArrowRight, Sparkles, Loader2, Server } from "lucide-react";
import axios from "axios";
import { useFileUpload } from "../hooks/useFileUpload";
import { useServerHealth } from "../hooks/useServerHealth";
import { API_BASE_URL } from "../services/api";

export function UploadDashboard() {
  const navigate = useNavigate();
  const fileUpload = useFileUpload();
  const { isServerConnected } = useServerHealth();

  const [selectedMode, setSelectedMode] = useState<"music" | "environment" | null>(null);
  const [isKaraokeMode, setIsKaraokeMode] = useState(true);
  const [songName, setSongName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleProcess = async () => {
    if (!selectedMode || !fileUpload.selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", fileUpload.selectedFile);

    try {
      let response;
      if (selectedMode === "music") {
        formData.append("karaoke_mode", isKaraokeMode.toString());
        formData.append("song_name", songName.trim() !== "" ? songName : fileUpload.selectedFile.name);
        response = await axios.post(`${API_BASE_URL}/api/separate-music`, formData);
      } else {
        formData.append("prompt", "noise, speech");
        response = await axios.post(`${API_BASE_URL}/api/separate-env`, formData);
      }

      const taskId = response.data.task_id;

      navigate("/processing", {
        state: {
          target: selectedMode,
          fileName: songName.trim() !== "" ? songName : fileUpload.selectedFile.name,
          taskId: taskId,
          isKaraokeMode: isKaraokeMode,
        },
      });
    } catch (error) {
      console.error("Lỗi kết nối API:", error);
      alert("Không thể kết nối máy chủ AI. Hãy chắc chắn FastAPI ở cổng 8000 đang chạy.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative min-h-screen p-8 flex items-center justify-center overflow-hidden">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileUpload.fileInputRef}
        onChange={fileUpload.handleFileChange}
        accept="audio/*"
        className="hidden"
      />

      {/* Server Status */}
      <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm z-50">
        <Server className="w-4 h-4 text-white/70" />
        <span className="text-sm font-medium text-white/70 hidden sm:inline">FastAPI:</span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-3 w-3">
            {isServerConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${isServerConnected ? "bg-green-500" : "bg-orange-300"
                }`}
            ></span>
          </span>
          <span className={`text-sm font-semibold ${isServerConnected ? "text-green-400" : "text-orange-300"}`}>
            {isServerConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="max-w-5xl w-full space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] rounded-full blur-3xl opacity-30 animate-pulse"></div>
              <div className="relative flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-[#8B5CF6]" />
                <h1 className="text-5xl font-bold bg-gradient-to-r from-[#8B5CF6] via-purple-400 to-[#06B6D4] bg-clip-text text-transparent">
                  SoundFilter AI
                </h1>
                <Sparkles className="w-8 h-8 text-[#06B6D4]" />
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-xl">Separate, isolate, and enhance audio with cutting-edge AI</p>
        </div>

        {/* Mode Selection */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white text-center mb-6">Choose Your Processing Mode</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Music Mode Card */}
            <button
              onClick={() => setSelectedMode("music")}
              className={`relative group h-full w-full overflow-hidden rounded-3xl transition-all duration-300 ${selectedMode === "music" ? "scale-105 shadow-2xl shadow-purple-500/50" : "hover:scale-[1.02] shadow-lg"
                }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 transition-opacity duration-300 ${selectedMode === "music" ? "opacity-100" : "opacity-70 group-hover:opacity-90"
                  }`}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-10 text-left space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Mic className="w-10 h-10 text-white" />
                  </div>
                  {selectedMode === "music" && (
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="w-6 h-6 text-white/90" />
                    <h3 className="text-2xl font-bold text-white">Music & Karaoke</h3>
                  </div>
                  <p className="text-white/80 text-base leading-relaxed">
                    Perfect for music production, vocal extraction, and creating karaoke videos with synced lyrics.
                  </p>
                </div>
                <div
                  className={`flex items-center gap-2 text-white font-medium transition-all ${selectedMode === "music" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                >
                  <span>Selected</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>

            {/* Environment Mode Card */}
            <button
              onClick={() => setSelectedMode("environment")}
              className={`relative group overflow-hidden rounded-3xl transition-all duration-300 ${selectedMode === "environment"
                ? "scale-105 shadow-2xl shadow-cyan-500/50"
                : "hover:scale-[1.02] shadow-lg"
                }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br from-cyan-600 via-cyan-500 to-blue-500 transition-opacity duration-300 ${selectedMode === "environment" ? "opacity-100" : "opacity-70 group-hover:opacity-90"
                  }`}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-10 text-left space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Wind className="w-10 h-10 text-white" />
                  </div>
                  {selectedMode === "environment" && (
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-3 h-3 bg-cyan-600 rounded-full"></div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-6 h-6 text-white/90" />
                    <h3 className="text-2xl font-bold text-white">Smart Environment</h3>
                  </div>
                  <p className="text-white/80 text-base leading-relaxed">
                    Ideal for podcasts, interviews, and field recordings. Remove noise and isolate speech.
                  </p>
                </div>
                <div
                  className={`flex items-center gap-2 text-white font-medium transition-all ${selectedMode === "environment" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                >
                  <span>Selected</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Upload Zone */}
        {selectedMode && (
          <div className="space-y-6 animate-fadeIn mt-8">
            {/* Music Mode Settings */}
            {selectedMode === "music" && (
              <div className="relative max-w-2xl mx-auto group">
                <div className="absolute inset-0 bg-purple-600/20 rounded-2xl blur-xl transition-all duration-300 group-hover:bg-purple-600/30"></div>

                <div className="relative flex flex-col sm:flex-row items-center gap-4 p-5 bg-gradient-to-br from-purple-900/40 to-[#0F172A]/90 border border-purple-500/50 rounded-2xl shadow-xl shadow-purple-900/30">
                  <div className="flex-1 flex items-center gap-3 w-full">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Mic className="w-5 h-5 text-purple-300" />
                    </div>
                    <input
                      type="text"
                      placeholder="Tên bài hát - ca sĩ (Có để file karaoke tốt hơn)..."
                      value={songName}
                      onChange={(e) => setSongName(e.target.value)}
                      className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-gray-400 font-medium"
                    />
                  </div>
                  <div className="h-px w-full sm:w-px sm:h-10 bg-purple-500/30 shrink-0"></div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <span className="text-white text-sm font-semibold whitespace-nowrap pl-1">Karaoke Mode</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${isKaraokeMode ? "text-purple-400" : "text-gray-500"}`}>
                        {isKaraokeMode ? "ON" : "OFF"}
                      </span>
                      <button
                        onClick={() => setIsKaraokeMode(!isKaraokeMode)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${isKaraokeMode ? "bg-purple-600 shadow-lg shadow-purple-600/50" : "bg-white/10"
                          }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${isKaraokeMode ? "translate-x-7" : "translate-x-1"
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold text-white text-center">Upload Your Audio File</h3>

            {/* Upload Area */}
            <div
              className={`relative group ${fileUpload.isDragging ? "scale-[1.01]" : ""
                } transition-transform duration-200 max-w-2xl mx-auto cursor-pointer`}
              onDragOver={fileUpload.handleDragOver}
              onDragLeave={fileUpload.handleDragLeave}
              onDrop={fileUpload.handleDrop}
              onClick={fileUpload.handleFileSelect}
            >
              <div
                className={`absolute inset-0 rounded-2xl blur-xl transition-opacity ${fileUpload.isDragging
                  ? selectedMode === "music"
                    ? "bg-purple-500/30 opacity-100"
                    : "bg-cyan-500/30 opacity-100"
                  : "bg-white/5 opacity-0 group-hover:opacity-100"
                  }`}
              ></div>

              <div
                className={`relative bg-white/5 backdrop-blur-sm border-2 border-dashed rounded-2xl p-12 text-center transition-all ${fileUpload.isDragging
                  ? selectedMode === "music"
                    ? "border-purple-400 bg-purple-500/10"
                    : "border-cyan-400 bg-cyan-500/10"
                  : fileUpload.selectedFile
                    ? "border-green-400/50 bg-green-500/5"
                    : "border-white/20 hover:border-white/40"
                  }`}
              >
                <div className="flex flex-col items-center gap-4">
                  {fileUpload.selectedFile ? (
                    <>
                      <div
                        className={`p-4 rounded-full ${selectedMode === "music" ? "bg-purple-500/20" : "bg-cyan-500/20"
                          }`}
                      >
                        <Music
                          className={`w-10 h-10 ${selectedMode === "music" ? "text-purple-400" : "text-cyan-400"}`}
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium text-lg">{fileUpload.selectedFile.name}</p>
                        <p className="text-gray-400 text-sm mt-1">Ready to process (Click to change file)</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`p-4 rounded-full ${selectedMode === "music" ? "bg-purple-500/20" : "bg-cyan-500/20"
                          }`}
                      >
                        <CloudUpload
                          className={`w-10 h-10 ${selectedMode === "music" ? "text-purple-400" : "text-cyan-400"}`}
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium text-lg">Click here or drop your audio file</p>
                        <p className="text-gray-400 mt-1">MP3, WAV, FLAC, M4A • Max 50MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Process Button */}
            {fileUpload.selectedFile && (
              <div className="text-center pt-4 animate-fadeIn">
                <button
                  onClick={handleProcess}
                  disabled={isUploading || !isServerConnected}
                  className={`relative group/btn px-16 py-5 rounded-2xl font-semibold text-lg overflow-hidden transition-all hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${selectedMode === "music" ? "shadow-purple-500/50" : "shadow-cyan-500/50"
                    }`}
                >
                  <div
                    className={`absolute inset-0 transition-opacity ${selectedMode === "music"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600"
                      : "bg-gradient-to-r from-cyan-600 to-blue-600"
                      }`}
                  ></div>
                  <div
                    className={`absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity ${selectedMode === "music"
                      ? "bg-gradient-to-r from-pink-600 to-purple-600"
                      : "bg-gradient-to-r from-blue-600 to-cyan-600"
                      }`}
                  ></div>
                  <span className="relative text-white flex items-center gap-3">
                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                    {isUploading ? "Uploading & Analyzing..." : "Start AI Processing"}
                    {!isUploading && <ArrowRight className="w-6 h-6" />}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}