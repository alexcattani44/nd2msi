"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/atoms/Button";
import { Slider } from "@/components/atoms/Slider";
import { Select } from "@/components/atoms/Select";
import { Toggle } from "@/components/atoms/Toggle";
import { XYPad } from "@/components/atoms/XYPad";
import type {
  SoundSource,
  Modulator,
  ListenerModeConfig,
  ListenerParameter,
  ListenerControlType,
  InteractionMode,
  ListenerColorTheme,
} from "@/types/sound";

/* ── Theme definitions ── */
const THEME_COLORS: Record<ListenerColorTheme, { bg: string; surface: string; text: string; accent: string; muted: string; border: string }> = {
  dark: { bg: "bg-[#0a0a0f]", surface: "bg-[#16161d]", text: "text-[#e4e4ec]", accent: "text-[#a78bfa]", muted: "text-[#6b6b80]", border: "border-[#2a2a3a]" },
  light: { bg: "bg-[#f5f5f0]", surface: "bg-[#ffffff]", text: "text-[#1a1a2e]", accent: "text-[#6d28d9]", muted: "text-[#9ca3af]", border: "border-[#d1d5db]" },
  neon: { bg: "bg-[#0d0d0d]", surface: "bg-[#1a1a1a]", text: "text-[#00ff88]", accent: "text-[#ff00ff]", muted: "text-[#00ff8866]", border: "border-[#00ff8833]" },
  warm: { bg: "bg-[#1c1410]", surface: "bg-[#2a1f18]", text: "text-[#f5deb3]", accent: "text-[#ff8c42]", muted: "text-[#8b7355]", border: "border-[#4a3728]" },
};

const THEME_OPTIONS = [
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "Neon", value: "neon" },
  { label: "Warm", value: "warm" },
];

const CONTROL_TYPE_OPTIONS = [
  { label: "Slider", value: "slider" },
  { label: "Button", value: "button" },
  { label: "XY Pad", value: "xypad" },
  { label: "Dropdown", value: "dropdown" },
  { label: "Toggle", value: "toggle" },
];

const INTERACTION_MODE_OPTIONS = [
  { label: "Manual", value: "manual" },
  { label: "Automatic", value: "automatic" },
  { label: "Hybrid", value: "hybrid" },
];

/* ── Parameter ranges for controls ── */
function getParamRange(parameter: string): { min: number; max: number; step: number; format: (v: number) => string } {
  switch (parameter) {
    case "frequency": return { min: 20, max: 2000, step: 1, format: (v) => `${v.toFixed(0)} Hz` };
    case "volume": return { min: -60, max: 0, step: 0.1, format: (v) => `${v.toFixed(1)} dB` };
    case "pan": return { min: -1, max: 1, step: 0.01, format: (v) => v.toFixed(2) };
    case "reverbMix": case "delayMix": return { min: 0, max: 1, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` };
    case "delayTime": return { min: 0.01, max: 2, step: 0.01, format: (v) => `${v.toFixed(2)}s` };
    case "filterFrequency": return { min: 20, max: 20000, step: 1, format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${v.toFixed(0)} Hz` };
    case "filterQ": return { min: 0.1, max: 20, step: 0.1, format: (v) => v.toFixed(1) };
    case "playbackRate": return { min: 0.25, max: 4, step: 0.01, format: (v) => `${v.toFixed(2)}x` };
    case "pitchShift": return { min: -24, max: 24, step: 1, format: (v) => `${v > 0 ? "+" : ""}${v} st` };
    case "rate": return { min: 0.01, max: 20, step: 0.01, format: (v) => `${v.toFixed(2)} Hz` };
    case "depth": return { min: 0, max: 1, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` };
    case "dataRate": return { min: 5, max: 2000, step: 1, format: (v) => `${v.toFixed(0)} ms` };
    case "dataSmoothing": return { min: 0, max: 1, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` };
    case "attack": case "decay": case "release": return { min: 0.001, max: 5, step: 0.001, format: (v) => v < 1 ? `${(v * 1000).toFixed(0)} ms` : `${v.toFixed(2)} s` };
    case "sustain": return { min: 0, max: 1, step: 0.01, format: (v) => `${(v * 100).toFixed(0)}%` };
    default: return { min: 0, max: 1, step: 0.01, format: (v) => v.toFixed(2) };
  }
}

