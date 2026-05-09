// Định nghĩa tất cả types và interfaces cho MusicWorkspace

export interface LyricLine {
  segment_id: number;
  start: number;
  end: number;
  full_text: string;
  confidence: number;
  timestamp?: string;
  text?: string;
}

export type TrackId = "original" | "vocals" | "bass" | "drums" | "other" | "beat";

export type WaveMath = "sin" | "cos";

export interface StemTrack {
  id: string;
  title: string;
  fileName: string;
  icon: React.ElementType;
  colorFrom: string;
  colorTo: string;
  waveColor: string;
  progressColor: string;
  waveMath?: WaveMath;
  isPlaying?: boolean;
  ref?: React.RefObject<HTMLAudioElement | null>;
  prog?: number;
  setPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
}

export type VideoStatus = "idle" | "rendering" | "ready";

export interface PlayingState {
  original: boolean;
  vocals: boolean;
  bass: boolean;
  drums: boolean;
  other: boolean;
  beat: boolean;
}

export interface ProgressState {
  original: number;
  vocals: number;
  bass: number;
  drums: number;
  other: number;
  beat: number;
}
