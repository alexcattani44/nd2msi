# ND2MSI

## Overview

ND2MSI (Numerical Data to Meaningful Sonic Information) is a web-based data sonification tool that lets you transform datasets into interactive audio experiences.

## Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, clone the repository:

```bash
git clone https://github.com/alexcattani44/nd2msi.git
```

Run the development server:

```bash
cd nd2msi

# Install dependencies
npm i

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## User Guide

### Basic User Workflow

#### 1. Create a Sound Source

- Click **"+ Add Sound Source"** in the left panel
- Each sound source is a synthesizer with:
  - **Waveform**: Choose between Sine, Square, Sawtooth, or Triangle
  - **Frequency**: Set the pitch (20-2000 Hz)
  - **Volume**: Control loudness (-60 to 0 dB)
  - **Pan**: Position in stereo field (-1 left to +1 right)
  - **Reverb**: Add spatial depth (0-100%)
  - **Delay**: Add echo effect (0-100%)
  - **Delay Time**: Control echo timing (0.01-2 seconds)

#### 2. Create a Modulator

- Click **"+ Add Modulator"** in the right panel
- Choose modulator type:
  - **LFO**: Traditional low-frequency oscillator with adjustable rate and shape
  - **Data-Driven**: Upload your own dataset to drive modulation

#### 3. Upload Data (for Data-Driven Modulators)

- Set modulator type to "Data-Driven"
- Drag and drop a CSV file, or click the upload zone to browse
- The app will parse numeric values and display:
  - Number of data points
  - Value range (min-max)
  - Visual waveform representation

#### 4. Create Routes (Connections)

- Click **"+ Add Route"** in the center panel
- Select:
  - **Modulator**: Which modulator to use
  - **Sound Source**: Which synthesizer to control
  - **Parameter**: What to modulate (Frequency, Volume, Pan, Reverb, or Delay)
  - **Modulation Depth**: How much the modulator affects the parameter (0-100%)

#### 5. Play Your Project

- Click **"PLAY"** in the header to start audio
- Sound sources will play continuously
- Data modulators will affect parameters in real-time
- Click **"STOP"** to halt playback

### Project Management

#### Saving Projects

1. Click **"SAVE PROJECT"** in the header
2. A JSON file will download with all your settings
3. File naming: `nd2msi-project-[timestamp].json`

#### Loading Projects

1. Click **"LOAD PROJECT"** in the header
2. Select a previously saved JSON project file
3. All settings, sources, modulators, and routes will be restored

## Technical Notes

### Browser Compatibility

- **Recommended**: Chrome 90+, Firefox 88+, Edge 90+
- **Required**: Web Audio API support
- **Note**: Safari may require user interaction before audio starts

### Performance

- Large datasets (10,000+ points) may cause performance issues
- Complex routing (50+ connections) may increase CPU usage

### File Formats

- **Projects**: JSON format
- **Data Files**: CSV, JSON, plain text with numeric values
- **Audio**: .wav, .mp3 files for sampler

## Troubleshooting

### No Sound Playing

- Check if browser has autoplay enabled
- Ensure master volume isn't at -60 dB
- Verify sound source volume is above -60 dB
- Check system audio settings

### Data Not Loading

- Ensure file contains numeric values
- Check for proper CSV formatting
- File size should be under 5MB

### Unexpected Modulation

- Check routing connections are correct
- Verify modulation depth isn't too high
- Ensure data range is appropriate
- Try reducing depth to 10-20% first

---

**Version**: 1.0
**Built with**: React, Tone.js
