"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  fullWidth?: boolean;
  dashed?: boolean;
  onClick?: () => void;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-secondary text-accent-primary border-accent-secondary hover:bg-accent-primary hover:text-bg-primary",
  secondary:
    "bg-bg-tertiary text-text-primary border-border-color hover:border-accent-primary",
  danger:
    "bg-transparent text-danger border-danger hover:bg-danger hover:text-white",
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  fullWidth = false,
  dashed = false,
  onClick,
}: ButtonProps) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClass}
        ${variantClasses[variant]}
        ${fullWidth ? "w-full" : ""}
        ${dashed ? "border-dashed border-2" : "border"}
        rounded font-body font-bold uppercase tracking-wider
        cursor-pointer transition-all duration-150
      `}
    >
      {label}
    </button>
  );
}
