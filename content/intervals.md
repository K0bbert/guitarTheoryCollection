# Intervals

## Chord construction

**Chords in scale:**

- Minor scale to relative major scale: 3rd note of minor scale because of the overflow over Locrian back to ionian
---------------
- **Major/ Ionian scale:** W W H W W W H
- **Major/ Ionian scale:** Maj Min Min Maj Maj Min Dim
- Same pattern with seventh chords: Maj7 Min7 Min7 Maj7 7 Min7 Min7b5
---------------
- **Minor/ Aeolian scale:** W H W W H W W
- **Minor/ Aeolian scale:** Min Dim Maj Min Min Maj Maj
- Same pattern with seventh chords: Min7 Min7b5 Maj7 Min7 Min7 Maj7 7

**Major Chord:**

- Maj: Root/ Major 3rd/ Perfect 5th *OR* Root/ Major 3rd, on top of that Minor 3rd
- Maj7: Maj Chord as base, and 11 semitones/ one semitone below octave/ Maj third on top of perfect fifth

**Minor Chord:**

- Min: Root/ Minor 3rd/ Perfect 5th *OR* Root/ Minor 3rd, on top of that Major 3rd
- Min7: Min Chord as base, and 10 semitones/ two semitones below octave/ Min third on top of perfect fifth

**Diminished Chord:**
- Dim: Root/ Minor Third/ Dim Fifth (Six instead of 7 semitones) *OR* Root/ Minor 3rd/ Minor 3rd on top of Minor 3rd

- Dim7: Diminished 7th above the root (9 semitones above the root) *OR* again Minor 3rd on top of last Minor 3rd // 3 semitones below octave
    - *Only in harmonic minor scales*

- Min7b5 (*half-diminished*):
    - root + minor third + diminished fifth + minor seventh --> Diminished chord + minor 7th (10 semitones above root)/ two semitones below octave/ Min third on top of diminished fifth
    - ***TODO:*** Can only be constructed from diminshed chords on, meaning that key contains one or none?
    - ***TODO:*** Only in locrian as it is the 1st degree there? What about the other modes?

**Dominant Chord:**
- Dom7th chords: Major Chord base with flat 7th on top/ 2 semitones below octave of root --> 'simple' 7th chords
    - ***TODO:*** How important is Dom 7th? Only in Mixolydian/ for Mixolydian sound?

***TODO:*** **Other Chords:**
- maj7#5: *only harmonic minor*
- minmaj7: *only harmonic minor*

## Intervals on the fretboard

```fretboard-grid
{
  "id": "intervals-grid-2",
  "rows": 15,
  "cols": 2,
  "rowTitles": ["m2", "M2", "m3", "M3", "P4", "m5", "m5", "P5", "P5", "A5", "A5", "6", "m7", "M7", "Octave"],
  "width": 600,
  "height": 260,
  "transposable": true,
  "items": [
            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 1, "string": 5, "color": "blue", "label": "m2" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 11, "string": 2, "color": "blue", "label": "m2" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 2, "string": 5, "color": "blue", "label": "M2" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 12, "string": 2, "color": "blue", "label": "M2" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 3, "string": 5, "color": "blue", "label": "m3" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 13, "string": 2, "color": "blue", "label": "m3" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 4, "string": 5, "color": "blue", "label": "M3" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 14, "string": 2, "color": "blue", "label": "M3" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 5, "string": 5, "color": "blue", "label": "P4" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 15, "string": 2, "color": "blue", "label": "P4" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 6, "string": 5, "color": "blue", "label": "m5" }
          ], "title": "" },
            { "startFret": 11, "endFret": 18,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 16, "string": 2, "color": "blue", "label": "m5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 1, "string": 4, "color": "blue", "label": "m5" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 4, "string": 2, "color": "blue", "label": "m5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 7, "string": 5, "color": "blue", "label": "P5" }
          ], "title": "" },
            { "startFret": 11, "endFret": 18,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 17, "string": 2, "color": "blue", "label": "P5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 2, "string": 4, "color": "blue", "label": "P5" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 5, "string": 2, "color": "blue", "label": "P5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 8, "string": 5, "color": "blue", "label": "A5" }
          ], "title": "" },
            { "startFret": 11, "endFret": 18,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 18, "string": 2, "color": "blue", "label": "A5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 3, "string": 4, "color": "blue", "label": "A5" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 6, "string": 2, "color": "blue", "label": "A5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 4, "string": 4, "color": "blue", "label": "6" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 7, "string": 2, "color": "blue", "label": "6" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 5, "string": 4, "color": "blue", "label": "m7" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 8, "string": 2, "color": "blue", "label": "m7" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 6, "string": 4, "color": "blue", "label": "M7" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 9, "string": 2, "color": "blue", "label": "M7" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 7, "string": 4, "color": "red", "label": "R" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 10, "string": 2, "color": "red", "label": "R" }
          ], "title": "" }
  ]
}
```
