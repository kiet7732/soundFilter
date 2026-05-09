//  Quản lý logic audio player cho tất cả tracks
import { useState, useRef, useCallback, useEffect } from "react";
import type { TrackId, PlayingState, ProgressState } from "../types/music.types";

export function useAudioPlayer() {
  // ─── States ───────────────────────────────────────────────────────────────
  const initialPlayState: PlayingState = {
    original: false,
    vocals: false,
    bass: false,
    drums: false,
    other: false,
    beat: false,
  };

  const [playing, setPlaying] = useState<PlayingState>(initialPlayState);
  const [progress, setProgress] = useState<ProgressState>({
    original: 0,
    vocals: 0,
    bass: 0,
    drums: 0,
    other: 0,
    beat: 0,
  });

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const originalRef = useRef<HTMLAudioElement | null>(null);
  const vocalsRef = useRef<HTMLAudioElement | null>(null);
  const bassRef = useRef<HTMLAudioElement | null>(null);
  const drumsRef = useRef<HTMLAudioElement | null>(null);
  const otherRef = useRef<HTMLAudioElement | null>(null);
  const beatRef = useRef<HTMLAudioElement | null>(null);

  const refMap = useRef<Record<TrackId, React.RefObject<HTMLAudioElement | null>>>({
    original: originalRef,
    vocals: vocalsRef,
    bass: bassRef,
    drums: drumsRef,
    other: otherRef,
    beat: beatRef,
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(
    (ref: React.RefObject<HTMLAudioElement | null>, key: TrackId) => {
      const el = ref.current;
      if (el && el.duration) {
        setProgress((prev) => ({ ...prev, [key]: (el.currentTime / el.duration) * 100 }));
      }
    },
    []
  );

  const pauseAllTracks = useCallback(() => {
    Object.values(refMap.current).forEach((ref) => {
      if (ref.current) {
        ref.current.pause();
      }
    });
    setPlaying(initialPlayState);
  }, []);

  const togglePlay = useCallback(
    (id: TrackId) => {
      const ref = refMap.current[id];
      const el = ref.current;
      if (!el) return;

      if (playing[id]) {
        el.pause();
        setPlaying((prev) => ({ ...prev, [id]: false }));
      } else {
        pauseAllTracks();
        el.currentTime = 0;
        el.play();
        setPlaying((prev) => ({ ...prev, [id]: true }));
      }
    },
    [playing, pauseAllTracks]
  );

  const handleEnded = useCallback((id: TrackId) => {
    setPlaying((prev) => ({ ...prev, [id]: false }));
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      pauseAllTracks();
    };
  }, [pauseAllTracks]);

  return {
    playing,
    progress,
    refMap,
    originalRef,
    vocalsRef,
    bassRef,
    drumsRef,
    otherRef,
    beatRef,
    togglePlay,
    handleTimeUpdate,
    handleEnded,
    pauseAllTracks,
  };
}
