"use client";

import React from "react";
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

const PARAMETER_OPTIONS = [
  { label: "Frequency", value: "frequency" },
  { label: "Volume", value: "volume" },
  { label: "Pan", value: "pan" },
  { label: "Reverb Mix", value: "reverbMix" },
  { label: "Delay Mix", value: "delayMix" },
];

interface RouteItemProps {
  route: Route;
  soundSources: SoundSource[];
  modulators: Modulator[];
  onUpdate: (id: string, updates: Partial<Route>) => void;
  onDelete: (id: string) => void;
}

export function RouteItem({
  route,
  soundSources,
  modulators,
  onUpdate,
  onDelete,
}: RouteItemProps) {
  const source = soundSources.find((s) => s.id === route.sourceId);
  const modulator = modulators.find((m) => m.id === route.modulatorId);

  const sourceOptions = soundSources.map((s) => ({
    label: s.name,
    value: s.id,
  }));
  const modulatorOptions = modulators.map((m) => ({
    label: m.name,
    value: m.id,
  }));

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
        onChange={(v) => onUpdate(route.id, { sourceId: v })}
      />

      {/* Parameter selector */}
      <Select
        label="Parameter"
        value={route.parameter}
        options={PARAMETER_OPTIONS}
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

      {/* Frequency min/max (only for frequency parameter) */}
      {route.parameter === "frequency" && (
        <>
          <Slider
            label="Min Frequency"
            value={route.min}
            min={20}
            max={2000}
            step={1}
            formatValue={(v) => `${v.toFixed(0)} Hz`}
            onChange={(v) => onUpdate(route.id, { min: v })}
          />
          <Slider
            label="Max Frequency"
            value={route.max}
            min={20}
            max={2000}
            step={1}
            formatValue={(v) => `${v.toFixed(0)} Hz`}
            onChange={(v) => onUpdate(route.id, { max: v })}
          />
        </>
      )}

      {/* Status indicator */}
      {modulator?.type === "lfo" && (
        <div className="text-xs text-success bg-bg-primary rounded p-2 mt-1">
          LFO modulation active
        </div>
      )}
      {modulator?.type === "data" && modulator.data && (
        <div className="text-xs text-success bg-bg-primary rounded p-2 mt-1">
          Data modulation active
        </div>
      )}
    </div>
  );
}
