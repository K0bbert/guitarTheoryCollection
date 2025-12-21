# Visual Guide: How Mode Transformation Works

## Concept Visualization

### Before: Ionian Mode (church-modes-grid-2 default)

```
┌─────────────────────────────────────────────────────────────┐
│  Shape 1: Ionian Pattern                                    │
│  ┌──┬──┬──┬──┬──┬──┐                                       │
│  │R │  │M2│  │M3│  │  ← String 6 (E string)                │
│  └──┴──┴──┴──┴──┴──┘                                       │
│   5  6  7  8  9  10  (frets)                                │
│                                                              │
│  Intervals: R, M2, M3, P4, P5, M6, M7                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Shape 2: Dorian Pattern (showing Ionian intervals)         │
│  ┌──┬──┬──┬──┬──┬──┐                                       │
│  │M2│  │M3│P4│  │  │  ← String 6                           │
│  └──┴──┴──┴──┴──┴──┘                                       │
│   7  8  9  10 11 12                                          │
│                                                              │
│  Intervals: Still showing Ionian intervals                   │
└─────────────────────────────────────────────────────────────┘
```

### After: User Selects "Dorian" from Dropdown

```
┌─────────────────────────────────────────────────────────────┐
│  Shape 1: Ionian Pattern (NOW SHOWING DORIAN INTERVALS)     │
│  ┌──┬──┬──┬──┬──┬──┐                                       │
│  │R │  │M2│  │b3│  │  ← String 6 (SAME frets!)            │
│  └──┴──┴──┴──┴──┴──┘                                       │
│   5  6  7  8  9  10  (frets - NO CHANGE)                    │
│                                                              │
│  Intervals: R, M2, b3, P4, P5, M6, b7 (Dorian formula!)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Shape 2: Dorian Pattern (NOW SHOWING DORIAN INTERVALS)     │
│  ┌──┬──┬──┬──┬──┬──┐                                       │
│  │M2│  │b3│P4│  │  │  ← String 6 (SAME frets!)            │
│  └──┴──┴──┴──┴──┴──┘                                       │
│   7  8  9  10 11 12  (NO CHANGE)                            │
│                                                              │
│  Intervals: Still Dorian, different position                 │
└─────────────────────────────────────────────────────────────┘
```

## Key Insight: The Positions Don't Move!

```
WHAT CHANGES:        WHAT STAYS THE SAME:
┌──────────────┐     ┌──────────────────┐
│ Interval     │     │ Fret numbers     │
│ Labels       │     │ String numbers   │
│              │     │ Shape positions  │
│ M3 → b3      │     │ Note colors      │
│ M7 → b7      │     │ Grid layout      │
│ M6 → (varies)│     │ Root notes (R)   │
└──────────────┘     └──────────────────┘
```

## Transformation Logic

### Example: M3 to Dorian

```
Original (Ionian):
Fret 9, String 6, Label: "M3"
          ↓
    Scale Degree Lookup
          ↓
    M3 = degree 2 (0-indexed)
          ↓
    Dorian Formula Lookup
          ↓
    Dorian[2] = "b3"
          ↓
Transformed (Dorian):
Fret 9, String 6, Label: "b3"
```

## All Seven Modes Side-by-Side

```
Mode        │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │
────────────┼────┼────┼────┼────┼────┼────┼────┤
Ionian      │ R  │ M2 │ M3 │ P4 │ P5 │ M6 │ M7 │ ← Default
Dorian      │ R  │ M2 │ b3 │ P4 │ P5 │ M6 │ b7 │
Phrygian    │ R  │ b2 │ b3 │ P4 │ P5 │ b6 │ b7 │
Lydian      │ R  │ M2 │ M3 │ A4 │ P5 │ M6 │ M7 │
Mixolydian  │ R  │ M2 │ M3 │ P4 │ P5 │ M6 │ b7 │
Aeolian     │ R  │ M2 │ b3 │ P4 │ P5 │ b6 │ b7 │
Locrian     │ R  │ b2 │ b3 │ P4 │ b5 │ b6 │ b7 │
            └────┴────┴────┴────┴────┴────┴────┘
             Scale degrees (constant positions)
```

## Real Example: A Note at Fret 9, String 6

```
When root is A (fret 5, string 6):

Mode        │ Fret 9 Note │ Interval Label │
────────────┼─────────────┼────────────────┤
Ionian      │    C#       │      M3        │
Dorian      │    C        │      b3        │
Phrygian    │    C        │      b3        │
Lydian      │    C#       │      M3        │
Mixolydian  │    C#       │      M3        │
Aeolian     │    C        │      b3        │
Locrian     │    C        │      b3        │
```

