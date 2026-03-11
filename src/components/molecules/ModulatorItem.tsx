"use client";

import React, { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/atoms/Slider";
import { Select } from "@/components/atoms/Select";
import { Button } from "@/components/atoms/Button";
import type { Modulator } from "@/types/sound";
import Papa from "papaparse";

const SHAPE_OPTIONS = [
  { label: "Sine", value: "sine" },
  { label: "Square", value: "square" },
  { label: "Sawtooth", value: "sawtooth" },
  { label: "Triangle", value: "triangle" },
];

const TYPE_OPTIONS = [
  { label: "LFO", value: "lfo" },
  { label: "Data-Driven", value: "data" },
];

interface ModulatorItemProps {
  modulator: Modulator;
  onUpdate: (id: string, updates: Partial<Modulator>) => void;
  onDelete: (id: string) => void;
}

export function ModulatorItem({
  modulator,
  onUpdate,
  onDelete,
}: ModulatorItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draw waveform visualization when data changes
  useEffect(() => {
    if (!modulator.data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#383c3f";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#f1bedd";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const data = modulator.data;
    const step = Math.max(1, Math.floor(data.length / width));

    for (let i = 0; i < width; i++) {
      const index = Math.floor(i * step);
      if (index < data.length) {
        const range = modulator.dataMax - modulator.dataMin || 1;
        const normalized = (data[index] - modulator.dataMin) / range;
        const y = height - normalized * height;
        if (i === 0) {
          ctx.moveTo(i, y);
        } else {
          ctx.lineTo(i, y);
        }
      }
    }
    ctx.stroke();
  }, [modulator.data, modulator.dataMin, modulator.dataMax]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      Papa.parse(text, {
        complete: (results) => {
          const data = (results.data as string[][])
            .flat()
            .filter((val) => val !== "" && !isNaN(Number(val)))
            .map((val) => parseFloat(val));

          if (data.length > 0) {
            const dataMin = Math.min(...data);
            const dataMax = Math.max(...data);
            onUpdate(modulator.id, {
              data,
              dataName: file.name,
              dataMin,
              dataMax,
              dataLength: data.length,
            });
          }
        },
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="bg-bg-tertiary border border-border-color rounded-md p-3 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-sm text-accent-primary tracking-wide">
          {modulator.name}
        </span>
        <Button
          label="DELETE"
          variant="danger"
          size="sm"
          onClick={() => onDelete(modulator.id)}
        />
      </div>

      {/* Type selector */}
      <Select
        label="Type"
        value={modulator.type}
        options={TYPE_OPTIONS}
        onChange={(v) => onUpdate(modulator.id, { type: v as Modulator["type"] })}
      />

      {/* LFO controls */}
      {modulator.type === "lfo" && (
        <>
          <Select
            label="Shape"
            value={modulator.shape}
            options={SHAPE_OPTIONS}
            onChange={(v) =>
              onUpdate(modulator.id, { shape: v as Modulator["shape"] })
            }
          />
          <Slider
            label="Rate"
            value={modulator.rate}
            min={0.1}
            max={10}
            step={0.1}
            formatValue={(v) => `${v.toFixed(2)} Hz`}
            onChange={(v) => onUpdate(modulator.id, { rate: v })}
          />
        </>
      )}

      {/* Data-driven controls */}
      {modulator.type === "data" && (
        <>
          <div
            className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-accent-secondary bg-accent-secondary/10"
                : "border-border-color hover:border-accent-primary hover:bg-accent-primary/5"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {modulator.dataName ? (
              <>
                <div className="font-bold text-sm mb-1">{modulator.dataName}</div>
                <div className="text-xs text-text-secondary">Click to replace</div>
              </>
            ) : (
              <>
                <div className="font-bold text-sm mb-1">Drop CSV/JSON here</div>
                <div className="text-xs text-text-secondary">or click to browse</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {modulator.data && (
            <div className="mt-1 p-3 bg-bg-primary rounded">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-bg-tertiary p-2 rounded text-xs">
                  <div className="text-text-secondary uppercase tracking-wider">
                    Points
                  </div>
                  <div className="text-accent-tertiary font-bold">
                    {modulator.dataLength}
                  </div>
                </div>
                <div className="bg-bg-tertiary p-2 rounded text-xs">
                  <div className="text-text-secondary uppercase tracking-wider">
                    Range
                  </div>
                  <div className="text-accent-tertiary font-bold">
                    {modulator.dataMin.toFixed(2)} – {modulator.dataMax.toFixed(2)}
                  </div>
                </div>
              </div>
              <canvas
                ref={canvasRef}
                className="w-full h-[60px] rounded"
                width={400}
                height={60}
              />
            </div>
          )}
        </>
      )}

      {/* Depth (shared by both types) */}
      <Slider
        label="Depth"
        value={modulator.depth}
        min={0}
        max={1}
        step={0.01}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        onChange={(v) => onUpdate(modulator.id, { depth: v })}
      />
    </div>
  );
}
