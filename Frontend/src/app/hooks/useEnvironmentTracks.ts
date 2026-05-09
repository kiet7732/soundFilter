/**
 * useEnvironmentTracks Hook
 * Quản lý logic cho environment tracks
 */
import { useState, useEffect } from "react";
import axios from "axios";
import type { BackendTrack, EnvironmentTrack } from "../types/environment.types";
import { API_BASE_URL } from "../services/api";

export function useEnvironmentTracks(taskId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [tracks, setTracks] = useState<EnvironmentTrack[]>([]);

  useEffect(() => {
    const fetchAITracks = async () => {
      if (!taskId) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/status/${taskId}`);
        if (res.data.status === "completed" && res.data.tracks) {
          const colors = ["#8B5CF6", "#06B6D4", "#3B82F6", "#10B981", "#F59E0B", "#EC4899"];

          const uiTracks: EnvironmentTrack[] = res.data.tracks.map((t: BackendTrack, index: number) => {
            const lbl = t.label.toLowerCase();
            let iconName = "Activity"; // Default icon name

            // Auto-detect icon based on label
            if (lbl.includes("speech") || lbl.includes("voice") || lbl.includes("talk"))
              iconName = "MessageCircle";
            else if (lbl.includes("car") || lbl.includes("vehicle") || lbl.includes("engine"))
              iconName = "Car";
            else if (lbl.includes("rain") || lbl.includes("water")) 
              iconName = "CloudRain";
            else if (lbl.includes("wind")) 
              iconName = "Wind";
            else if (lbl.includes("music") || lbl.includes("song")) 
              iconName = "Music";
            else if (lbl.includes("bird") || lbl.includes("animal")) 
              iconName = "Bird";

            return {
              id: t.file,
              name: t.label,
              fileName: t.file,
              confidence: Math.round(t.confidence * 100),
              icon: iconName as any, // Store icon name, will be rendered in component
              color: colors[index % colors.length],
              dspEnabled: lbl.includes("speech"),
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

  const toggleDSP = (trackId: string) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, dspEnabled: !t.dspEnabled } : t)));
  };

  return { isLoading, tracks, toggleDSP };
}
