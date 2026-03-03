"use client";

import React from "react";
import { Button } from "@/components/atoms/Button";
import { ModulatorItem } from "@/components/molecules/ModulatorItem";
import type { Modulator } from "@/types/sound";

interface ModulatorPanelProps {
  modulators: Modulator[];
  onAddModulator: () => void;
  onUpdateModulator: (id: string, updates: Partial<Modulator>) => void;
  onDeleteModulator: (id: string) => void;
}

export function ModulatorPanel({
  modulators,
  onAddModulator,
  onUpdateModulator,
  onDeleteModulator,
}: ModulatorPanelProps) {
  return (
    <div className="bg-bg-secondary border border-border-color rounded-none p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 className="font-display font-bold text-base uppercase tracking-widest text-accent-primary border-b border-border-color pb-2">
        Modulators
      </h2>

      <Button
        label="+ Add Modulator"
        variant="secondary"
        fullWidth
        dashed
        onClick={onAddModulator}
      />

      {modulators.length === 0 ? (
        <p className="text-center text-sm text-text-secondary py-8">
          No modulators yet. Click above to add one.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {modulators.map((mod) => (
            <ModulatorItem
              key={mod.id}
              modulator={mod}
              onUpdate={onUpdateModulator}
              onDelete={onDeleteModulator}
            />
          ))}
        </div>
      )}
    </div>
  );
}
