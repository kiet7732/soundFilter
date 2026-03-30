import { useState, useRef } from "react";
import { Navigate, useLocation } from "react-router";
import { Play, Pause, Download, Upload, Film, Save, Edit3, Volume2, Music } from "lucide-react";
import { Switch } from "../components/ui/switch"; 
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { TrackCard, type TrackCardProps } from "../components/TrackCardProps";

interface LyricLine {
  timestamp: string;
  text: string;
}

export function MusicWorkspace() {
  const location = useLocation();
  const taskId = location.state?.taskId;
  const fileName = location.state?.fileName || "summer_vibes.mp3";

  if (!location.state || !location.state.taskId) {
    return <Navigate to="/" replace />;
  }

  // Lấy trạng thái Karaoke từ màn hình trước truyền sang (Mặc định là true)
  const isKaraokeMode = location.state?.isKaraokeMode ?? true;

  // State quản lý việc phát nhạc độc lập
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingVocals, setPlayingVocals] = useState(false);
  const [playingBass, setPlayingBass] = useState(false);
  const [playingDrums, setPlayingDrums] = useState(false);
  const [playingOther, setPlayingOther] = useState(false);
  const [playingBeat, setPlayingBeat] = useState(false);

  // Tham chiếu đến các thẻ audio ẩn
  const originalRef = useRef<HTMLAudioElement>(null);
  const vocalsRef = useRef<HTMLAudioElement>(null);
  const bassRef = useRef<HTMLAudioElement>(null);
  const drumsRef = useRef<HTMLAudioElement>(null);
  const otherRef = useRef<HTMLAudioElement>(null);
  const beatRef = useRef<HTMLAudioElement>(null);

  const [editingLyric, setEditingLyric] = useState<number | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([
    { timestamp: "00:00.0", text: "Welcome to the future of music" },
    { timestamp: "00:05.2", text: "Where AI meets creativity" },
    { timestamp: "00:10.5", text: "Splitting sounds with precision" },
    { timestamp: "00:15.8", text: "Creating magic in every note" },
    { timestamp: "00:21.0", text: "This is SoundFilter AI" },
  ]);

  // HÀM TẠO ĐƯỜNG LINK
  const getResultUrl = (name: string) => `http://127.0.0.1:8000/api/files/${taskId}/${name}`;
  // Lấy file gốc từ thư mục uploads (Do lúc upload lưu tên là taskId.mp3 hoặc taskId_filename)
  const getOriginalUrl = () => `http://127.0.0.1:8000/api/uploads/${taskId}.${fileName.split('.').pop()}`;

  // HÀM TẢI XUỐNG
  const handleDownload = async (url: string, downloadName: string) => {
    try {
      // 1. Dùng fetch để kéo mảng byte của file âm thanh về
      const response = await fetch(url);
      if (!response.ok) throw new Error("Lỗi khi tải file từ máy chủ");

      // 2. Chuyển dữ liệu thành dạng Blob (Khối dữ liệu nhị phân cục bộ)
      const blob = await response.blob();

      // 3. Tạo một đường link ảo (Local URL) nằm ngay trên trình duyệt của người dùng
      const blobUrl = window.URL.createObjectURL(blob);

      // 4. Tạo thẻ <a> và kích hoạt click như cũ
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName; // Lúc này trình duyệt chắc chắn sẽ nghe lời và tải về
      document.body.appendChild(link);
      link.click();

      // 5. Dọn dẹp rác bộ nhớ sau khi tải xong
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error("Lỗi tải xuống:", error);
      alert("Đã xảy ra lỗi khi tải file. Vui lòng kiểm tra lại kết nối!");
    }
  };

  const handleDownloadAll = async () => {
    try {
      // alert("Đang đóng gói dữ liệu... Quá trình này có thể mất vài giây."); // Nên thay bằng Toast notification nếu có

      const zip = new JSZip();

      // Hàm phụ trợ: Kéo file về dạng Blob và nhét vào gói ZIP
      const addFileToZip = async (url: string, filename: string) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Lỗi tải file: ${filename}`);
        const blob = await response.blob();
        zip.file(filename, blob);
      };

      // Tải CÙNG LÚC 6 file về bộ nhớ tạm 
      await Promise.all([
        addFileToZip(getOriginalUrl(), `Original_${fileName}`),
        addFileToZip(getResultUrl("vocals.wav"), "Vocals.wav"),
        addFileToZip(getResultUrl("bass.wav"), "Bass.wav"),
        addFileToZip(getResultUrl("drums.wav"), "Drums.wav"),
        addFileToZip(getResultUrl("other.wav"), "Other.wav"),
        addFileToZip(getResultUrl("beat.wav"), "Beat_Karaoke.wav")
      ]);

      // Bắt đầu nén và ép trình duyệt tải file .zip về
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `OmniSplit_Export_${Date.now()}.zip`);

    } catch (error) {
      console.error("Lỗi khi nén file ZIP:", error);
      alert("Đã xảy ra lỗi khi đóng gói file tải về!");
    }
  };

  // HÀM NGẮT TOÀN BỘ ÂM THANH
  const pauseAllTracks = () => {
    // 1. Dừng tất cả thẻ audio vật lý
    originalRef.current?.pause();
    vocalsRef.current?.pause();
    bassRef.current?.pause();
    drumsRef.current?.pause();
    otherRef.current?.pause();
    beatRef.current?.pause();

    // 2. Reset toàn bộ trạng thái UI về nút Play (false)
    setPlayingOriginal(false);
    setPlayingVocals(false);
    setPlayingBass(false);
    setPlayingDrums(false);
    setPlayingOther(false);
    setPlayingBeat(false);
  };

  // HÀM TẮT/BẬT NHẠC
  const togglePlay = (
    ref: React.RefObject<HTMLAudioElement | null>,
    isPlaying: boolean,
    setPlaying: (val: boolean) => void
  ) => {
    if (isPlaying) {
      // Nếu chính nó đang phát -> Chỉ cần bấm dừng nó lại
      ref.current?.pause();
      setPlaying(false);
    } else {
      // Nếu nó đang tắt -> ÉP DỪNG TOÀN BỘ CÁC BÀI KHÁC TRƯỚC
      pauseAllTracks();

      // Sau khi không gian đã yên tĩnh, mới phát bài này lên
      ref.current?.play();
      setPlaying(true);
    }
  };

  const stemTracks: TrackCardProps[] = [
    { title: "Vocals", fileName: "vocals.wav", icon: Volume2, themeColor: "purple", waveMath: "sin", isPlaying: playingVocals, onTogglePlay: () => togglePlay(vocalsRef, playingVocals, setPlayingVocals), onDownload: () => handleDownload(getResultUrl("vocals.wav"), "Vocals.wav") },
    { title: "Bass", fileName: "bass.wav", icon: Music, themeColor: "cyan", waveMath: "cos", isPlaying: playingBass, onTogglePlay: () => togglePlay(bassRef, playingBass, setPlayingBass), onDownload: () => handleDownload(getResultUrl("bass.wav"), "Bass.wav") },
    { title: "Drums", fileName: "drums.wav", icon: Music, themeColor: "cyan", waveMath: "cos", isPlaying: playingDrums, onTogglePlay: () => togglePlay(drumsRef, playingDrums, setPlayingDrums), onDownload: () => handleDownload(getResultUrl("drums.wav"), "Drums.wav") },
    { title: "Other", fileName: "other.wav", icon: Music, themeColor: "cyan", waveMath: "cos", isPlaying: playingOther, onTogglePlay: () => togglePlay(otherRef, playingOther, setPlayingOther), onDownload: () => handleDownload(getResultUrl("other.wav"), "Other.wav") },
  ];

  return (
    <div className="min-h-screen p-8">
      {/* CÁC THẺ AUDIO ẨN DÙNG ĐỂ PHÁT NHẠC THẬT */}
      <audio ref={originalRef} src={getOriginalUrl()} onEnded={() => setPlayingOriginal(false)} />
      <audio ref={vocalsRef} src={getResultUrl("vocals.wav")} onEnded={() => setPlayingVocals(false)} />
      {/* Ghi chú: Demucs xuất ra drums, bass, other. Ở đây lấy bass.wav làm ví dụ cho Bass */}
      <audio ref={bassRef} src={getResultUrl("bass.wav")} onEnded={() => setPlayingBass(false)} />
      <audio ref={drumsRef} src={getResultUrl("drums.wav")} onEnded={() => setPlayingDrums(false)} />
      <audio ref={otherRef} src={getResultUrl("other.wav")} onEnded={() => setPlayingOther(false)} />
      <audio ref={beatRef} src={getResultUrl("beat.wav")} onEnded={() => setPlayingBeat(false)} />

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
            className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-purple-600 rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>

        {/* Original Audio Player */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/10 to-[#06B6D4]/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-[#8B5CF6]" />
              Original Audio
            </h3>

            <div className="flex items-center gap-4">
              <button
                onClick={() => togglePlay(originalRef, playingOriginal, setPlayingOriginal)}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center hover:scale-110 transition-transform"
              >
                {playingOriginal ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
              </button>

              {/* Waveform Giữ nguyên */}
              <div className="flex-1 flex items-center gap-0.5 h-16">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-[#8B5CF6] to-[#06B6D4] rounded-full transition-all" style={{ height: `${Math.sin(i * 0.3) * 30 + 40}%`, opacity: 0.3 + (i % 10) * 0.05 }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stems Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stemTracks.map((track) => (
             <TrackCard key={track.title} {...track} />
          ))}
        </div>

        {/* ========================================== */}
        {/* Beat Section (1 Track nằm ngang) */}
        {/* ========================================== */}
        <TrackCard 
          title="Beat / Instrumental"
          fileName="beat.wav"
          icon={Music}
          themeColor="cyan"
          waveMath="cos"
          isPlaying={playingBeat}
          onTogglePlay={() => togglePlay(beatRef, playingBeat, setPlayingBeat)}
          onDownload={() => handleDownload(getResultUrl("beat.wav"), "Beat.wav")}
        />

        {isKaraokeMode && (
          <>
            {/* Lyric Editor */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/10 to-[#06B6D4]/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-[#06B6D4]" />
                    Lyric Editor
                  </h3>
                  <button className="px-4 py-2 bg-[#06B6D4]/20 border border-[#06B6D4]/30 rounded-lg hover:bg-[#06B6D4]/30 transition-all flex items-center gap-2 text-sm">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {lyrics.map((lyric, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all group/item"
                    >
                      <span className="text-sm font-mono text-[#8B5CF6] min-w-[80px]">
                        [{lyric.timestamp}]
                      </span>

                      {editingLyric === index ? (
                        <input
                          type="text"
                          value={lyric.text}
                          // onChange={(e) => updateLyric(index, e.target.value)}
                          onBlur={() => setEditingLyric(null)}
                          className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-1 text-white outline-none focus:border-[#06B6D4]"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 text-gray-300">{lyric.text}</span>
                      )}

                      <button
                        onClick={() => setEditingLyric(index)}
                        className="opacity-0 group-hover/item:opacity-100 p-2 hover:bg-white/10 rounded transition-all"
                      >
                        <Edit3 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Karaoke Engine */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-8">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] to-pink-500 rounded-2xl blur-xl opacity-50"></div>
                      <div className="relative bg-gradient-to-r from-[#8B5CF6] to-pink-500 p-4 rounded-2xl">
                        <Film className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Karaoke Video Engine
                    </h3>
                    <p className="text-gray-400">
                      Create a professional karaoke video with synchronized lyrics
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Upload Background Image
                    </button>

                    <div className="text-sm text-gray-500">or use default template</div>
                  </div>

                  <button className="relative group/btn px-12 py-5 rounded-2xl font-semibold text-lg overflow-hidden transition-all hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] via-purple-500 to-pink-500 opacity-100 group-hover/btn:opacity-90 transition-opacity"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-[#8B5CF6] opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    <span className="relative text-white flex items-center gap-3">
                      <Film className="w-6 h-6" />
                      🎬 Render Karaoke Video (MP4)
                    </span>
                  </button>

                  <p className="text-xs text-gray-500">
                    Estimated render time: 2-3 minutes • Output: 1080p MP4
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
        
      </div>
    </div>
  );
}