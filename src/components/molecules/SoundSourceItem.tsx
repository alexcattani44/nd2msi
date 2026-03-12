"use client";

import React, { useRef, useState, useCallback } from "react";
import { Slider } from "@/components/atoms/Slider";
import { Select } from "@/components/atoms/Select";
import { Button } from "@/components/atoms/Button";
import { Toggle } from "@/components/atoms/Toggle";
import type { SoundSource, SourceType, LoopMode, FilterType } from "@/types/sound";
import { midiNoteToName, midiNoteToFrequency, KEYBOARD_NOTE_MAP } from "@/audio/AudioEngine";

const WAVEFORM_OPTIONS = [
  { label: "Sine", value: "sine" },
  { label: "Square", value: "square" },
  { label: "Sawtooth", value: "sawtooth" },
  { label: "Triangle", value: "triangle" },
  { label: "Custom", value: "custom" },
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

const FILTER_TYPE_OPTIONS = [
  { label: "Low Pass", value: "lowpass" },
  { label: "High Pass", value: "highpass" },
  { label: "Band Pass", value: "bandpass" },
  { label: "Notch", value: "notch" },
];

interface SoundSourceItemProps {
  source: SoundSource;
  onUpdate: (id: string, updates: Partial<SoundSource>) => void;
  onDelete: (id: string) => void;
  onChangeType: (id: string, type: SourceType) => void;
  onLoadFile: (id: string, file: File) => void;
  onNoteOn?: (sourceId: string, frequency: number) => void;
}

export function SoundSourceItem({
  source,
  onUpdate,
  onDelete,
  onChangeType,
  onLoadFile,
  onNoteOn,
}: SoundSourceItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const heldKeysRef = useRef<Set<string>>(new Set());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(source.id, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!keyboardEnabled || source.sourceType !== "oscillator") return;
    const key = e.key.toLowerCase();
    if (heldKeysRef.current.has(key)) return;
    const midiNote = KEYBOARD_NOTE_MAP[key];
    if (midiNote !== undefined) {
      e.preventDefault();
      heldKeysRef.current.add(key);
      const freq = midiNoteToFrequency(midiNote);
      setActiveNote(midiNoteToName(midiNote));
      onUpdate(source.id, { frequency: freq });
      onNoteOn?.(source.id, freq);
    }
  }, [keyboardEnabled, source.sourceType, source.id, onUpdate, onNoteOn]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    const key = e.key.toLowerCase();
    heldKeysRef.current.delete(key);
    if (heldKeysRef.current.size === 0) {
      setActiveNote(null);
    }
  }, []);

  const handlePartialsChange = (index: number, value: number) => {
    const newPartials = [...source.customPartials];
    newPartials[index] = value;
    onUpdate(source.id, { customPartials: newPartials });
  };

  const addPartial = () => {
    onUpdate(source.id, { customPartials: [...source.customPartials, 0] });
  };

  const removePartial = () => {
    if (source.customPartials.length > 1) {
      onUpdate(source.id, { customPartials: source.customPartials.slice(0, -1) });
    }
  };

  return (
    <div
      className="bg-bg-tertiary border border-border-color rounded-md p-3 flex flex-col gap-3"
      tabIndex={keyboardEnabled ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {/* Header: name + mute/solo + delete */}
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-sm text-accent-primary tracking-wide">
          {source.name}
        </span>
        <div className="flex items-center gap-1">
          <Toggle
            label="M"
            active={source.muted}
            size="sm"
            activeColor="danger"
            onChange={(v) => onUpdate(source.id, { muted: v })}
          />
          <Toggle
            label="S"
            active={source.solo}
            size="sm"
            activeColor="warning"
            onChange={(v) => onUpdate(source.id, { solo: v })}
          />
          <Button
            label="DELETE"
            variant="danger"
            size="sm"
            onClick={() => onDelete(source.id)}
          />
        </div>
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

          {/* Custom waveform partials editor */}
          {source.waveform === "custom" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wider text-text-secondary">
                Partials (Harmonics)
              </label>
              {source.customPartials.map((val, i) => (
                <Slider
                  key={i}
                  label={`H${i + 1}`}
                  value={val}
                  min={0}
                  max={1}
                  step={0.01}
                  formatValue={(v) => v.toFixed(2)}
                  onChange={(v) => handlePartialsChange(i, v)}
                />
              ))}
              <div className="flex gap-1">
                <Button label="+ Partial" variant="secondary" size="sm" onClick={addPartial} />
                {source.customPartials.length > 1 && (
                  <Button label="- Partial" variant="secondary" size="sm" onClick={removePartial} />
                )}
              </div>
            </div>
          )}

          <Slider
            label="Frequency"
            value={source.frequency}
            min={20}
            max={2000}
            step={1}
            formatValue={(v) => `${v.toFixed(1)} Hz`}
            onChange={(v) => onUpdate(source.id, { frequency: v })}
          />

          {/* Keyboard input toggle */}
          <div className="flex items-center gap-2">
            <Toggle
              label="KEYBOARD"
              active={keyboardEnabled}
              size="sm"
              activeColor="success"
              onChange={setKeyboardEnabled}
            />
            {activeNote && (
              <span className="text-xs font-mono text-accent-tertiary bg-bg-primary px-2 py-0.5 rounded">
                {activeNote}
              </span>
            )}
          </div>
          {keyboardEnabled && (
            <div className="text-xs text-text-secondary bg-bg-primary rounded p-2">
              Click this panel and use Z-M (lower), Q-P (upper) keys to play notes
            </div>
          )}
        </>
      )}

      {/* ── Sampler controls ── */}
      {source.sourceType === "sampler" && (
        <>
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

          <Select
            label="Loop Mode"
            value={source.loopMode}
            options={LOOP_MODE_OPTIONS}
            onChange={(v) => onUpdate(source.id, { loopMode: v as LoopMode })}
          />

          <Slider
            label="Pitch Shift"
            value={source.pitchShift}
            min={-24}
            max={24}
            step={1}
            formatValue={(v) => `${v > 0 ? "+" : ""}${v} st`}
            onChange={(v) => onUpdate(source.id, { pitchShift: v })}
          />

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

      {/* ── Filter controls ── */}
      <div className="border-t border-border-color pt-2 mt-1">
        <Toggle
          label="FILTER"
          active={source.filterEnabled}
          size="sm"
          activeColor="accent"
          onChange={(v) => onUpdate(source.id, { filterEnabled: v })}
        />
        {source.filterEnabled && (
          <div className="flex flex-col gap-2 mt-2">
            <Select
              label="Filter Type"
              value={source.filterType}
              options={FILTER_TYPE_OPTIONS}
              onChange={(v) => onUpdate(source.id, { filterType: v as FilterType })}
            />
            <Slider
              label="Cutoff"
              value={source.filterFrequency}
              min={20}
              max={20000}
              step={1}
              formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${v.toFixed(0)} Hz`}
              onChange={(v) => onUpdate(source.id, { filterFrequency: v })}
            />
            <Slider
              label="Resonance"
              value={source.filterQ}
              min={0.1}
              max={20}
              step={0.1}
              formatValue={(v) => v.toFixed(1)}
              onChange={(v) => onUpdate(source.id, { filterQ: v })}
            />
          </div>
        )}
      </div>

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
