import { Slider } from "primereact/slider";
import React from "react";

// default really chill slider atomic component
export function SliderAtom() {
  return (
    <div className="card flex justify-content-center">
      <Slider value={75} />
    </div>
  );
}

export default SliderAtom;
