"use client";

import React from "react";
import { Button } from "@/components/atoms/Button";
import { RouteItem } from "@/components/molecules/RouteItem";
import type { Route, SoundSource, Modulator } from "@/types/sound";

interface RoutingMatrixProps {
  routes: Route[];
  soundSources: SoundSource[];
  modulators: Modulator[];
  onAddRoute: () => void;
  onUpdateRoute: (id: string, updates: Partial<Route>) => void;
  onDeleteRoute: (id: string) => void;
}

export function RoutingMatrix({
  routes,
  soundSources,
  modulators,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
}: RoutingMatrixProps) {
  const canAdd = soundSources.length > 0 && modulators.length > 0;

  return (
    <div className="bg-bg-primary border-x border-border-color p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 className="font-display font-bold text-base uppercase tracking-widest text-accent-primary border-b border-border-color pb-2">
        Routing Matrix
      </h2>

      <Button
        label="+ Add Route"
        variant="secondary"
        fullWidth
        dashed
        onClick={onAddRoute}
      />

      {!canAdd && routes.length === 0 && (
        <p className="text-center text-sm text-text-secondary py-8">
          Create at least one sound source and one modulator, then add a route
          to connect them.
        </p>
      )}

      {routes.length > 0 && (
        <div className="flex flex-col gap-3">
          {routes.map((route) => (
            <RouteItem
              key={route.id}
              route={route}
              soundSources={soundSources}
              modulators={modulators}
              onUpdate={onUpdateRoute}
              onDelete={onDeleteRoute}
            />
          ))}
        </div>
      )}
    </div>
  );
}
