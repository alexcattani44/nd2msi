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
  /** true when another route already targets the same source+param */
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
    label: m.name,
    value: m.id,
  }));

  const parameterOptions = useMemo(() => {
    if (!source || source.sourceType === "oscillator") return OSCILLATOR_PARAMS;
    return SAMPLER_PARAMS;
  }, [source]);

  // Show min/max range controls for frequency, playbackRate, and pitchShift
  const showRange = route.parameter === "frequency"
    || route.parameter === "playbackRate"
    || route.parameter === "pitchShift";

  const rangeConfig = useMemo(() => {
    switch (route.parameter) {
      case "frequency":
        return { minBound: 20, maxBound: 2000, step: 1, format: (v: number) => `${v.toFixed(0)} Hz` };
      case "playbackRate":
        return { minBound: 0.1, maxBound: 4, step: 0.01, format: (v: number) => `${v.toFixed(2)}x` };
      case "pitchShift":
        return { minBound: -24, maxBound: 24, step: 1, format: (v: number) => `${v > 0 ? "+" : ""}${v} st` };
      default:
        return null;
    }
  }, [route.parameter]);

  return (
    <div className="bg-bg-tertiary border border-border-color rounded-md p-3 flex flex-col gap-3">
      {/* Header: connection label + delete */}
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

      {/* Duplicate warning */}
      {isDuplicate && (
        <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded p-2">
          Another route already targets {source?.name ?? "this source"}&apos;s{" "}
          {route.parameter}. Only one route per source+parameter is applied.
        </div>
      )}

      {/* Modulator selector */}
      <Select
        label="Modulator"
        value={route.modulatorId}
        options={modulatorOptions}
        onChange={(v) => onUpdate(route.id, { modulatorId: v })}
      />

      {/* Source selector */}
      <Select
        label="Sound Source"
        value={route.sourceId}
        options={sourceOptions}
        onChange={(v) => {
          const newSource = soundSources.find((s) => s.id === v);
          const updates: Partial<Route> = { sourceId: v };
          // Reset parameter if the current one isn't valid for the new source type
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

      {/* Parameter selector */}
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

      {/* Modulation depth */}
      <Slider
        label="Modulation Depth"
        value={route.depth}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(v) => onUpdate(route.id, { depth: v })}
      />

      {/* Min/Max range controls for applicable params */}
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

      {/* Status indicator */}
      {modulator?.type === "lfo" && (
        <div className="text-xs text-success bg-bg-primary rounded p-2 mt-1">
          LFO → {route.parameter}
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