function getParamValue(
  param: ListenerParameter,
  sources: SoundSource[],
  modulators: Modulator[],
): number {
  if (param.targetType === "source") {
    const s = sources.find((s) => s.id === param.targetId);
    if (!s) return 0;
    const val = (s as unknown as Record<string, number>)[param.parameter];
    return typeof val === "number" ? val : 0;
  }
  const m = modulators.find((m) => m.id === param.targetId);
  if (!m) return 0;
  const val = (m as unknown as Record<string, number>)[param.parameter];
  return typeof val === "number" ? val : 0;
}

/* ── Available parameters for source/modulator ── */
const SOURCE_PARAMS = [
  { label: "Frequency", value: "frequency" },
  { label: "Volume", value: "volume" },
  { label: "Pan", value: "pan" },
  { label: "Reverb Mix", value: "reverbMix" },
  { label: "Delay Mix", value: "delayMix" },
  { label: "Delay Time", value: "delayTime" },
  { label: "Filter Freq", value: "filterFrequency" },
  { label: "Filter Q", value: "filterQ" },
  { label: "Playback Rate", value: "playbackRate" },
  { label: "Pitch Shift", value: "pitchShift" },
];

const MODULATOR_PARAMS = [
  { label: "Rate", value: "rate" },
  { label: "Depth", value: "depth" },
  { label: "Data Rate", value: "dataRate" },
  { label: "Smoothing", value: "dataSmoothing" },
  { label: "Attack", value: "attack" },
  { label: "Decay", value: "decay" },
  { label: "Sustain", value: "sustain" },
  { label: "Release", value: "release" },
];

/* ── Props ── */
interface ListenerModeProps {
  config: ListenerModeConfig;
  soundSources: SoundSource[];
  modulators: Modulator[];
  isPlaying: boolean;
  masterVolume: number;
  onTogglePlayback: () => void;
  onUpdateSource: (id: string, updates: Partial<SoundSource>) => void;
  onUpdateModulator: (id: string, updates: Partial<Modulator>) => void;
  onChangeMasterVolume: (db: number) => void;
  onExit: () => void;
  onToggleFullscreen: () => void;
  onToggleHelp: () => void;
  onSetTheme: (theme: ListenerColorTheme) => void;
  onAddParameter: (targetId: string, targetType: "source" | "modulator", parameter: string, label: string) => void;
  onUpdateParameter: (id: string, updates: Partial<ListenerParameter>) => void;
  onDeleteParameter: (id: string) => void;
  onReset: () => void;
}

