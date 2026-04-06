"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import type {
  SoundSource,
  Modulator,
  ListenerModeConfig,
  ListenerParameter,
  ListenerControlType,
  InteractionMode,
} from "@/types/sound";

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

interface ListenerSetupPanelProps {
  config: ListenerModeConfig;
  soundSources: SoundSource[];
  modulators: Modulator[];
  onAddParameter: (targetId: string, targetType: "source" | "modulator", parameter: string, label: string) => void;
  onUpdateParameter: (id: string, updates: Partial<ListenerParameter>) => void;
  onDeleteParameter: (id: string) => void;
  onEnterListenerMode: () => void;
}

export function ListenerSetupPanel({
  config,
  soundSources,
  modulators,
  onAddParameter,
  onUpdateParameter,
  onDeleteParameter,
  onEnterListenerMode,
}: ListenerSetupPanelProps) {
  const targetOptions = useMemo(() => {
    const opts: { label: string; value: string; type: "source" | "modulator" }[] = [];
    for (const s of soundSources) opts.push({ label: s.name, value: s.id, type: "source" });
    for (const m of modulators) opts.push({ label: m.name, value: m.id, type: "modulator" });
    return opts;
  }, [soundSources, modulators]);

  const [selectedTarget, setSelectedTarget] = React.useState(targetOptions[0]?.value ?? "");
  const target = targetOptions.find((t) => t.value === selectedTarget);
  const paramOptions = target?.type === "modulator" ? MODULATOR_PARAMS : SOURCE_PARAMS;
  const [selectedParam, setSelectedParam] = React.useState(paramOptions[0]?.value ?? "volume");

  const handleAdd = () => {
    if (!target) return;
    const paramLabel = paramOptions.find((p) => p.value === selectedParam)?.label ?? selectedParam;
    onAddParameter(target.value, target.type, selectedParam, `${target.label} - ${paramLabel}`);
  };

  const hasTargets = soundSources.length > 0 || modulators.length > 0;

  return (
    <div className="bg-bg-tertiary border border-border-color rounded-md p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm text-accent-primary tracking-wide uppercase">
          Listener Mode Setup
        </h3>
        <Button
          label="ENTER LISTENER MODE"
          variant="primary"
          size="sm"
          onClick={onEnterListenerMode}
        />
      </div>

      <p className="text-xs text-text-secondary">
        Configure which parameters listeners can control during a performance.
      </p>

      {/* Add parameter */}
      {hasTargets && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTarget}
            onChange={(e) => {
              setSelectedTarget(e.target.value);
              const t = targetOptions.find((t) => t.value === e.target.value);
              const pOpts = t?.type === "modulator" ? MODULATOR_PARAMS : SOURCE_PARAMS;
              setSelectedParam(pOpts[0]?.value ?? "volume");
            }}
            className="px-2 py-1 bg-bg-primary border border-border-color rounded text-xs text-text-primary focus:outline-none"
          >
            {targetOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} ({t.type === "source" ? "Src" : "Mod"})
              </option>
            ))}
          </select>
          <select
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value)}
            className="px-2 py-1 bg-bg-primary border border-border-color rounded text-xs text-text-primary focus:outline-none"
          >
            {paramOptions.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <Button label="+ Add Control" variant="secondary" size="sm" onClick={handleAdd} />
        </div>
      )}

      {/* Configured parameters */}
      {config.parameters.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {config.parameters.map((param) => {
            const tgt = param.targetType === "source"
              ? soundSources.find((s) => s.id === param.targetId)
              : modulators.find((m) => m.id === param.targetId);

            return (
              <div key={param.id} className="bg-bg-primary rounded p-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent-tertiary">
                    {tgt?.name ?? "?"} &rarr; {param.parameter}
                  </span>
                  <Button
                    label="x"
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteParameter(param.id)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Control"
                    value={param.controlType}
                    options={CONTROL_TYPE_OPTIONS}
                    onChange={(v) => onUpdateParameter(param.id, { controlType: v as ListenerControlType })}
                  />
                  <Select
                    label="Mode"
                    value={param.interactionMode}
                    options={INTERACTION_MODE_OPTIONS}
                    onChange={(v) => onUpdateParameter(param.id, { interactionMode: v as InteractionMode })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {config.parameters.length === 0 && (
        <p className="text-xs text-text-secondary italic py-2">
          No listener controls configured yet. Add controls above to expose parameters in Listener Mode.
        </p>
      )}
    </div>
  );
}
