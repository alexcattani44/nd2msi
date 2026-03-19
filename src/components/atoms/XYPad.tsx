"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

interface XYPadProps {
  labelX: string;
  labelY: string;
  valueX: number;
  valueY: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  onChange: (x: number, y: number) => void;
}

export function XYPad({
  labelX,
  labelY,
  valueX,
  valueY,
  minX = 0,
  maxX = 1,
  minY = 0,
  maxY = 1,
  formatX,
  formatY,
  onChange,
}: XYPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const normalizedX = (valueX - minX) / (maxX - minX);
  const normalizedY = 1 - (valueY - minY) / (maxY - minY); // Invert Y (top = max)

  const handlePointerEvent = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const x = minX + nx * (maxX - minX);
      const y = minY + (1 - ny) * (maxY - minY);
      onChange(x, y);
    },
    [minX, maxX, minY, maxY, onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handlePointerEvent(e.clientX, e.clientY);
    },
    [handlePointerEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      handlePointerEvent(e.clientX, e.clientY);
    },
    [isDragging, handlePointerEvent],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const displayX = formatX ? formatX(valueX) : valueX.toFixed(2);
  const displayY = formatY ? formatY(valueY) : valueY.toFixed(2);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs uppercase tracking-wider text-text-secondary">
        <span>{labelX}: {displayX}</span>
        <span>{labelY}: {displayY}</span>
      </div>
      <div
        ref={padRef}
        className={`relative w-full h-[120px] bg-bg-primary border rounded cursor-crosshair select-none ${
          isDragging ? "border-accent-primary" : "border-border-color"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Crosshair lines */}
        <div
          className="absolute top-0 bottom-0 w-px bg-accent-primary/30"
          style={{ left: `${normalizedX * 100}%` }}
        />
        <div
          className="absolute left-0 right-0 h-px bg-accent-primary/30"
          style={{ top: `${normalizedY * 100}%` }}
        />
        {/* Dot */}
        <div
          className="absolute w-3 h-3 rounded-full bg-accent-primary border-2 border-accent-secondary -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${normalizedX * 100}%`,
            top: `${normalizedY * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
