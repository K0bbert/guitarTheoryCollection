# Rhythm Playback Feature

The rhythm playback feature allows you to hear the timing of tablature rhythms with a metronome.

## How It Works

Each tablature that includes rhythm notation (the 7th line with rhythm symbols like `h`, `q`, `e`, etc.) will automatically get playback controls beneath it.

## Controls

- **BPM Input**: Set the tempo (40-240 beats per minute, default: 120)
- **Play Button** (▶): Start playback of the rhythm with metronome
- **Stop Button** (■): Stop the current playback

## Sounds

- **Metronome**:
  - Strong beat (1200 Hz): First beat of each measure
  - Weak beat (800 Hz): Other beats
- **Notes**: 600 Hz beep for each note
- **Rests**: Silent (no beep during pauses/rests)

## Rhythm Symbols Supported

All standard rhythm notation is supported:
- `w` - Whole note (4 beats)
- `h` - Half note (2 beats)
- `q` - Quarter note (1 beat)
- `e` - Eighth note (0.5 beats)
- `s` - Sixteenth note (0.25 beats)
- `f` - 32nd note (0.125 beats)
- `t` - 64th note (0.0625 beats)

Modifiers:
- `.` - Dotted (adds 50% duration, e.g., `h.` = 3 beats)
- `t` suffix - Triplet (2/3 duration, e.g., `et` = triplet eighth)
- `p` suffix - Pause/rest (e.g., `qp` = quarter rest)

## Example

```tabulature
{
  "content": [
    "|---0-2-3-|",
    "|---1-3-5-|",
    "|---0-2-4-|",
    "|---2-4-5-|",
    "|---3-5-6-|",
    "|---3-5-7-|",
    "|-q-e-e-e-|"
  ]
}
```

This will show playback controls below the tablature with:
- One quarter note (1 beat)
- Three eighth notes (0.5 beats each)
- Metronome clicking on each beat

## Browser Compatibility

Uses the Web Audio API, which is supported in all modern browsers (Chrome, Firefox, Safari, Edge).

## Technical Details

The playback feature:
1. Reads rhythm data from the tablature
2. Calculates note durations based on BPM
3. Schedules metronome clicks on each beat
4. Schedules note beeps at the appropriate times
5. All sounds are generated using oscillators (no audio files needed)