export function ListenerMode({
  config,
  soundSources,
  modulators,
  isPlaying,
  masterVolume,
  onTogglePlayback,
  onUpdateSource,
  onUpdateModulator,
  onChangeMasterVolume,
  onExit,
  onToggleFullscreen,
  onToggleHelp,
  onSetTheme,
  onAddParameter,
  onUpdateParameter,
  onDeleteParameter,
  onReset,
}: ListenerModeProps) {
  const theme = THEME_COLORS[config.colorTheme];

  // Build target options for adding parameters
  const targetOptions = useMemo(() => {
    const opts: { label: string; value: string; type: "source" | "modulator" }[] = [];
    for (const s of soundSources) {
      opts.push({ label: s.name, value: s.id, type: "source" });
    }
    for (const m of modulators) {
      opts.push({ label: m.name, value: m.id, type: "modulator" });
    }
    return opts;
  }, [soundSources, modulators]);

  const handleParamChange = (param: ListenerParameter, value: number) => {
    if (param.targetType === "source") {
      onUpdateSource(param.targetId, { [param.parameter]: value });
    } else {
      onUpdateModulator(param.targetId, { [param.parameter]: value });
    }
  };

  const renderControl = (param: ListenerParameter) => {
    const range = getParamRange(param.parameter);
    const currentValue = getParamValue(param, soundSources, modulators);

    switch (param.controlType) {
      case "slider":
        return (
          <Slider
            label={param.label}
            value={currentValue}
            min={range.min}
            max={range.max}
            step={range.step}
            formatValue={range.format}
            onChange={(v) => handleParamChange(param, v)}
          />
        );

      case "button": {
        const steps = param.buttonValues ?? [range.min, (range.min + range.max) / 2, range.max];
        return (
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wider opacity-60">
              {param.label}: {range.format(currentValue)}
            </label>
            <div className="flex gap-1 flex-wrap">
              {steps.map((v, i) => (
                <button
                  key={i}
                  onClick={() => handleParamChange(param, v)}
                  className={`px-3 py-1.5 rounded text-sm font-bold border transition-all cursor-pointer ${
                    Math.abs(currentValue - v) < range.step * 2
                      ? `${theme.border} ${theme.accent} bg-white/10`
                      : `${theme.border} opacity-60 hover:opacity-100`
                  }`}
                >
                  {range.format(v)}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case "xypad": {
        // Use two params if there is a following xypad param (pair them)
        return (
          <XYPad
            labelX={param.label}
            labelY="Value"
            valueX={currentValue}
            valueY={currentValue}
            minX={range.min}
            maxX={range.max}
            minY={range.min}
            maxY={range.max}
            formatX={range.format}
            formatY={range.format}
            onChange={(x) => handleParamChange(param, x)}
          />
        );
      }

      case "dropdown": {
        const presets = param.presets ?? [
          { label: "Low", value: range.min },
          { label: "Mid", value: (range.min + range.max) / 2 },
          { label: "High", value: range.max },
        ];
        return (
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wider opacity-60">
              {param.label}
            </label>
            <select
              value={presets.findIndex((p) => Math.abs(p.value - currentValue) < range.step * 2)}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                if (idx >= 0 && idx < presets.length) {
                  handleParamChange(param, presets[idx].value);
                }
              }}
              className={`w-full px-2 py-1.5 ${theme.surface} border ${theme.border} rounded text-sm focus:outline-none`}
            >
              {presets.map((p, i) => (
                <option key={i} value={i}>{p.label} ({range.format(p.value)})</option>
              ))}
            </select>
          </div>
        );
      }

      case "toggle": {
        const isOn = currentValue > (range.min + range.max) / 2;
        return (
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wider opacity-60">
              {param.label}
            </label>
            <Toggle
              label={isOn ? "ON" : "OFF"}
              active={isOn}
              activeColor="success"
              onChange={(v) => handleParamChange(param, v ? range.max : range.min)}
            />
          </div>
        );
      }
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${theme.bg} ${theme.text} flex flex-col overflow-hidden`}>
      {/* ── Top Bar ── */}
      <header className={`shrink-0 flex items-center justify-between px-6 py-3 border-b ${theme.border}`}>
        <div className="flex items-center gap-4">
          <h1 className={`font-display font-extrabold text-xl tracking-wider ${theme.accent}`}>
            LISTENER MODE
          </h1>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm font-bold ${
            isPlaying ? "bg-green-500/20 text-green-400" : `${theme.muted}`
          }`}>
            <span className={`w-2 h-2 rounded-full bg-current ${isPlaying ? "animate-pulse" : ""}`} />
            {isPlaying ? "PLAYING" : "STOPPED"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            label=""
            value={config.colorTheme}
            options={THEME_OPTIONS}
            onChange={(v) => onSetTheme(v as ListenerColorTheme)}
          />
          <Toggle
            label="HELP"
            active={config.showHelp}
            size="sm"
            activeColor="accent"
            onChange={() => onToggleHelp()}
          />
          <Toggle
            label="FULLSCREEN"
            active={config.fullscreen}
            size="sm"
            activeColor="accent"
            onChange={() => onToggleFullscreen()}
          />
          <Button label="EXIT" variant="danger" size="sm" onClick={onExit} />
        </div>
      </header>

      {/* ── Help Overlay ── */}
      {config.showHelp && (
        <div className={`${theme.surface} border-b ${theme.border} px-6 py-4 text-sm`}>
          <h3 className={`font-display font-bold ${theme.accent} mb-2`}>How to Use Listener Mode</h3>
          <ul className={`list-disc list-inside space-y-1 ${theme.muted}`}>
            <li>Use the <strong className={theme.text}>Play/Stop</strong> button to control audio playback</li>
            <li>Adjust exposed parameters using the controls below</li>
            <li><strong className={theme.text}>Reset</strong> restores all parameters to their values when Listener Mode was entered</li>
            <li>Use <strong className={theme.text}>Setup</strong> (bottom bar) to add/remove/configure controls</li>
            <li>Choose a <strong className={theme.text}>Color Theme</strong> from the dropdown for your presentation</li>
          </ul>
        </div>
      )}

      {/* ── Main Controls Area ── */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        {config.parameters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className={`text-lg ${theme.muted}`}>No parameters exposed yet.</p>
            <p className={`text-sm ${theme.muted}`}>
              Use the setup bar at the bottom to add listener-controlled parameters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {config.parameters.map((param) => {
              const target = param.targetType === "source"
                ? soundSources.find((s) => s.id === param.targetId)
                : modulators.find((m) => m.id === param.targetId);

              return (
                <div
                  key={param.id}
                  className={`${theme.surface} border ${theme.border} rounded-lg p-4 flex flex-col gap-3`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs uppercase tracking-wider ${theme.muted}`}>
                        {target?.name ?? "Unknown"}
                      </span>
                      {param.interactionMode !== "manual" && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          param.interactionMode === "automatic" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {param.interactionMode}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteParameter(param.id)}
                      className="text-xs opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove control"
                    >
                      x
                    </button>
                  </div>
                  {renderControl(param)}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Bottom Transport & Setup Bar ── */}
      <footer className={`shrink-0 border-t ${theme.border} px-6 py-3`}>
        <div className="flex items-center justify-between">
          {/* Transport */}
          <div className="flex items-center gap-3">
            <Button
              label={isPlaying ? "STOP" : "PLAY"}
              variant="primary"
              onClick={onTogglePlayback}
            />
            <Button label="RESET" variant="secondary" onClick={onReset} />
            <div className="ml-4 w-48">
              <Slider
                label="Master Vol"
                value={masterVolume}
                min={-60}
                max={0}
                step={0.1}
                formatValue={(v) => `${v.toFixed(1)} dB`}
                onChange={onChangeMasterVolume}
              />
            </div>
          </div>

          {/* Quick Add Parameter */}
          <ParameterAdder
            targets={targetOptions}
            onAdd={onAddParameter}
            theme={theme}
          />
        </div>
      </footer>
    </div>
  );
}

/* ── Parameter Adder (bottom bar widget) ── */
function ParameterAdder({
  targets,
  onAdd,
  theme,
}: {
  targets: { label: string; value: string; type: "source" | "modulator" }[];
  onAdd: (targetId: string, targetType: "source" | "modulator", parameter: string, label: string) => void;
  theme: typeof THEME_COLORS[ListenerColorTheme];
}) {
  const [selectedTarget, setSelectedTarget] = React.useState(targets[0]?.value ?? "");
  const [selectedParam, setSelectedParam] = React.useState("volume");

  const target = targets.find((t) => t.value === selectedTarget);
  const paramOptions = target?.type === "modulator" ? MODULATOR_PARAMS : SOURCE_PARAMS;

  // Ensure selected param is valid for current target type
  React.useEffect(() => {
    if (!paramOptions.find((p) => p.value === selectedParam)) {
      setSelectedParam(paramOptions[0]?.value ?? "volume");
    }
  }, [target?.type, paramOptions, selectedParam]);

  // Update selectedTarget when targets change
  React.useEffect(() => {
    if (targets.length > 0 && !targets.find((t) => t.value === selectedTarget)) {
      setSelectedTarget(targets[0].value);
    }
  }, [targets, selectedTarget]);

  if (targets.length === 0) return null;

  const handleAdd = () => {
    if (!target) return;
    const paramLabel = paramOptions.find((p) => p.value === selectedParam)?.label ?? selectedParam;
    const label = `${target.label} - ${paramLabel}`;
    onAdd(target.value, target.type, selectedParam, label);
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs uppercase tracking-wider ${theme.muted}`}>Add Control:</span>
      <select
        value={selectedTarget}
        onChange={(e) => setSelectedTarget(e.target.value)}
        className={`px-2 py-1 ${theme.surface} border ${theme.border} rounded text-xs focus:outline-none`}
      >
        {targets.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label} ({t.type === "source" ? "Src" : "Mod"})
          </option>
        ))}
      </select>
      <select
        value={selectedParam}
        onChange={(e) => setSelectedParam(e.target.value)}
        className={`px-2 py-1 ${theme.surface} border ${theme.border} rounded text-xs focus:outline-none`}
      >
        {paramOptions.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        className={`px-3 py-1 text-xs font-bold uppercase rounded border ${theme.border} ${theme.accent} hover:bg-white/10 transition-all cursor-pointer`}
      >
        + Add
      </button>
    </div>
  );
}
