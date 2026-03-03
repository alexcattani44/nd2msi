"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AudioEngine } from "@/audio/AudioEngine";
import type { SoundSource } from "@/types/sound";
import { createSoundSource } from "@/types/sound";

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [soundSources, setSoundSources] = useState<SoundSource[]>([]);
  const [masterVolume, setMasterVolume] = useState(-12);
  const [isPlaying, setIsPlaying] = useState(false);

  // Lazily create the engine on the client (Tone.js requires `window`)
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine(masterVolume);
    }
    return engineRef.current;
  }, []); // masterVolume captured at creation; updated via setMasterVolume

  // Dispose engine on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  /* ── master volume ── */
  const changeMasterVolume = useCallback(
    (db: number) => {
      setMasterVolume(db);
      getEngine().setMasterVolume(db);
    },
    [getEngine],
  );

  // Track playing state in a ref so callbacks don't go stale
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  /* ── source CRUD ── */
  const addSource = useCallback(() => {
    setSoundSources((prev) => {
      const source = createSoundSource(prev.length);
      getEngine().addSource(source);
      // If we're already playing, start the new source immediately
      if (isPlayingRef.current) {
        getEngine().startSource(source);
      }
      return [...prev, source];
    });
  }, [getEngine]);

  const updateSource = useCallback(
    (id: string, updates: Partial<SoundSource>) => {
      setSoundSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      );
      getEngine().updateSource(id, updates);
    },
    [getEngine],
  );

  const deleteSource = useCallback(
    (id: string) => {
      getEngine().removeSource(id);
      setSoundSources((prev) => prev.filter((s) => s.id !== id));
    },
    [getEngine],
  );

  /* ── transport ── */
  const togglePlayback = useCallback(async () => {
    const engine = getEngine();
    if (!isPlaying) {
      // Read the latest sources from the ref-stable callback
      setSoundSources((current) => {
        engine.playAll(current);
        return current;
      });
      setIsPlaying(true);
    } else {
      engine.stopAll();
      setIsPlaying(false);
    }
  }, [getEngine, isPlaying]);

  return {
    soundSources,
    masterVolume,
    isPlaying,
    addSource,
    updateSource,
    deleteSource,
    changeMasterVolume,
    togglePlayback,
  };
}
