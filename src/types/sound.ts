export type Waveform = "sine" | "square" | "sawtooth" | "triangle" | "custom";

export type LfoShape = Waveform | "random";

export type SourceType = "oscillator" | "sampler";

export type LoopMode = "none" | "loop" | "pingpong";

export type FilterType = "lowpass" | "highpass" | "bandpass" | "notch";

export interface SoundSource {
  id: string;
  name: string;
  sourceType: SourceType;
  muted: boolean;
  solo: boolean;
  // Oscillator fields
  waveform: Waveform;
  frequency: number;
  customPartials: number[];
  // Sampler fields
  audioFileUrl: string | null;
  audioFileName: string | null;
  sampleStart: number;
  sampleEnd: number;
  loopMode: LoopMode;
  pitchShift: number;
  playbackRate: number;
  // Filter
  filterEnabled: boolean;
  filterType: FilterType;
  filterFrequency: number;
  filterQ: number;
  // Shared fields
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
    sourceType: "oscillator",
    muted: false,
    solo: false,
    waveform: "sine",
    frequency: 440,
    customPartials: [1, 0.5, 0.25],
    audioFileUrl: null,
    audioFileName: null,
    sampleStart: 0,
    sampleEnd: 1,
    loopMode: "none",
    pitchShift: 0,
    playbackRate: 1,
    filterEnabled: false,
    filterType: "lowpass",
    filterFrequency: 1000,
    filterQ: 1,
    volume: -12,
    pan: 0,
    reverbMix: 0,
    delayMix: 0,
    delayTime: 0.25,
  };
}

/* ── Modulators ── */

export type ModulatorType = "lfo" | "data" | "envelope";

export interface Modulator {
  id: string;
  name: string;
  type: ModulatorType;
  shape: LfoShape;
  rate: number;
  depth: number;
  data: number[] | null;
  dataName: string | null;
  dataMin: number;
  dataMax: number;
  dataLength: number;
  // Data-driven fields
  dataRate: number; // ms between data points (default 50)
  dataSmoothing: number; // 0 = none, 1 = full smoothing (linear interpolation)
  // ADSR envelope fields
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  midiChannel: number; // 1-16, or 0 for "all channels"
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
    dataRate: 50,
    dataSmoothing: 0,
    attack: 0.1,
    decay: 0.2,
    sustain: 0.7,
    release: 0.5,
    midiChannel: 0,
  };
}

/* ── Routes ── */

export type RoutableParam =
  | "frequency"
  | "volume"
  | "pan"
  | "reverbMix"
  | "delayMix"
  | "playbackRate"
  | "pitchShift"
  | "filterFrequency";

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

/* ── Listener Mode ── */

export interface ListenerParam {
  targetId: string;
  parameter: string;
}

/**
 * Sensible, audible default ranges per parameter.
 * Volume stays in -30..0 dB to avoid inaudible silence or clipping.
 * Pan uses full stereo field. Wet mixes stay 0..1.
 */
export function getDefaultRange(param: RoutableParam): { min: number; max: number } {
  switch (param) {
    case "frequency":
      return { min: 200, max: 800 };
    case "volume":
      return { min: -30, max: 0 };
    case "pan":
      return { min: -1, max: 1 };
    case "reverbMix":
      return { min: 0, max: 1 };
    case "delayMix":
      return { min: 0, max: 1 };
    case "playbackRate":
      return { min: 0.5, max: 2 };
    case "pitchShift":
      return { min: -12, max: 12 };
    case "filterFrequency":
      return { min: 20, max: 20000 };
  }
}
