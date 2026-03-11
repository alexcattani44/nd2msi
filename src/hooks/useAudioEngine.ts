"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AudioEngine } from "@/audio/AudioEngine";
import type { SoundSource, Modulator, Route } from "@/types/sound";
import { createSoundSource, createModulator, createRoute } from "@/types/sound";

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [soundSources, setSoundSources] = useState<SoundSource[]>([]);
  const [modulators, setModulators] = useState<Modulator[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [masterVolume, setMasterVolume] = useState(-12);
  const [isPlaying, setIsPlaying] = useState(false);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine(masterVolume);
    }
    return engineRef.current;
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Mutable refs for values accessed inside callbacks
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const sourcesRef = useRef(soundSources);
  sourcesRef.current = soundSources;
  const modulatorsRef = useRef(modulators);
  modulatorsRef.current = modulators;

  /* ── Initialize MIDI when an envelope modulator exists ── */
  const midiInitRef = useRef(false);
  useEffect(() => {
    const hasEnvelope = modulators.some((m) => m.type === "envelope");
    if (hasEnvelope && !midiInitRef.current) {
      midiInitRef.current = true;
      getEngine().initMidi().then((ok) => {
        if (!ok) {
          console.warn("Web MIDI API not available. Envelope modulators will not respond to MIDI input.");
        }
      });
    }
  }, [modulators, getEngine]);

  /* ── Re-apply modulation whenever routes/modulators/playing change. ── */
  useEffect(() => {
    if (!isPlaying || !engineRef.current) return;
    engineRef.current.applyRoutes(routes, modulators, soundSources);
    return () => {
      engineRef.current?.clearAllRoutes();
    };
  }, [routes, modulators, isPlaying, soundSources]);

  /* ── master volume ── */
  const changeMasterVolume = useCallback(
    (db: number) => {
      setMasterVolume(db);
      getEngine().setMasterVolume(db);
    },
    [getEngine],
  );

  /* ── source CRUD ── */
  const addSource = useCallback(() => {
    setSoundSources((prev) => {
      const source = createSoundSource(prev.length);
      getEngine().addSource(source);
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

  /** Load an audio file into a sampler source. Returns the duration. */
  const loadAudioFile = useCallback(
    async (id: string, file: File) => {
      const engine = getEngine();
      const url = URL.createObjectURL(file);

      // Ensure the source exists in the engine
      const source = sourcesRef.current.find((s) => s.id === id);
      if (source && !engine["sources"].has(id)) {
        engine.addSource(source);
      }

      const duration = await engine.loadSampleBuffer(id, url);
      URL.revokeObjectURL(url);

      setSoundSources((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, audioFileName: file.name, audioFileUrl: url, sampleEnd: 1 }
            : s,
        ),
      );

      return duration;
    },
    [getEngine],
  );

  /**
   * Switch a source between oscillator and sampler mode.
   * Tears down the old engine nodes and rebuilds for the new type.
   */
  const changeSourceType = useCallback(
    (id: string, sourceType: SoundSource["sourceType"]) => {
      const engine = getEngine();
      const wasPlaying = isPlayingRef.current;

      // Remove old engine nodes
      engine.removeSource(id);

      // Update state
      setSoundSources((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, sourceType };
          // Re-add with new type
          engine.addSource(updated);
          if (wasPlaying && updated.sourceType === "oscillator") {
            engine.startSource(updated);
          }
          return updated;
        }),
      );
    },
    [getEngine],
  );

  const deleteSource = useCallback(
    (id: string) => {
      getEngine().removeSource(id);
      setSoundSources((prev) => prev.filter((s) => s.id !== id));
      // Cascade: remove routes referencing this source
      setRoutes((prev) => prev.filter((r) => r.sourceId !== id));
    },
    [getEngine],
  );

  /* ── modulator CRUD ── */
  const addModulator = useCallback(() => {
    setModulators((prev) => {
      const mod = createModulator(prev.length);
      getEngine().addModulator(mod);
      return [...prev, mod];
    });
  }, [getEngine]);

  const updateModulator = useCallback(
    (id: string, updates: Partial<Modulator>) => {
      setModulators((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      );
      getEngine().updateModulator(id, updates);
    },
    [getEngine],
  );

  const deleteModulator = useCallback(
    (id: string) => {
      getEngine().removeModulator(id);
      setModulators((prev) => prev.filter((m) => m.id !== id));
      // Cascade: remove routes referencing this modulator
      setRoutes((prev) => prev.filter((r) => r.modulatorId !== id));
    },
    [getEngine],
  );

  /* ── route CRUD ── */
  const addRoute = useCallback(() => {
    const srcs = sourcesRef.current;
    const mods = modulatorsRef.current;
    if (srcs.length === 0 || mods.length === 0) return;
    const route = createRoute(srcs[0].id, mods[0].id);
    setRoutes((prev) => [...prev, route]);
  }, []);

  const updateRoute = useCallback(
    (id: string, updates: Partial<Route>) => {
      setRoutes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    },
    [],
  );

  const deleteRoute = useCallback(
    (id: string) => {
      getEngine().removeRoute(id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    },
    [getEngine],
  );

  /* ── transport ── */
  const togglePlayback = useCallback(async () => {
    const engine = getEngine();
    if (!isPlaying) {
      setSoundSources((current) => {
        engine.playAll(current);
        return current;
      });
      setIsPlaying(true);
    } else {
      engine.clearAllRoutes();
      engine.stopAll();
      setIsPlaying(false);
    }
  }, [getEngine, isPlaying]);

  return {
    soundSources,
    modulators,
    routes,
    masterVolume,
    isPlaying,
    addSource,
    updateSource,
    deleteSource,
    addModulator,
    updateModulator,
    deleteModulator,
    addRoute,
    updateRoute,
    deleteRoute,
    changeMasterVolume,
    togglePlayback,
    loadAudioFile,
    changeSourceType,
  };
}
