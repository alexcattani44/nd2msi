"use client";

import React, { useRef, useEffect } from "react";
import type { LfoShape } from "@/types/sound";

interface LfoPreviewProps {
  shape: LfoShape;
  rate: number;
  className?: string;
}

/** Generate one cycle of a waveform (0..1 phase → -1..1 amplitude). */
function sample(shape: LfoShape, phase: number, randomValues: number[]): number {
  switch (shape) {
    case "sine":
      return Math.sin(phase * 2 * Math.PI);
    case "square":
      return phase < 0.5 ? 1 : -1;
    case "sawtooth":
      return 2 * phase - 1;
    case "triangle":
      return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
    case "random": {
      // Step through random values to mimic sample-and-hold
      const idx = Math.floor(phase * randomValues.length);
      return randomValues[Math.min(idx, randomValues.length - 1)];
    }
    default:
      return 0;
  }
}

export function LfoPreview({ shape, rate, className }: LfoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const randomRef = useRef<number[]>([]);

  // Generate stable random values for S&H preview
  useEffect(() => {
    randomRef.current = Array.from({ length: 8 }, () => Math.random() * 2 - 1);
  }, [shape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 4;
    const drawH = h - pad * 2;

    ctx.fillStyle = "#383c3f";
    ctx.fillRect(0, 0, w, h);

    // Draw zero line
    ctx.strokeStyle = "#4f5054";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw waveform — show 2 cycles
    const cycles = 2;
    ctx.strokeStyle = "#f1bedd";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x < w; x++) {
      const phase = (x / w) * cycles;
      const cycleFrac = phase - Math.floor(phase); // 0..1 within cycle
      const val = sample(shape, cycleFrac, randomRef.current);
      const y = pad + drawH * (0.5 - val * 0.45);

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Rate label
    ctx.fillStyle = "#c2ccdd";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${rate.toFixed(2)} Hz`, w - 4, h - 4);
  }, [shape, rate]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-[60px] rounded ${className ?? ""}`}
      width={400}
      height={60}
    />
  );
}
