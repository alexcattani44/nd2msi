export type Waveform = "sine" | "square" | "sawtooth" | "triangle";

export interface SoundSource {
  id: string;
  name: string;
  waveform: Waveform;
  frequency: number;
  volume: number;
  pan: number;
  reverbMix: number;
  delayMix: number;
  delayTime: number;
}

export function createSoundSource(index: number): SoundSource {
  return {
    id: Date.now().toString(),
    name: `Source ${index + 1}`,
    waveform: "sine",
    frequency: 440,
    volume: -12,
    pan: 0,
    reverbMix: 0,
    delayMix: 0,
    delayTime: 0.25,
  };
}

/* ── Modulators ── */

export type ModulatorType = "lfo" | "data";

export interface Modulator {
  id: string;
  name: string;
  type: ModulatorType;
  shape: Waveform;
  rate: number;
  depth: number;
  data: number[] | null;
  dataName: string | null;
  dataMin: number;
  dataMax: number;
  dataLength: number;
}

export function createModulator(index: number): Modulator {
  return {
    id: Date.now().toString(),
    name: `Modulator ${index + 1}`,
    type: "lfo",
    shape: "sine",
    rate: 1,
    depth: 0.5,
    data: null,
    dataName: null,
    dataMin: 0,
    dataMax: 1,
    dataLength: 0,
  };
}

/* ── Routes ── */

export type RoutableParam =
  | "frequency"
  | "volume"
  | "pan"
  | "reverbMix"
  | "delayMix";

export interface Route {
  id: string;
  sourceId: string;
  modulatorId: string;
  parameter: RoutableParam;
  depth: number;
  min: number;
  max: number;
}

export function createRoute(
  sourceId: string,
  modulatorId: string,
): Route {
  return {
    id: Date.now().toString(),
    sourceId,
    modulatorId,
    parameter: "frequency",
    depth: 0.5,
    min: 200,
    max: 800,
  };
}

export function getDefaultRange(param: RoutableParam): { min: number; max: number } {
  switch (param) {
    case "frequency":
      return { min: 200, max: 800 };
    case "volume":
      return { min: -40, max: -10 };
    case "pan":
      return { min: -1, max: 1 };
    case "reverbMix":
      return { min: 0, max: 1 };
    case "delayMix":
      return { min: 0, max: 1 };
  }
}