## User Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. User opens modes.md page                            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  2. Sees church-modes-grid-2 with Ionian mode           │
│     [Dropdown: Ionian ▼]                                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  3. Clicks dropdown, selects "Dorian"                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  4. JavaScript fires change event                       │
│     → ModeTransformer.updateGridWithMode()              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  5. For each note in each shape:                        │
│     - Keep fret/string position                         │
│     - Transform interval label                          │
│     - Update DOM hidden input                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  6. Recreate all Fretboard instances                    │
│     → Fretboards redraw with new labels                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  7. User sees Dorian mode across whole fretboard!       │
│     All 7 shapes now show Dorian intervals              │
└─────────────────────────────────────────────────────────┘
```

## Code Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│  User Action: Select "Phrygian" from dropdown            │
└────────┬─────────────────────────────────────────────────┘
         ↓
         select.addEventListener('change')
         ↓
┌────────▼──────────────────────────────────────────────────┐
│  updateGridWithMode('church-modes-grid-2', 'Phrygian',    │
│                      originalConfig)                       │
└────────┬──────────────────────────────────────────────────┘
         ↓
┌────────▼──────────────────────────────────────────────────┐
│  generateModeGrid('Phrygian', originalConfig)             │
│  → Creates new config with Phrygian intervals             │
└────────┬──────────────────────────────────────────────────┘
         ↓
┌────────▼──────────────────────────────────────────────────┐
│  For each item in grid:                                   │
│    transformItemToMode(item, 'Phrygian')                  │
└────────┬──────────────────────────────────────────────────┘
         ↓
┌────────▼──────────────────────────────────────────────────┐
│  For each note in item:                                   │
│    convertIntervalToMode(note.label, 'Phrygian')          │
│    • M2 → b2                                              │
│    • M3 → b3                                              │
│    • M6 → b6                                              │
│    • M7 → b7                                              │
└────────┬──────────────────────────────────────────────────┘
         ↓
┌────────▼──────────────────────────────────────────────────┐
│  Update DOM:                                              │
│  • Update hidden input values with new notes JSON         │
│  • Keep fret/string/color unchanged                       │
└────────┬──────────────────────────────────────────────────┘
         ↓
┌────────▼──────────────────────────────────────────────────┐
│  For each SVG element:                                    │
│  • Clear existing SVG content                             │
│  • Create new Fretboard instance with transformed notes   │
└────────┬──────────────────────────────────────────────────┘
         ↓
┌────────▼──────────────────────────────────────────────────┐
│  Result: Phrygian mode displayed across fretboard         │
│  • Same shapes                                            │
│  • Same positions                                         │
│  • Different interval labels                              │
└───────────────────────────────────────────────────────────┘
```

## Why This Approach Works

### The Modal Concept

```
All modes are just the SAME NOTES at different starting points!

C Major Scale Notes:  C  D  E  F  G  A  B
                      │  │  │  │  │  │  │
Starting from C  →    R  M2 M3 P4 P5 M6 M7  (Ionian)
Starting from D  →    R  M2 b3 P4 P5 M6 b7  (Dorian)
Starting from E  →    R  b2 b3 P4 P5 b6 b7  (Phrygian)
```

### Our Implementation Mirrors This

```
Shape positions = Physical notes on fretboard (C, D, E, F, G, A, B)
Interval labels = How we describe them relative to root (R, M2, M3, etc.)

When we change modes:
• Physical notes DON'T move (shapes stay put)
• Labels change (because relationship to root changes)
```

## Musical Example

### A Dorian on Guitar

```
Root A (fret 5, string 6)

Shapes connect across fretboard:

Shape 1  →  Shape 2  →  Shape 3  →  ... →  Shape 7
frets    frets      frets              frets
5-10     7-12       9-14               16-21

ALL showing Dorian intervals: R, M2, b3, P4, P5, M6, b7
Different positions, SAME mode, continuous coverage!
```

## Summary

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  SAME FRETBOARD POSITIONS                          │
│  + DIFFERENT MODE                                  │
│  = DIFFERENT INTERVAL LABELS                       │
│                                                    │
│  This lets you see how to play ANY mode            │
│  across the ENTIRE fretboard!                      │
│                                                    │
└────────────────────────────────────────────────────┘
```
