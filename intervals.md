# Intervals
## Notes on the fretboard
### Example: One note over whole fretboard

```fretboard-grid
{
  "id": "intervals-grid-1",
  "rows": 3,
  "cols": 1,
  "width": 600,
  "height": 260,
  "transposable": false,
  "items": [
            { "startFret": 0, "endFret": 13,   "notes": [
            { "fret": 13, "string": 6, "color": "red", "label": "R" },
            { "fret": 1, "string": 6, "color": "red", "label": "R" },
            { "fret": 8, "string": 5, "color": "red", "label": "R" },
            { "fret": 3, "string": 4, "color": "red", "label": "R" },
            { "fret": 10, "string": 3, "color": "red", "label": "R" },
            { "fret": 6, "string": 2, "color": "red", "label": "R" },
            { "fret": 13, "string": 1, "color": "red", "label": "R" },
            { "fret": 1, "string": 1, "color": "red", "label": "R" }
          ], "title": "F" },

            { "startFret": 0, "endFret": 13,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 12, "string": 5, "color": "red", "label": "R" },
            { "fret": 0, "string": 5, "color": "red", "label": "R" },
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 2, "string": 3, "color": "red", "label": "R" },
            { "fret": 10, "string": 2, "color": "red", "label": "R" },
            { "fret": 5, "string": 1, "color": "red", "label": "R" }
        ], "title": "A" },

            { "startFret": 0, "endFret": 13,   "notes": [
            { "fret": 8, "string": 6, "color": "red", "label": "R" },
            { "fret": 3, "string": 5, "color": "red", "label": "R" },
            { "fret": 10, "string": 4, "color": "red", "label": "R" },
            { "fret": 5, "string": 3, "color": "red", "label": "R" },
            { "fret": 1, "string": 2, "color": "red", "label": "R" },
            { "fret": 13, "string": 2, "color": "red", "label": "R" },
            { "fret": 8, "string": 1, "color": "red", "label": "R" }
        ], "title": "C" }
  ]
}
```

### Example: All notes in C Ionian

