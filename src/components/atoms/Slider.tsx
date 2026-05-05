"use client";

import React, { useState, useRef, useEffect } from "react";

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wider text-text-secondary">
        {label}:{" "}
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="inline-block w-20 bg-bg-primary border border-accent-primary rounded px-1 py-0 text-xs text-accent-primary font-mono outline-none"
          />
        ) : (
          <span
            className="cursor-pointer hover:text-accent-tertiary transition-colors"
            onDoubleClick={() => {
              setDraft(String(value));
              setEditing(true);
            }}
            title="Double-click to type a value"
          >
            {display}
          </span>
        )}
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
