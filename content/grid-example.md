# 3x3 Fretboard Grid Example

This example shows a 3x3 grid of fretboards. Each cell can have per-item overrides.

```fretboard-grid
{
  "id": "example-grid",
  "rows": 3,
  "cols": 3,
  "width": 600,
  "height": 260,
  "transposable": false,
  "items": [
    { "startFret": 1, "endFret": 5, "notes": [{"fret": 1, "string": 1, "color": "blue", "label": "R"}], "title": "C Major" },
    { "startFret": 3, "endFret": 7, "notes": [{"fret": 3, "string": 1, "color": "green", "label": "3"}], "title": "D Minor" },
    null,
    { "startFret": 5, "endFret": 9, "notes": [{"fret": 0, "string": 1, "color": "red", "label": "o"}], "title": "E Minor" },
    { "title": "Position 5" },
    { "title": "Position 6" },
    null,
    null,
    null
  ]
}
```

You can edit the above JSON to change per-cell settings. Fret and string values in this JSON are 1-based (fret 0 = open string, string 1 = highest string). The loader converts these to the internal indices automatically.
