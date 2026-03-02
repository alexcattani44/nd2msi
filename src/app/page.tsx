"use client";

import { KnobAtom } from "@/components/atoms/Knob";
import Image from "next/image";
import React from "react";
import * as Tone from "tone";

// cd web/my-app && npm run build
// cd web/my-app && npm run dev

export default function Home() {
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("csv", file);

    const res = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("File uploaded and sent to Max.");
    } else {
      alert("Upload failed.");
    }
  };

  // TODO: Add tone.js functionality to play sounds based on CSV data
  const playSound = () => {
    // Implementation will go here
    const fmSynth = new Tone.FMSynth().toDestination();
    fmSynth.triggerAttackRelease("C5", "4n");
  };

  // lfo to modulate frequency of sine wave oscillator
  const lfoModulation = () => {
    const osc = new Tone.Oscillator("C4", "square").toDestination();
    const lfo = new Tone.LFO("4n", 300, 400).start();
    lfo.type = "square";
    lfo.connect(osc.frequency);
    osc.start();
    Tone.Transport.start();
  };

  // stop sound
  const stopSound = () => {};
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-3xl sm:text-4xl font-bold items-center">
          BIG WWISE THING HERE
        </h1>
        <img className="items-center" src="/karp-toss.gif" alt="Clauncher" />
        <div>
          <h2>Upload CSV File</h2>
          <input type="file" accept=".csv" onChange={handleFileChange} />
        </div>
        <div className="text-center text-sm text-gray-500 max-w-xs sm:max-w-sm">
          Nice knob
        </div>
        <KnobAtom />
        <button
          onClick={playSound}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Play Sound
        </button>
        <div className="text-center text-sm text-gray-500 max-w-xs sm:max-w-sm">
          Use an LFO to modulate the frequency of a sine wave oscillator.
        </div>
        <button
          onClick={lfoModulation}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Start LFO Modulation
        </button>

        <button
          onClick={stopSound}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Stop Sound
        </button>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
