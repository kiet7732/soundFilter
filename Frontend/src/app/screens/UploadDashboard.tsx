import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { CloudUpload, Music, Mic, Wind, Activity, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import axios from "axios";

export function UploadDashboard() {
  const navigate = useNavigate();
  // 1. THÊM REF ĐỂ GỌI HỘP THOẠI CHỌN FILE
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"music" | "environment" | null>(null);
  
  const [isKaraokeMode, setIsKaraokeMode] = useState(true);

  // 2. LƯU TRỮ ĐỐI TƯỢNG FILE THẬT, KHÔNG LƯU CHUỖI STRING
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // 3. HỨNG FILE THẬT KHI KÉO THẢ
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // 4. MỞ HỘP THOẠI KHI CLICK
  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Xóa cache để chọn lại file cũ không bị lỗi
      fileInputRef.current.click();
    }
  };

  // 5. HỨNG FILE TỪ HỘP THOẠI HỆ THỐNG
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!selectedMode || !selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      let response;
      if (selectedMode === "music") {
        formData.append("karaoke_mode", isKaraokeMode.toString());
        response = await axios.post("http://127.0.0.1:8000/api/separate-music", formData);
      } else {
        formData.append("prompt", "noise, speech"); 
        response = await axios.post("http://127.0.0.1:8000/api/separate-env", formData);
      }

      const taskId = response.data.task_id;

      navigate("/processing", { 
        state: { 
          target: selectedMode,
          fileName: selectedFile.name, // Truyền tên file thật sang màn hình sau
          taskId: taskId,
          isKaraokeMode: isKaraokeMode
        } 
      });
    } catch (error) {
      console.error("Lỗi kết nối API:", error);
      alert("Không thể kết nối máy chủ AI. Hãy chắc chắn FastAPI ở cổng 8000 đang chạy.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      {/* THẺ INPUT ẨN - TRÁI TIM CỦA TÍNH NĂNG UPLOAD */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="audio/*" 
        className="hidden" 
      />

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
            
            {/* MUSIC MODE CARD VỚI SIDEBAR KARAOKE */}
            <div className="relative h-full w-full">
              
              {selectedMode === "music" && (
                <div className="hidden lg:flex absolute top-0 -left-20 bottom-0 w-16 bg-[#0F172A]/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl flex-col items-center justify-between py-6 shadow-[0_0_30px_rgba(139,92,246,0.15)] z-20 animate-fadeInLeft">
                  <div className="p-2 bg-purple-500/20 rounded-full border border-purple-500/30">
                    <Mic className="w-5 h-5 text-purple-400" />
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-white/80 text-xs font-bold tracking-[0.2em] uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      Karaoke Mode
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <span className={`text-[10px] font-bold ${isKaraokeMode ? 'text-purple-400' : 'text-gray-500'}`}>
                      {isKaraokeMode ? "ON" : "OFF"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsKaraokeMode(!isKaraokeMode); }}
                      className={`relative inline-flex w-8 h-14 items-center justify-center rounded-full transition-colors duration-300 focus:outline-none border border-white/10 ${
                        isKaraokeMode ? 'bg-purple-600/50' : 'bg-black/50'
                      }`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full transition-all duration-300 shadow-lg ${
                        isKaraokeMode ? '-translate-y-3 bg-purple-400 shadow-purple-500/50' : 'translate-y-3 bg-gray-500'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {selectedMode === "music" && (
                <div className="lg:hidden flex items-center justify-between p-4 mb-4 bg-[#0F172A]/80 border border-purple-500/30 rounded-2xl animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-semibold">Karaoke Mode</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${isKaraokeMode ? 'text-purple-400' : 'text-gray-500'}`}>
                      {isKaraokeMode ? "ON" : "OFF"}
                    </span>
                    <button
                      onClick={() => setIsKaraokeMode(!isKaraokeMode)}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                        isKaraokeMode ? 'bg-purple-600' : 'bg-white/20'
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        isKaraokeMode ? 'translate-x-8' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedMode("music")}
                className={`relative group h-full w-full overflow-hidden rounded-3xl transition-all duration-300 ${
                  selectedMode === "music" ? "scale-105 shadow-2xl shadow-purple-500/50" : "hover:scale-[1.02] shadow-lg"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 transition-opacity duration-300 ${
                  selectedMode === "music" ? "opacity-100" : "opacity-70 group-hover:opacity-90"
                }`}></div>
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
                    <p className="text-white/80 text-base leading-relaxed">Perfect for music production, vocal extraction, and creating karaoke videos with synced lyrics.</p>
                  </div>
                  <div className={`flex items-center gap-2 text-white font-medium transition-all ${selectedMode === "music" ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <span>Selected</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            </div>

            {/* ENVIRONMENT MODE CARD */}
            <button
              onClick={() => setSelectedMode("environment")}
              className={`relative group overflow-hidden rounded-3xl transition-all duration-300 ${
                selectedMode === "environment" ? "scale-105 shadow-2xl shadow-cyan-500/50" : "hover:scale-[1.02] shadow-lg"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-cyan-600 via-cyan-500 to-blue-500 transition-opacity duration-300 ${
                selectedMode === "environment" ? "opacity-100" : "opacity-70 group-hover:opacity-90"
              }`}></div>
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
                  <p className="text-white/80 text-base leading-relaxed">Ideal for podcasts, interviews, and field recordings. Remove noise and isolate speech.</p>
                </div>
                <div className={`flex items-center gap-2 text-white font-medium transition-all ${selectedMode === "environment" ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <span>Selected</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Upload Zone */}
        {selectedMode && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-white text-center mt-8">
              Upload Your Audio File
            </h3>
            
            <div
              className={`relative group ${isDragging ? "scale-[1.01]" : ""} transition-transform duration-200 max-w-2xl mx-auto cursor-pointer`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleFileSelect}
            >
              <div className={`absolute inset-0 rounded-2xl blur-xl transition-opacity ${
                isDragging ? (selectedMode === "music" ? "bg-purple-500/30 opacity-100" : "bg-cyan-500/30 opacity-100") : "bg-white/5 opacity-0 group-hover:opacity-100"
              }`}></div>
              
              <div className={`relative bg-white/5 backdrop-blur-sm border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging ? (selectedMode === "music" ? "border-purple-400 bg-purple-500/10" : "border-cyan-400 bg-cyan-500/10") : selectedFile ? "border-green-400/50 bg-green-500/5" : "border-white/20 hover:border-white/40"
              }`}>
                <div className="flex flex-col items-center gap-4">
                  {selectedFile ? (
                    <>
                      <div className={`p-4 rounded-full ${selectedMode === "music" ? "bg-purple-500/20" : "bg-cyan-500/20"}`}>
                        <Music className={`w-10 h-10 ${selectedMode === "music" ? "text-purple-400" : "text-cyan-400"}`} />
                      </div>
                      <div>
                        {/* IN RA TÊN FILE THẬT, KHÔNG PHẢI TÊN GIẢ LẬP */}
                        <p className="text-white font-medium text-lg">{selectedFile.name}</p> 
                        <p className="text-gray-400 text-sm mt-1">Ready to process (Click to change file)</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`p-4 rounded-full ${selectedMode === "music" ? "bg-purple-500/20" : "bg-cyan-500/20"}`}>
                        <CloudUpload className={`w-10 h-10 ${selectedMode === "music" ? "text-purple-400" : "text-cyan-400"}`} />
                      </div>
                      <div>
                        <p className="text-white font-medium text-lg">Click here or drop your audio file</p>
                        <p className="text-gray-400 mt-1">MP3, WAV, FLAC, M4A • Max 20MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Process Button */}
            {selectedFile && (
              <div className="text-center pt-4 animate-fadeIn">
                <button
                  onClick={handleProcess}
                  disabled={isUploading}
                  className={`relative group/btn px-16 py-5 rounded-2xl font-semibold text-lg overflow-hidden transition-all hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    selectedMode === "music" ? "shadow-purple-500/50" : "shadow-cyan-500/50"
                  }`}
                >
                  <div className={`absolute inset-0 transition-opacity ${
                    selectedMode === "music" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gradient-to-r from-cyan-600 to-blue-600"
                  }`}></div>
                  <div className={`absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity ${
                    selectedMode === "music" ? "bg-gradient-to-r from-pink-600 to-purple-600" : "bg-gradient-to-r from-blue-600 to-cyan-600"
                  }`}></div>
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
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeInLeft {
          animation: fadeInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}