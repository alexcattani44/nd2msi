"use client";

import React from "react";
import { Button } from "@/components/atoms/Button";
import { ModulatorItem } from "@/components/molecules/ModulatorItem";
import type { Modulator } from "@/types/sound";

interface ModulatorPanelProps {
  modulators: Modulator[];
  isListenerMode: boolean;
  onAddModulator: () => void;
  onUpdateModulator: (id: string, updates: Partial<Modulator>) => void;
  onDeleteModulator: (id: string) => void;
  isListenerParam: (targetId: string, parameter: string) => boolean;
  onToggleListenerParam: (targetId: string, parameter: string) => void;
  hasAnyListenerParams: (targetId: string) => boolean;
}

export function ModulatorPanel({
  modulators,
  isListenerMode,
  onAddModulator,
  onUpdateModulator,
  onDeleteModulator,
  isListenerParam,
  onToggleListenerParam,
  hasAnyListenerParams,
}: ModulatorPanelProps) {
  const visibleMods = isListenerMode
    ? modulators.filter((m) => hasAnyListenerParams(m.id))
    : modulators;

  return (
    <div className="bg-bg-secondary border border-border-color rounded-none p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 className="font-display font-bold text-base uppercase tracking-widest text-accent-primary border-b border-border-color pb-2">
        Modulators
      </h2>

      {!isListenerMode && (
        <Button
          label="+ Add Modulator"
          variant="secondary"
          fullWidth
          dashed
          onClick={onAddModulator}
        />
      )}

      {visibleMods.length === 0 ? (
        <p className="text-center text-sm text-text-secondary py-8">
          {isListenerMode
            ? "No parameters exposed for listener mode."
            : "No modulators yet. Click above to add one."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleMods.map((mod) => (
            <ModulatorItem
              key={mod.id}
              modulator={mod}
              isListenerMode={isListenerMode}
              onUpdate={onUpdateModulator}
              onDelete={onDeleteModulator}
              isListenerParam={isListenerParam}
              onToggleListenerParam={onToggleListenerParam}
            />
          ))}
        </div>
      )}
    </div>
  );
}
