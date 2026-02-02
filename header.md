# Notes on the fretboard
## Example: One note over whole fretboard

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

# Testing tabulature

```tabulature
{
  "tuning" : "E A D G B E",
  "content":[
    "|-------10-8--------|------------------------------|",
    "|------------10-----|--10-8-10-8-------------------|",
    "|-7---7-------------|------------9-7---------------|",
    "|-0-----------------|------------------------------|",
    "|-0-----------------|------------------------------|",
    "|-0-----------------|------------------------------|",
    "|-h-wp--w-h.-w.-q---|-----q.-e-qp.-e.-t-t-t--------|",
    "",
    "|---6-----8----------------|",
    "|---5-----7----------------|",
    "|---3-----5--------------3-|",
    "|---3-----5---(0)-2h3-2----|",
    "|---3-----5----------------|",
    "|---3-----5----------------|",
    "|---w--hp-s-------s-s-h--q-|",
    "",
    "|-0-------------------0-------|",
    "|-----------------------------|",
    "|-----------------------------|",
    "|-----------------------------|",
    "|-----------------------------|",
    "|------0--0--0--------------0-|",
    "|-w--wp-h-hp--q-qp-e-ep-s-sp-w-----------|"
  ]
}
```
