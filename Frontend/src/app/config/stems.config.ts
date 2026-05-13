/**
 * Stems Configuration
 * Cấu hình cho các stem tracks (vocals, bass, drums, other)
 */
import { Volume2, Music } from "lucide-react";
import type { StemTrack } from "../types/music.types";

export const STEMS_CONFIG: Omit<StemTrack, 'isPlaying' | 'ref' | 'prog' | 'setPlaying'>[] = [
  {
    id: "vocals",
    title: "Vocals",
    fileName: "vocals.mp3",
    icon: Volume2,
    colorFrom: "from-[#8B5CF6]",
    colorTo: "to-pink-500",
    waveColor: "#a78bfa",
    progressColor: "#4c1d95",
    waveMath: "sin"
  },
  {
    id: "bass",
    title: "Bass",
    fileName: "bass.mp3",
    icon: Music,
    colorFrom: "from-[#06B6D4]",
    colorTo: "to-cyan-500",
    waveColor: "#22d3ee",
    progressColor: "#164e63",
    waveMath: "cos"
  },
  {
    id: "drums",
    title: "Drums",
    fileName: "drums.mp3",
    icon: Music,
    colorFrom: "from-emerald-400",
    colorTo: "to-green-500",
    waveColor: "#4ade80",
    progressColor: "#14532d",
    waveMath: "cos"
  },
  {
    id: "other",
    title: "Other",
    fileName: "other.mp3",
    icon: Music,
    colorFrom: "from-orange-400",
    colorTo: "to-yellow-500",
    waveColor: "#fb923c",
    progressColor: "#7c2d12",
    waveMath: "cos"
  }
];
