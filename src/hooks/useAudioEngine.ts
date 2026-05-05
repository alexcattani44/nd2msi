"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AudioEngine } from "@/audio/AudioEngine";
import type { SoundSource, Modulator, Route, ListenerParam } from "@/types/sound";
import { createSoundSource, createModulator, createRoute } from "@/types/sound";

/** Serializable project state for save/load */
export interface ProjectState {
  soundSources: SoundSource[];
  modulators: Modulator[];
  routes: Route[];
  masterVolume: number;
  listenerParams?: ListenerParam[];
}

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [soundSources, setSoundSources] = useState<SoundSource[]>([]);
  const [modulators, setModulators] = useState<Modulator[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [masterVolume, setMasterVolume] = useState(-12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListenerMode, setIsListenerMode] = useState(false);
  const [listenerParams, setListenerParams] = useState<ListenerParam[]>([]);

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

  /* ── Update mute/solo whenever sources change ── */
  useEffect(() => {
    if (!isPlaying || !engineRef.current) return;
    engineRef.current.updateMuteSolo(soundSources);
  }, [soundSources, isPlaying]);

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
      // When enabling filter, pass the full filter state so the engine can apply it
      if (updates.filterEnabled === true) {
        setSoundSources((prev) => {
          const source = prev.find((s) => s.id === id);
          const merged = {
            ...updates,
            filterFrequency: updates.filterFrequency ?? source?.filterFrequency ?? 1000,
            filterType: updates.filterType ?? source?.filterType ?? "lowpass" as const,
            filterQ: updates.filterQ ?? source?.filterQ ?? 1,
          };
          getEngine().updateSource(id, merged);
          return prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        });
      } else {
        setSoundSources((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        );
        getEngine().updateSource(id, updates);
      }
    },
    [getEngine],
  );

  /** Load an audio file into a sampler source. Returns the duration. */
  const loadAudioFile = useCallback(
    async (id: string, file: File) => {
      const engine = getEngine();
      const url = URL.createObjectURL(file);

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

  const changeSourceType = useCallback(
    (id: string, sourceType: SoundSource["sourceType"]) => {
      const engine = getEngine();
      const wasPlaying = isPlayingRef.current;

      engine.removeSource(id);

      setSoundSources((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, sourceType };
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
      setRoutes((prev) => prev.filter((r) => r.sourceId !== id));
      setListenerParams((prev) => prev.filter((p) => p.targetId !== id));
    },
    [getEngine],
  );

  /* ── note on (keyboard playing) ── */
  const noteOn = useCallback(
    (sourceId: string, frequency: number) => {
      getEngine().setSourceFrequency(sourceId, frequency);
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
      setRoutes((prev) => prev.filter((r) => r.modulatorId !== id));
      setListenerParams((prev) => prev.filter((p) => p.targetId !== id));
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

  /* ── listener mode ── */
  const toggleListenerMode = useCallback(() => {
    setIsListenerMode((prev) => !prev);
  }, []);

  const toggleListenerParam = useCallback(
    (targetId: string, parameter: string) => {
      setListenerParams((prev) => {
        const exists = prev.some(
          (p) => p.targetId === targetId && p.parameter === parameter,
        );
        if (exists) {
          return prev.filter(
            (p) => !(p.targetId === targetId && p.parameter === parameter),
          );
        }
        return [...prev, { targetId, parameter }];
      });
    },
    [],
  );

  const isListenerParam = useCallback(
    (targetId: string, parameter: string) => {
      return listenerParams.some(
        (p) => p.targetId === targetId && p.parameter === parameter,
      );
    },
    [listenerParams],
  );

  const hasAnyListenerParams = useCallback(
    (targetId: string) => {
      return listenerParams.some((p) => p.targetId === targetId);
    },
    [listenerParams],
  );

  /* ── save / load ── */
  const saveProject = useCallback((): ProjectState => {
    return {
      soundSources: soundSources.map((s) => ({ ...s, audioFileUrl: null })),
      modulators: [...modulators],
      routes: [...routes],
      masterVolume,
      listenerParams,
    };
  }, [soundSources, modulators, routes, masterVolume, listenerParams]);

  const loadProject = useCallback(
    (project: ProjectState) => {
      const engine = getEngine();

      // Stop and clean up
      engine.clearAllRoutes();
      engine.stopAll();
      for (const s of sourcesRef.current) {
        engine.removeSource(s.id);
      }
      for (const m of modulatorsRef.current) {
        engine.removeModulator(m.id);
      }

      setIsPlaying(false);

      // Restore state
      setMasterVolume(project.masterVolume);
      engine.setMasterVolume(project.masterVolume);

      setSoundSources(project.soundSources);
      setModulators(project.modulators);
      setRoutes(project.routes);
      setListenerParams(project.listenerParams ?? []);

      // Re-add to engine
      for (const source of project.soundSources) {
        engine.addSource(source);
      }
      for (const mod of project.modulators) {
        engine.addModulator(mod);
      }
    },
    [getEngine],
  );

  const exportProjectFile = useCallback(() => {
    const project = saveProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nd2msi-project.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [saveProject]);

  const importProjectFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const project = JSON.parse(text) as ProjectState;
      loadProject(project);
    },
    [loadProject],
  );

  return {
    soundSources,
    modulators,
    routes,
    masterVolume,
    isPlaying,
    isListenerMode,
    listenerParams,
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
    noteOn,
    saveProject,
    loadProject,
    exportProjectFile,
    importProjectFile,
    toggleListenerMode,
    toggleListenerParam,
    isListenerParam,
    hasAnyListenerParams,
  };
}
