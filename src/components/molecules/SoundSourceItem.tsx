"use client";

import React from "react";
import { Slider } from "@/components/atoms/Slider";
import { Select } from "@/components/atoms/Select";
import { Button } from "@/components/atoms/Button";
import type { SoundSource } from "@/types/sound";

const WAVEFORM_OPTIONS = [
  { label: "Sine", value: "sine" },
  { label: "Square", value: "square" },
  { label: "Sawtooth", value: "sawtooth" },
  { label: "Triangle", value: "triangle" },
];

interface SoundSourceItemProps {
  source: SoundSource;
  onUpdate: (id: string, updates: Partial<SoundSource>) => void;
  onDelete: (id: string) => void;
}

export function SoundSourceItem({
  source,
  onUpdate,
  onDelete,
}: SoundSourceItemProps) {
  return (
    <div className="bg-bg-tertiary border border-border-color rounded-md p-3 flex flex-col gap-3">
      {/* Header: name + delete */}
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-sm text-accent-primary tracking-wide">
          {source.name}
        </span>
        <Button
          label="DELETE"
          variant="danger"
          size="sm"
          onClick={() => onDelete(source.id)}
        />
      </div>

      {/* Waveform selector */}
      <Select
        label="Waveform"
        value={source.waveform}
        options={WAVEFORM_OPTIONS}
        onChange={(v) => onUpdate(source.id, { waveform: v as SoundSource["waveform"] })}
      />

      {/* Frequency */}
      <Slider
        label="Frequency"
        value={source.frequency}
        min={20}
        max={2000}
        step={1}
        formatValue={(v) => `${v.toFixed(1)} Hz`}
        onChange={(v) => onUpdate(source.id, { frequency: v })}
      />

      {/* Volume */}
      <Slider
        label="Volume"
        value={source.volume}
        min={-60}
        max={0}
        step={0.1}
        formatValue={(v) => `${v.toFixed(1)} dB`}
        onChange={(v) => onUpdate(source.id, { volume: v })}
      />

      {/* Pan */}
      <Slider
        label="Pan"
        value={source.pan}
        min={-1}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => onUpdate(source.id, { pan: v })}
      />

      {/* Reverb */}
      <Slider
        label="Reverb"
        value={source.reverbMix}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(v) => onUpdate(source.id, { reverbMix: v })}
      />

      {/* Delay Mix */}
      <Slider
        label="Delay"
        value={source.delayMix}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(v) => onUpdate(source.id, { delayMix: v })}
      />

      {/* Delay Time */}
      <Slider
        label="Delay Time"
        value={source.delayTime}
        min={0.01}
        max={2}
        step={0.01}
        formatValue={(v) => `${v.toFixed(2)}s`}
        onChange={(v) => onUpdate(source.id, { delayTime: v })}
      />
    </div>
  );
}