```fretboard
{
  "startFret": 0,
  "endFret": 12,
  "width": 750,
  "height": 270,
  "transposable": false,
  "notes": [

    { "fret": 10, "string": 6, "color": "red", "label": "R" },
    { "fret": 5, "string": 5, "color": "red", "label": "R" },
    { "fret": 12, "string": 4, "color": "red", "label": "R" },
    { "fret": 7, "string": 3, "color": "red", "label": "R" },
    { "fret": 3, "string": 2, "color": "red", "label": "R" },
    { "fret": 10, "string": 1, "color": "red", "label": "R" },

    { "fret": 8, "string": 6, "color": "red", "label": "R" },
    { "fret": 3, "string": 5, "color": "red", "label": "R" },
    { "fret": 10, "string": 4, "color": "red", "label": "R" },
    { "fret": 5, "string": 3, "color": "red", "label": "R" },
    { "fret": 1, "string": 2, "color": "red", "label": "R" },
    { "fret": 8, "string": 1, "color": "red", "label": "R" },

    { "fret": 7, "string": 6, "color": "blue", "label":  "" },
    { "fret": 2, "string": 5, "color": "blue", "label":  "" },
    { "fret": 9, "string": 4, "color": "blue", "label":  "" },
    { "fret": 4, "string": 3, "color": "blue", "label":  "" },
    { "fret": 12, "string": 2, "color": "blue", "label": "" },
    { "fret": 7, "string": 1, "color": "blue", "label":  "" },

    { "fret": 5, "string": 6, "color": "blue", "label":  "" },
    { "fret": 12, "string": 5, "color": "blue", "label":  "" },
    { "fret": 7, "string": 4, "color": "blue", "label":  "" },
    { "fret": 2, "string": 3, "color": "blue", "label":  "" },
    { "fret": 10, "string": 2, "color": "blue", "label": "" },
    { "fret": 5, "string": 1, "color": "blue", "label":  "" },

    { "fret": 3, "string": 6, "color": "blue", "label":  "" },
    { "fret": 10, "string": 5, "color": "blue", "label":  "" },
    { "fret": 5, "string": 4, "color": "blue", "label":  "" },
    { "fret": 12, "string": 3, "color": "blue", "label":  "" },
    { "fret": 8, "string": 2, "color": "blue", "label": "" },
    { "fret": 3, "string": 1, "color": "blue", "label":  "" },

    { "fret": 1, "string": 6, "color": "blue", "label":  "" },
    { "fret": 8, "string": 5, "color": "blue", "label":  "" },
    { "fret": 3, "string": 4, "color": "blue", "label":  "" },
    { "fret": 10, "string": 3, "color": "blue", "label":  "" },
    { "fret": 6, "string": 2, "color": "blue", "label": "" },
    { "fret": 1, "string": 1, "color": "blue", "label":  "" },

    { "fret": 12, "string": 6, "color": "blue", "label":  "" },
    { "fret": 7, "string": 5, "color": "blue", "label":  "" },
    { "fret": 2, "string": 4, "color": "blue", "label":  "" },
    { "fret": 9, "string": 3, "color": "blue", "label":  "" },
    { "fret": 5, "string": 2, "color": "blue", "label": "" },
    { "fret": 12, "string": 1, "color": "blue", "label":  "" },

    { "fret": 0, "string": 6, "color": "blue", "label":  "" },
    { "fret": 0, "string": 5, "color": "blue", "label":  "" },
    { "fret": 0, "string": 4, "color": "blue", "label":  "" },
    { "fret": 0, "string": 3, "color": "blue", "label":  "" },
    { "fret": 0, "string": 2, "color": "blue", "label": "" },
    { "fret": 0, "string": 1, "color": "blue", "label":  "" }
  ]
}
```

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
            { "fret": 1, "string": 5, "color": "red", "label": "m2" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 11, "string": 2, "color": "red", "label": "m2" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 2, "string": 5, "color": "red", "label": "M2" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 12, "string": 2, "color": "red", "label": "M2" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 3, "string": 5, "color": "red", "label": "m3" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 13, "string": 2, "color": "red", "label": "m3" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 4, "string": 5, "color": "red", "label": "M3" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 14, "string": 2, "color": "red", "label": "M3" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 5, "string": 5, "color": "red", "label": "P4" }
          ], "title": "" },
            { "startFret": 11, "endFret": 17,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 15, "string": 2, "color": "red", "label": "P4" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 6, "string": 5, "color": "red", "label": "m5" }
          ], "title": "" },
            { "startFret": 11, "endFret": 18,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 16, "string": 2, "color": "red", "label": "m5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 1, "string": 4, "color": "red", "label": "m5" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 4, "string": 2, "color": "red", "label": "m5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 7, "string": 5, "color": "red", "label": "P5" }
          ], "title": "" },
            { "startFret": 11, "endFret": 18,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 17, "string": 2, "color": "red", "label": "P5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 2, "string": 4, "color": "red", "label": "P5" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 5, "string": 2, "color": "red", "label": "P5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 8, "string": 5, "color": "red", "label": "A5" }
          ], "title": "" },
            { "startFret": 11, "endFret": 18,   "notes": [
            { "fret": 14, "string": 3, "color": "red", "label": "R" },
            { "fret": 18, "string": 2, "color": "red", "label": "A5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 3, "string": 4, "color": "red", "label": "A5" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 6, "string": 2, "color": "red", "label": "A5" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 4, "string": 4, "color": "red", "label": "6" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 7, "string": 2, "color": "red", "label": "6" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 5, "string": 4, "color": "red", "label": "m7" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 8, "string": 2, "color": "red", "label": "m7" }
          ], "title": "" },

            { "startFret": 1, "endFret": 9,   "notes": [
            { "fret": 5, "string": 6, "color": "red", "label": "R" },
            { "fret": 6, "string": 4, "color": "red", "label": "M7" }
          ], "title": "" },
            { "startFret": 4, "endFret": 10,   "notes": [
            { "fret": 7, "string": 4, "color": "red", "label": "R" },
            { "fret": 9, "string": 2, "color": "red", "label": "M7" }
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

## Intervals within modes:

