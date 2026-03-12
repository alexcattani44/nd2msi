"use client";

import React from "react";
import { Button } from "@/components/atoms/Button";
import { Slider } from "@/components/atoms/Slider";
import { SoundSourceItem } from "@/components/molecules/SoundSourceItem";
import type { SoundSource, SourceType } from "@/types/sound";

interface SoundSourcePanelProps {
  sources: SoundSource[];
  masterVolume: number;
  onAddSource: () => void;
  onUpdateSource: (id: string, updates: Partial<SoundSource>) => void;
  onDeleteSource: (id: string) => void;
  onMasterVolumeChange: (value: number) => void;
  onChangeSourceType: (id: string, type: SourceType) => void;
  onLoadAudioFile: (id: string, file: File) => void;
  onNoteOn?: (sourceId: string, frequency: number) => void;
}

export function SoundSourcePanel({
  sources,
  masterVolume,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onMasterVolumeChange,
  onChangeSourceType,
  onLoadAudioFile,
  onNoteOn,
}: SoundSourcePanelProps) {
  return (
    <div className="bg-bg-secondary border border-border-color rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 className="font-display font-bold text-base uppercase tracking-widest text-accent-primary border-b border-border-color pb-2">
        Sound Sources
      </h2>

      <Button
        label="+ Add Sound Source"
        variant="secondary"
        fullWidth
        dashed
        onClick={onAddSource}
      />

      {sources.length === 0 ? (
        <p className="text-center text-sm text-text-secondary py-8">
          No sound sources yet. Click above to add one.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map((source) => (
            <SoundSourceItem
              key={source.id}
              source={source}
              onUpdate={onUpdateSource}
              onDelete={onDeleteSource}
              onChangeType={onChangeSourceType}
              onLoadFile={onLoadAudioFile}
              onNoteOn={onNoteOn}
            />
          ))}
        </div>
      )}

      {/* Master Volume - always visible at the bottom */}
      <div className="mt-auto pt-4 border-t border-border-color">
        <Slider
          label="Master Volume"
          value={masterVolume}
          min={-60}
          max={0}
          step={0.1}
          formatValue={(v) => `${v.toFixed(1)} dB`}
          onChange={onMasterVolumeChange}
        />
      </div>
    </div>
  );
}
