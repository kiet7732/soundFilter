// Editor cho lyrics với expand/collapse và edit functionality

import { useState } from "react";
import { Maximize2, Minimize2, AlertTriangle, Save, Edit3 } from "lucide-react";
import { formatTime } from "../../utils/formatters";
import type { LyricLine } from "../../types/music.types";

interface LyricsEditorProps {
  lyrics: LyricLine[];
  issues: any[];
  isExpanded: boolean;
  editingLyric: number | null;
  isRendering?: boolean;
  onToggleExpand: () => void;
  onStartEdit: (segmentId: number) => void;
  onUpdateLyric: (segmentId: number, newText: string) => void;
}

export function LyricsEditor({
  lyrics,
  issues,
  isExpanded,
  editingLyric,
  isRendering,
  onToggleExpand,
  onStartEdit,
  onUpdateLyric,
}: LyricsEditorProps) {
  const [editText, setEditText] = useState("");

  const handleSave = (segmentId: number) => {
    onUpdateLyric(segmentId, editText);
    setEditText("");
  };

  return (
    <div
      className={
        isExpanded
          ? "fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md transition-all duration-300"
          : "relative group"
      }
    >
      {!isExpanded && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/10 to-[#06B6D4]/10 rounded-2xl blur-xl" />
      )}
      <div
        className={`relative bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 ${isExpanded
            ? "w-full max-w-5xl h-[85vh] rounded-3xl p-8 flex flex-col shadow-2xl shadow-[#8B5CF6]/20"
            : "rounded-2xl p-6"
          }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3
              className={`${isExpanded ? "text-2xl" : "text-lg"
                } font-semibold text-white`}
            >
              📝 Lyric Editor
            </h3>
            {issues.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-300">
                  {issues.length} issue{issues.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            {isExpanded ? (
              <Minimize2 className="w-5 h-5 text-gray-400" />
            ) : (
              <Maximize2 className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        <div
          className={`space-y-3 ${isExpanded ? "overflow-y-auto flex-1 pr-2" : "max-h-96 overflow-y-auto"
            }`}
        >
          {isRendering ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 opacity-70">
              <p>Trình chỉnh sửa đang tạm ẩn trong lúc render video...</p>
            </div>
          ) : (
            lyrics.map((line) => (
              <div
                key={line.segment_id}
                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-[#06B6D4]">
                        {formatTime(line.start)} → {formatTime(line.end)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${line.confidence > 0.8
                            ? "bg-green-500/20 text-green-300"
                            : line.confidence > 0.5
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                      >
                        {(line.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    {editingLyric === line.segment_id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue={line.full_text}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#8B5CF6]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(line.segment_id)}
                          className="px-4 py-2 bg-[#8B5CF6] rounded-lg hover:bg-[#7C3AED] transition-all flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    ) : (
                      <p className="text-white">{line.full_text}</p>
                    )}
                  </div>

                  {editingLyric !== line.segment_id && (
                    <button
                      onClick={() => {
                        onStartEdit(line.segment_id);
                        setEditText(line.full_text);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
