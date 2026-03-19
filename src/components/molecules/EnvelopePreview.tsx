"use client";

import React, { useRef, useEffect } from "react";

interface EnvelopePreviewProps {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  className?: string;
}

export function EnvelopePreview({
  attack,
  decay,
  sustain,
  release,
  className,
}: EnvelopePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 6;
    const drawW = w - pad * 2;
    const drawH = h - pad * 2;

    ctx.fillStyle = "#383c3f";
    ctx.fillRect(0, 0, w, h);

    // Compute proportional widths for each ADSR segment
    const total = attack + decay + release;
    // Give sustain a visual hold region proportional to the total
    const sustainHold = total * 0.3;
    const fullTime = total + sustainHold;

    const aW = (attack / fullTime) * drawW;
    const dW = (decay / fullTime) * drawW;
    const sW = (sustainHold / fullTime) * drawW;
    const rW = (release / fullTime) * drawW;

    const bottom = pad + drawH;
    const top = pad;
    const sustainY = pad + drawH * (1 - sustain);

    // Draw ADSR curve
    ctx.strokeStyle = "#f1bedd";
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Start at bottom-left (silence)
    let x = pad;
    ctx.moveTo(x, bottom);

    // Attack: ramp up to peak
    x += aW;
    ctx.lineTo(x, top);

    // Decay: ramp down to sustain level
    x += dW;
    ctx.lineTo(x, sustainY);

    // Sustain: hold
    x += sW;
    ctx.lineTo(x, sustainY);

    // Release: ramp down to silence
    x += rW;
    ctx.lineTo(x, bottom);

    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(pad, bottom);
    ctx.closePath();
    ctx.fillStyle = "rgba(241, 190, 221, 0.08)";
    ctx.fill();

    // Draw phase labels
    ctx.fillStyle = "#c2ccdd";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";

    const aCenter = pad + aW / 2;
    const dCenter = pad + aW + dW / 2;
    const sCenter = pad + aW + dW + sW / 2;
    const rCenter = pad + aW + dW + sW + rW / 2;

    ctx.fillText("A", aCenter, h - 1);
    ctx.fillText("D", dCenter, h - 1);
    ctx.fillText("S", sCenter, h - 1);
    ctx.fillText("R", rCenter, h - 1);

    // Draw dashed lines at phase boundaries
    ctx.strokeStyle = "#4f5054";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);

    const phases = [pad + aW, pad + aW + dW, pad + aW + dW + sW];
    for (const px of phases) {
      ctx.beginPath();
      ctx.moveTo(px, pad);
      ctx.lineTo(px, bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }, [attack, decay, sustain, release]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-[60px] rounded ${className ?? ""}`}
      width={400}
      height={60}
    />
  );
}
