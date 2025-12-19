# Fretboard Example

This is an example using a fenced `fretboard` code block. The JSON uses 1-based user indices:

- `startFret`: 1-based (e.g., 5 means the 5th fret → internal 4)
- `endFret`: numeric
- `notes`: array of objects with `fret` (0 = open string), `string` (1 = highest string), `color`, and `label`

Here is a sample idea with an inline fretboard:

```fretboard
{
  "startFret": 0,
  "endFret": 10,
  "width": 750,
  "height": 270,
  "notes": [
    { "fret": 0, "string": 1, "color": "blue", "label": "R" },
    { "fret": "X", "string": 2, "color": "red", "label": "" },
    { "fret": 7, "string": 1, "color": "blue", "label": "b3" }
  ]
}
```



More explanatory text can follow this block and the fretboard will appear inline between paragraphs.
test
