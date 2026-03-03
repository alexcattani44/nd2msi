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
