import { Knob } from "primereact/knob";
import React from "react";

// default really chill knob atomic component
export function KnobAtom() {
  return (
    <div className="card flex justify-content-center">
      <Knob value={75} />
    </div>
  );
}
