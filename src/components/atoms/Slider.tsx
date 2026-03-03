"use client";

import React from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (v: number) => string;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  formatValue,
  onChange,
}: SliderProps) {
  const display = formatValue ? formatValue(value) : `${value}${unit}`;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wider text-text-secondary">
        {label}: {display}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
