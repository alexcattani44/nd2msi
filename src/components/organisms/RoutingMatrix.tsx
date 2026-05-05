"use client";

import React from "react";
import { Button } from "@/components/atoms/Button";
import { RouteItem } from "@/components/molecules/RouteItem";
import type { Route, SoundSource, Modulator } from "@/types/sound";

interface RoutingMatrixProps {
  routes: Route[];
  soundSources: SoundSource[];
  modulators: Modulator[];
  isListenerMode: boolean;
  onAddRoute: () => void;
  onUpdateRoute: (id: string, updates: Partial<Route>) => void;
  onDeleteRoute: (id: string) => void;
}

export function RoutingMatrix({
  routes,
  soundSources,
  modulators,
  isListenerMode,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
}: RoutingMatrixProps) {
  if (isListenerMode) return null;

  const canAdd = soundSources.length > 0 && modulators.length > 0;

  // Build a set of (sourceId:param) keys that appear more than once,
  // so RouteItem can show a duplicate warning.
  const paramCounts = new Map<string, number>();
  for (const r of routes) {
    const key = `${r.sourceId}:${r.parameter}`;
    paramCounts.set(key, (paramCounts.get(key) ?? 0) + 1);
  }
  const duplicateKeys = new Set(
    [...paramCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  );

  return (
    <div className="flex flex-col gap-4">
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
              isDuplicate={duplicateKeys.has(
                `${route.sourceId}:${route.parameter}`,
              )}
              onUpdate={onUpdateRoute}
              onDelete={onDeleteRoute}
            />
          ))}
        </div>
      )}
    </div>
  );
}
