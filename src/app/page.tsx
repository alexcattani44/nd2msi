"use client";

import React, { useRef, useEffect } from "react";
import { SoundSourcePanel } from "@/components/organisms/SoundSourcePanel";
import { RoutingMatrix } from "@/components/organisms/RoutingMatrix";
import { ModulatorPanel } from "@/components/organisms/ModulatorPanel";
import { Button } from "@/components/atoms/Button";
import { Toggle } from "@/components/atoms/Toggle";
import { useAudioEngine } from "@/hooks/useAudioEngine";

export default function Home() {
  const {
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
    exportProjectFile,
    importProjectFile,
    toggleListenerMode,
    toggleListenerParam,
    isListenerParam,
    hasAnyListenerParams,
  } = useAudioEngine();

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Escape key exits listener mode ── */
  useEffect(() => {
    if (!isListenerMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleListenerMode();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isListenerMode, toggleListenerMode]);

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

          <Toggle
            label="LISTENER"
            active={isListenerMode}
            activeColor="success"
            onChange={toggleListenerMode}
          />

          {!isListenerMode && (
            <>
              <Button label="SAVE PROJECT" variant="secondary" onClick={exportProjectFile} />
              <Button label="LOAD PROJECT" variant="secondary" onClick={handleLoadProject} />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          )}

          {isListenerMode && (
            <span className="text-xs text-text-secondary">
              ESC to exit
            </span>
          )}
        </div>
      </header>

      {/* ── Main 3-column layout ── */}
      <main className="flex-1 grid grid-cols-[300px_1fr_300px] gap-0 overflow-hidden">
        {/* Left: Sound Sources */}
        <SoundSourcePanel
          sources={soundSources}
          masterVolume={masterVolume}
          isListenerMode={isListenerMode}
          onAddSource={addSource}
          onUpdateSource={updateSource}
          onDeleteSource={deleteSource}
          onMasterVolumeChange={changeMasterVolume}
          onChangeSourceType={changeSourceType}
          onLoadAudioFile={loadAudioFile}
          onNoteOn={noteOn}
          isListenerParam={isListenerParam}
          onToggleListenerParam={toggleListenerParam}
          hasAnyListenerParams={hasAnyListenerParams}
        />

        {/* Center: Routing Matrix */}
        <div className="bg-bg-primary border-x border-border-color p-4 flex flex-col gap-4 overflow-y-auto">
          <RoutingMatrix
            routes={routes}
            soundSources={soundSources}
            modulators={modulators}
            isListenerMode={isListenerMode}
            onAddRoute={addRoute}
            onUpdateRoute={updateRoute}
            onDeleteRoute={deleteRoute}
            isListenerParam={isListenerParam}
            onToggleListenerParam={toggleListenerParam}
            hasAnyListenerParams={hasAnyListenerParams}
          />
        </div>

        {/* Right: Modulators */}
        <ModulatorPanel
          modulators={modulators}
          isListenerMode={isListenerMode}
          onAddModulator={addModulator}
          onUpdateModulator={updateModulator}
          onDeleteModulator={deleteModulator}
          isListenerParam={isListenerParam}
          onToggleListenerParam={toggleListenerParam}
          hasAnyListenerParams={hasAnyListenerParams}
        />
      </main>
    </div>
  );
}
