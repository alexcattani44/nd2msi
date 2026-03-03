"use client";

import React from "react";
import { SoundSourcePanel } from "@/components/organisms/SoundSourcePanel";
import { Button } from "@/components/atoms/Button";
import { useAudioEngine } from "@/hooks/useAudioEngine";

export default function Home() {
  const {
    soundSources,
    masterVolume,
    isPlaying,
    addSource,
    updateSource,
    deleteSource,
    changeMasterVolume,
    togglePlayback,
  } = useAudioEngine();

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
          <Button label="SAVE PROJECT" variant="secondary" />
          <Button label="LOAD PROJECT" variant="secondary" />
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
        />

        {/* Center: Routing Matrix (placeholder) */}
        <div className="bg-bg-primary border-x border-border-color p-4 flex flex-col items-center justify-center overflow-y-auto">
          <h2 className="font-display font-bold text-base uppercase tracking-widest text-accent-primary mb-4">
            Routing Matrix
          </h2>
          <p className="text-sm text-text-secondary text-center">
            Coming soon — connect modulators to sound source parameters here.
          </p>
        </div>

        {/* Right: Modulators (placeholder) */}
        <div className="bg-bg-secondary border border-border-color rounded-none p-4 flex flex-col items-center justify-center overflow-y-auto">
          <h2 className="font-display font-bold text-base uppercase tracking-widest text-accent-primary mb-4">
            Modulators
          </h2>
          <p className="text-sm text-text-secondary text-center">
            Coming soon — add LFOs and data-driven modulators here.
          </p>
        </div>
      </main>
    </div>
  );
}
