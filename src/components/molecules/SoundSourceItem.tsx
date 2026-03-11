"use client";

import React, { useRef } from "react";
import { Slider } from "@/components/atoms/Slider";
import { Select } from "@/components/atoms/Select";
import { Button } from "@/components/atoms/Button";
import type { SoundSource, SourceType, LoopMode } from "@/types/sound";

const WAVEFORM_OPTIONS = [
  { label: "Sine", value: "sine" },
  { label: "Square", value: "square" },
  { label: "Sawtooth", value: "sawtooth" },
  { label: "Triangle", value: "triangle" },
];

const SOURCE_TYPE_OPTIONS = [
  { label: "Oscillator", value: "oscillator" },
  { label: "Sampler", value: "sampler" },
];

const LOOP_MODE_OPTIONS = [
  { label: "Off", value: "none" },
  { label: "Loop", value: "loop" },
  { label: "Ping-Pong", value: "pingpong" },
];

interface SoundSourceItemProps {
  source: SoundSource;
  onUpdate: (id: string, updates: Partial<SoundSource>) => void;
  onDelete: (id: string) => void;
  onChangeType: (id: string, type: SourceType) => void;
  onLoadFile: (id: string, file: File) => void;
}

export function SoundSourceItem({
  source,
  onUpdate,
  onDelete,
  onChangeType,
  onLoadFile,
}: SoundSourceItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(source.id, file);
    }
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

      {/* Source type selector */}
      <Select
        label="Source Type"
        value={source.sourceType}
        options={SOURCE_TYPE_OPTIONS}
        onChange={(v) => onChangeType(source.id, v as SourceType)}
      />

      {/* ── Oscillator controls ── */}
      {source.sourceType === "oscillator" && (
        <>
          <Select
            label="Waveform"
            value={source.waveform}
            options={WAVEFORM_OPTIONS}
            onChange={(v) => onUpdate(source.id, { waveform: v as SoundSource["waveform"] })}
          />
          <Slider
            label="Frequency"
            value={source.frequency}
            min={20}
            max={2000}
            step={1}
            formatValue={(v) => `${v.toFixed(1)} Hz`}
            onChange={(v) => onUpdate(source.id, { frequency: v })}
          />
        </>
      )}

      {/* ── Sampler controls ── */}
      {source.sourceType === "sampler" && (
        <>
          {/* File upload */}
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wider text-text-secondary">
              Audio File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 bg-bg-primary border border-border-color border-dashed rounded text-sm text-text-secondary hover:border-accent-primary hover:text-text-primary transition-all cursor-pointer text-left"
            >
              {source.audioFileName
                ? `${source.audioFileName}`
                : "Click to load audio file..."}
            </button>
          </div>

          {/* Sample region */}
          <Slider
            label="Start"
            value={source.sampleStart}
            min={0}
            max={1}
            step={0.001}
            formatValue={(v) => `${(v * 100).toFixed(1)}%`}
            onChange={(v) => onUpdate(source.id, { sampleStart: v })}
          />
          <Slider
            label="End"
            value={source.sampleEnd}
            min={0}
            max={1}
            step={0.001}
            formatValue={(v) => `${(v * 100).toFixed(1)}%`}
            onChange={(v) => onUpdate(source.id, { sampleEnd: v })}
          />

          {/* Loop mode */}
          <Select
            label="Loop Mode"
            value={source.loopMode}
            options={LOOP_MODE_OPTIONS}
            onChange={(v) => onUpdate(source.id, { loopMode: v as LoopMode })}
          />

          {/* Pitch shift */}
          <Slider
            label="Pitch Shift"
            value={source.pitchShift}
            min={-24}
            max={24}
            step={1}
            formatValue={(v) => `${v > 0 ? "+" : ""}${v} st`}
            onChange={(v) => onUpdate(source.id, { pitchShift: v })}
          />

          {/* Playback rate (time stretch) */}
          <Slider
            label="Speed"
            value={source.playbackRate}
            min={0.25}
            max={4}
            step={0.01}
            formatValue={(v) => `${v.toFixed(2)}x`}
            onChange={(v) => onUpdate(source.id, { playbackRate: v })}
          />
        </>
      )}

      {/* ── Shared controls ── */}
      <Slider
        label="Volume"
        value={source.volume}
        min={-60}
        max={0}
        step={0.1}
        formatValue={(v) => `${v.toFixed(1)} dB`}
        onChange={(v) => onUpdate(source.id, { volume: v })}
      />
      <Slider
        label="Pan"
        value={source.pan}
        min={-1}
        max={1}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
        onChange={(v) => onUpdate(source.id, { pan: v })}
      />
      <Slider
        label="Reverb"
        value={source.reverbMix}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(v) => onUpdate(source.id, { reverbMix: v })}
      />
      <Slider
        label="Delay"
        value={source.delayMix}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(v) => onUpdate(source.id, { delayMix: v })}
      />
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
