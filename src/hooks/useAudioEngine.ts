"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AudioEngine } from "@/audio/AudioEngine";
import type { SoundSource, Modulator, Route, ListenerModeConfig, ListenerParameter, ListenerColorTheme } from "@/types/sound";
import { createSoundSource, createModulator, createRoute, createDefaultListenerConfig, createListenerParameter } from "@/types/sound";

/** Serializable project state for save/load */
export interface ProjectState {
  soundSources: SoundSource[];
  modulators: Modulator[];
  routes: Route[];
  masterVolume: number;
  listenerConfig?: ListenerModeConfig;
}

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [soundSources, setSoundSources] = useState<SoundSource[]>([]);
  const [modulators, setModulators] = useState<Modulator[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [masterVolume, setMasterVolume] = useState(-12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [listenerConfig, setListenerConfig] = useState<ListenerModeConfig>(createDefaultListenerConfig());
  /** Snapshot of state when listener mode was entered, for reset */
  const listenerSnapshotRef = useRef<ProjectState | null>(null);

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
  const enterListenerMode = useCallback(() => {
    // Snapshot current state for reset
    listenerSnapshotRef.current = {
      soundSources: soundSources.map((s) => ({ ...s })),
      modulators: modulators.map((m) => ({ ...m })),
      routes: routes.map((r) => ({ ...r })),
      masterVolume,
    };
    setListenerConfig((prev) => ({ ...prev, enabled: true }));
  }, [soundSources, modulators, routes, masterVolume]);

  const exitListenerMode = useCallback(() => {
    setListenerConfig((prev) => ({ ...prev, enabled: false, fullscreen: false }));
    listenerSnapshotRef.current = null;
  }, []);

  const toggleListenerFullscreen = useCallback(() => {
    setListenerConfig((prev) => ({ ...prev, fullscreen: !prev.fullscreen }));
  }, []);

  const toggleListenerHelp = useCallback(() => {
    setListenerConfig((prev) => ({ ...prev, showHelp: !prev.showHelp }));
  }, []);

  const setListenerTheme = useCallback((colorTheme: ListenerColorTheme) => {
    setListenerConfig((prev) => ({ ...prev, colorTheme }));
  }, []);

  const addListenerParameter = useCallback(
    (targetId: string, targetType: "source" | "modulator", parameter: string, label: string) => {
      const param = createListenerParameter(targetId, targetType, parameter, label);
      setListenerConfig((prev) => ({
        ...prev,
        parameters: [...prev.parameters, param],
      }));
    },
    [],
  );

  const updateListenerParameter = useCallback(
    (id: string, updates: Partial<ListenerParameter>) => {
      setListenerConfig((prev) => ({
        ...prev,
        parameters: prev.parameters.map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        ),
      }));
    },
    [],
  );

  const deleteListenerParameter = useCallback((id: string) => {
    setListenerConfig((prev) => ({
      ...prev,
      parameters: prev.parameters.filter((p) => p.id !== id),
    }));
  }, []);

  const resetListenerState = useCallback(() => {
    if (!listenerSnapshotRef.current) return;
    const snapshot = listenerSnapshotRef.current;
    const engine = getEngine();

    // Stop playback
    engine.clearAllRoutes();
    engine.stopAll();
    setIsPlaying(false);

    // Restore sources
    for (const s of sourcesRef.current) engine.removeSource(s.id);
    for (const m of modulatorsRef.current) engine.removeModulator(m.id);

    setSoundSources(snapshot.soundSources.map((s) => ({ ...s })));
    setModulators(snapshot.modulators.map((m) => ({ ...m })));
    setRoutes(snapshot.routes.map((r) => ({ ...r })));
    setMasterVolume(snapshot.masterVolume);
    engine.setMasterVolume(snapshot.masterVolume);

    for (const source of snapshot.soundSources) engine.addSource(source);
    for (const mod of snapshot.modulators) engine.addModulator(mod);
  }, [getEngine]);

  /* ── save / load ── */
  const saveProject = useCallback((): ProjectState => {
    return {
      soundSources: soundSources.map((s) => ({ ...s, audioFileUrl: null })),
      modulators: [...modulators],
      routes: [...routes],
      masterVolume,
      listenerConfig,
    };
  }, [soundSources, modulators, routes, masterVolume, listenerConfig]);

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
      if (project.listenerConfig) {
        setListenerConfig(project.listenerConfig);
      }

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
    listenerConfig,
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
    enterListenerMode,
    exitListenerMode,
    toggleListenerFullscreen,
    toggleListenerHelp,
    setListenerTheme,
    addListenerParameter,
    updateListenerParameter,
    deleteListenerParameter,
    resetListenerState,
  };
}
