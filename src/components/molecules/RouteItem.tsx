"use client";

import React, { useMemo } from "react";
import { Slider } from "@/components/atoms/Slider";
import { Select } from "@/components/atoms/Select";
import { Button } from "@/components/atoms/Button";
import type {
  Route,
  SoundSource,
  Modulator,
  RoutableParam,
} from "@/types/sound";
import { getDefaultRange } from "@/types/sound";

const SHARED_PARAMS = [
  { label: "Volume", value: "volume" },
  { label: "Pan", value: "pan" },
  { label: "Reverb Mix", value: "reverbMix" },
  { label: "Delay Mix", value: "delayMix" },
  { label: "Filter Cutoff", value: "filterFrequency" },
];

const OSCILLATOR_PARAMS = [
  { label: "Frequency", value: "frequency" },
  ...SHARED_PARAMS,
];

const SAMPLER_PARAMS = [
  ...SHARED_PARAMS,
  { label: "Speed", value: "playbackRate" },
  { label: "Pitch Shift", value: "pitchShift" },
];

interface RouteItemProps {
  route: Route;
  soundSources: SoundSource[];
  modulators: Modulator[];
  isDuplicate: boolean;
  onUpdate: (id: string, updates: Partial<Route>) => void;
  onDelete: (id: string) => void;
}

export function RouteItem({
  route,
  soundSources,
  modulators,
  isDuplicate,
  onUpdate,
  onDelete,
}: RouteItemProps) {
  const source = soundSources.find((s) => s.id === route.sourceId);
  const modulator = modulators.find((m) => m.id === route.modulatorId);

  const sourceOptions = soundSources.map((s) => ({
    label: `${s.name} (${s.sourceType === "sampler" ? "S" : "O"})`,
    value: s.id,
  }));
  const modulatorOptions = modulators.map((m) => ({
    label: `${m.name} (${m.type})`,
    value: m.id,
  }));

  const parameterOptions = useMemo(() => {
    if (!source || source.sourceType === "oscillator") return OSCILLATOR_PARAMS;
    return SAMPLER_PARAMS;
  }, [source]);

  const showRange = route.parameter === "frequency"
    || route.parameter === "playbackRate"
    || route.parameter === "pitchShift"
    || route.parameter === "filterFrequency";

  const rangeConfig = useMemo(() => {
    switch (route.parameter) {
      case "frequency":
        return { minBound: 20, maxBound: 2000, step: 1, format: (v: number) => `${v.toFixed(0)} Hz` };
      case "playbackRate":
        return { minBound: 0.1, maxBound: 4, step: 0.01, format: (v: number) => `${v.toFixed(2)}x` };
      case "pitchShift":
        return { minBound: -24, maxBound: 24, step: 1, format: (v: number) => `${v > 0 ? "+" : ""}${v} st` };
      case "filterFrequency":
        return { minBound: 20, maxBound: 20000, step: 1, format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${v.toFixed(0)} Hz` };
      default:
        return null;
    }
  }, [route.parameter]);

  return (
    <div className="bg-bg-tertiary border border-border-color rounded-md p-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-accent-primary font-mono">
          {modulator?.name ?? "?"} → {source?.name ?? "?"}
        </span>
        <Button
          label="DELETE"
          variant="danger"
          size="sm"
          onClick={() => onDelete(route.id)}
        />
      </div>

      {isDuplicate && (
        <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded p-2">
          Another route already targets {source?.name ?? "this source"}&apos;s{" "}
          {route.parameter}. Only one route per source+parameter is applied.
        </div>
      )}

      <Select
        label="Modulator"
        value={route.modulatorId}
        options={modulatorOptions}
        onChange={(v) => onUpdate(route.id, { modulatorId: v })}
      />

      <Select
        label="Sound Source"
        value={route.sourceId}
        options={sourceOptions}
        onChange={(v) => {
          const newSource = soundSources.find((s) => s.id === v);
          const updates: Partial<Route> = { sourceId: v };
          if (newSource) {
            const validParams = newSource.sourceType === "sampler" ? SAMPLER_PARAMS : OSCILLATOR_PARAMS;
            if (!validParams.some((p) => p.value === route.parameter)) {
              const newParam = validParams[0].value as RoutableParam;
              const defaults = getDefaultRange(newParam);
              updates.parameter = newParam;
              updates.min = defaults.min;
              updates.max = defaults.max;
            }
          }
          onUpdate(route.id, updates);
        }}
      />

      <Select
        label="Parameter"
        value={route.parameter}
        options={parameterOptions}
        onChange={(v) => {
          const param = v as RoutableParam;
          const defaults = getDefaultRange(param);
          onUpdate(route.id, {
            parameter: param,
            min: defaults.min,
            max: defaults.max,
          });
        }}
      />

      <Slider
        label="Modulation Depth"
        value={route.depth}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(v) => onUpdate(route.id, { depth: v })}
      />

      {showRange && rangeConfig && (
        <>
          <Slider
            label={`Min ${route.parameter}`}
            value={route.min}
            min={rangeConfig.minBound}
            max={rangeConfig.maxBound}
            step={rangeConfig.step}
            formatValue={rangeConfig.format}
            onChange={(v) => onUpdate(route.id, { min: v })}
          />
          <Slider
            label={`Max ${route.parameter}`}
            value={route.max}
            min={rangeConfig.minBound}
            max={rangeConfig.maxBound}
            step={rangeConfig.step}
            formatValue={rangeConfig.format}
            onChange={(v) => onUpdate(route.id, { max: v })}
          />
        </>
      )}

      {/* Status indicators */}
      {modulator?.type === "lfo" && (
        <div className="text-xs text-success bg-bg-primary rounded p-2 mt-1">
          LFO ({modulator.shape}) → {route.parameter}
        </div>
      )}
      {modulator?.type === "envelope" && (
        <div className="text-xs text-success bg-bg-primary rounded p-2 mt-1">
          Envelope (A:{modulator.attack}s D:{modulator.decay}s S:{(modulator.sustain * 100).toFixed(0)}% R:{modulator.release}s) → {route.parameter}
        </div>
      )}
      {modulator?.type === "data" && modulator.data && (
        <div className="text-xs text-success bg-bg-primary rounded p-2 mt-1">
          Data ({modulator.dataLength} pts) → {route.parameter}
        </div>
      )}
      {modulator?.type === "data" && !modulator.data && (
        <div className="text-xs text-danger bg-bg-primary rounded p-2 mt-1">
          No data loaded — upload a CSV in the modulator panel
        </div>
      )}
    </div>
  );
}
