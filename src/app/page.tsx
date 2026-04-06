"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { SoundSourcePanel } from "@/components/organisms/SoundSourcePanel";
import { RoutingMatrix } from "@/components/organisms/RoutingMatrix";
import { ModulatorPanel } from "@/components/organisms/ModulatorPanel";
import { ListenerMode } from "@/components/organisms/ListenerMode";
import { ListenerSetupPanel } from "@/components/organisms/ListenerSetupPanel";
import { Button } from "@/components/atoms/Button";
import { useAudioEngine } from "@/hooks/useAudioEngine";

export default function Home() {
  const {
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
  } = useAudioEngine();

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Fullscreen API integration ── */
  const handleToggleFullscreen = useCallback(() => {
    toggleListenerFullscreen();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [toggleListenerFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && listenerConfig.fullscreen) {
        toggleListenerFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [listenerConfig.fullscreen, toggleListenerFullscreen]);

  const handleLoadProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importProjectFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Listener Mode overlay ── */
  if (listenerConfig.enabled) {
    return (
      <ListenerMode
        config={listenerConfig}
        soundSources={soundSources}
        modulators={modulators}
        isPlaying={isPlaying}
        masterVolume={masterVolume}
        onTogglePlayback={togglePlayback}
        onUpdateSource={updateSource}
        onUpdateModulator={updateModulator}
        onChangeMasterVolume={changeMasterVolume}
        onExit={() => {
          if (document.fullscreenElement) document.exitFullscreen?.();
          exitListenerMode();
        }}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleHelp={toggleListenerHelp}
        onSetTheme={setListenerTheme}
        onAddParameter={addListenerParameter}
        onUpdateParameter={updateListenerParameter}
        onDeleteParameter={deleteListenerParameter}
        onReset={resetListenerState}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ── */}
      <header className="bg-bg-primary border-b-2 border-accent-primary px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="font-display font-extrabold text-2xl tracking-wider text-accent-primary">
          ND2MSI
        </h1>

        <div className="flex items-center gap-3">
          {/* Status LED */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold ${
              isPlaying
                ? "bg-success/20 text-success"
                : "bg-text-secondary/20 text-text-secondary"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full bg-current ${isPlaying ? "animate-pulse" : ""}`}
            />
            {isPlaying ? "PLAYING" : "STOPPED"}
          </div>

          <Button
            label={isPlaying ? "STOP" : "PLAY"}
            variant="primary"
            onClick={togglePlayback}
          />
          <Button label="LISTENER MODE" variant="secondary" onClick={enterListenerMode} />
          <Button label="SAVE PROJECT" variant="secondary" onClick={exportProjectFile} />
          <Button label="LOAD PROJECT" variant="secondary" onClick={handleLoadProject} />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </header>

      {/* ── Main 3-column layout ── */}
      <main className="flex-1 grid grid-cols-[300px_1fr_300px] gap-0 overflow-hidden">
        {/* Left: Sound Sources */}
        <SoundSourcePanel
          sources={soundSources}
          masterVolume={masterVolume}
          onAddSource={addSource}
          onUpdateSource={updateSource}
          onDeleteSource={deleteSource}
          onMasterVolumeChange={changeMasterVolume}
          onChangeSourceType={changeSourceType}
          onLoadAudioFile={loadAudioFile}
          onNoteOn={noteOn}
        />

        {/* Center: Routing Matrix + Listener Setup */}
        <div className="bg-bg-primary border-x border-border-color p-4 flex flex-col gap-4 overflow-y-auto">
          <RoutingMatrix
            routes={routes}
            soundSources={soundSources}
            modulators={modulators}
            onAddRoute={addRoute}
            onUpdateRoute={updateRoute}
            onDeleteRoute={deleteRoute}
          />

          {/* Listener Mode Setup */}
          <ListenerSetupPanel
            config={listenerConfig}
            soundSources={soundSources}
            modulators={modulators}
            onAddParameter={addListenerParameter}
            onUpdateParameter={updateListenerParameter}
            onDeleteParameter={deleteListenerParameter}
            onEnterListenerMode={enterListenerMode}
          />
        </div>

        {/* Right: Modulators */}
        <ModulatorPanel
          modulators={modulators}
          onAddModulator={addModulator}
          onUpdateModulator={updateModulator}
          onDeleteModulator={deleteModulator}
        />
      </main>
    </div>
  );
}
