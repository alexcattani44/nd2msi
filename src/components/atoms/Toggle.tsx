"use client";

import React from "react";

interface ToggleProps {
  label: string;
  active: boolean;
  size?: "sm" | "md";
  activeColor?: "accent" | "success" | "danger" | "warning";
  onChange: (active: boolean) => void;
}

const colorClasses: Record<string, { on: string; off: string }> = {
  accent: {
    on: "bg-accent-secondary text-accent-primary border-accent-secondary",
    off: "bg-bg-tertiary text-text-secondary border-border-color hover:border-accent-primary",
  },
  success: {
    on: "bg-success/20 text-success border-success",
    off: "bg-bg-tertiary text-text-secondary border-border-color hover:border-success",
  },
  danger: {
    on: "bg-danger/20 text-danger border-danger",
    off: "bg-bg-tertiary text-text-secondary border-border-color hover:border-danger",
  },
  warning: {
    on: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
    off: "bg-bg-tertiary text-text-secondary border-border-color hover:border-yellow-500",
  },
};

export function Toggle({
  label,
  active,
  size = "md",
  activeColor = "accent",
  onChange,
}: ToggleProps) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm";
  const colors = colorClasses[activeColor];

  return (
    <button
      onClick={() => onChange(!active)}
      className={`
        ${sizeClass}
        ${active ? colors.on : colors.off}
        border rounded font-body font-bold uppercase tracking-wider
        cursor-pointer transition-all duration-150
      `}
    >
      {label}
    </button>
  );
}
