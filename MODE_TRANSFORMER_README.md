# Church Mode Transformer - Usage Guide

## Overview

The Mode Transformer is a JavaScript module that allows you to dynamically display any of the seven church modes (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian) across the entire guitar fretboard. It transforms interval labels in real-time based on the selected mode.

## Features

- **Dynamic Mode Selection**: Choose any church mode via dropdown menu
- **Automatic Interval Transformation**: Converts interval labels (R, M2, M3, etc.) based on the selected mode
- **Consistent Fretboard Positions**: Shape positions remain the same; only interval labels change
- **Fully Integrated**: Works with existing transposition and labeling controls

## How It Works

### The Concept

In `church-modes-grid-2`, you defined the Ionian mode across the entire fretboard using seven different shapes. Each shape shows Ionian intervals (R, M2, M3, P4, P5, M6, M7) at different fretboard positions.

When you select a different mode (e.g., Dorian), the transformer:
1. Keeps all fret positions exactly the same
2. Transforms the interval labels to match the selected mode's formula
3. Re-renders the fretboard diagrams with the new labels

### Mode Formulas

Each mode has a unique interval formula:

- **Ionian** (Major): R, M2, M3, P4, P5, M6, M7
- **Dorian**: R, M2, b3, P4, P5, M6, b7
- **Phrygian**: R, b2, b3, P4, P5, b6, b7
- **Lydian**: R, M2, M3, A4, P5, M6, M7
- **Mixolydian**: R, M2, M3, P4, P5, M6, b7
- **Aeolian** (Natural Minor): R, M2, b3, P4, P5, b6, b7
- **Locrian**: R, b2, b3, P4, b5, b6, b7

## Usage

### In Your Main Application (modes.md)

The mode selector is automatically added to `church-modes-grid-2` when you load the modes.md page. Simply:

1. Navigate to the Modes section
2. Scroll to the "Shapes applied for same key" section
3. Use the dropdown to select your desired mode
4. Watch the fretboard diagrams update automatically

### Testing with the Demo Page

Open `mode-demo.html` in your browser to test the functionality in isolation:

```bash
# Just open the file in your browser
open mode-demo.html  # macOS
start mode-demo.html  # Windows
```

## JavaScript API

### Core Functions

```javascript
// Generate a new grid configuration for a specific mode
const dorianGrid = ModeTransformer.generateModeGrid('Dorian', originalConfig);

// Update an existing grid to display a different mode
ModeTransformer.updateGridWithMode('church-modes-grid-2', 'Phrygian', originalConfig);

// Add a mode selector dropdown to a grid
ModeTransformer.addModeSelector('church-modes-grid-2', originalConfig);

// Convert a single interval from Ionian to another mode
const dorianThird = ModeTransformer.convertIntervalToMode('M3', 'Dorian'); // Returns 'b3'
```

### Manual Initialization

If you need to manually initialize the mode transformer for a custom grid:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Ensure the grid config is stored
    window.fretboardGridConfigs = window.fretboardGridConfigs || {};
    window.fretboardGridConfigs['my-grid-id'] = myGridConfiguration;
    
    // Add the mode selector
    if (window.ModeTransformer) {
        ModeTransformer.addModeSelector('my-grid-id', myGridConfiguration);
    }
});
```

## Technical Details

### File Structure

- **mode-transformer.js**: Core transformation logic
- **fretboard-grid.js**: Modified to store original grid configurations
- **md-loader.js**: Modified to auto-initialize mode selector for modes.md
- **mode-demo.html**: Standalone demo page

### How Transformation Works

1. **Storage**: When a grid is created from markdown, its original configuration is stored in `window.fretboardGridConfigs[gridId]`

2. **Mode Selection**: When user selects a mode, `updateGridWithMode()` is called

3. **Interval Mapping**: Each Ionian interval is mapped to its scale degree (0-6):
   - R → 0, M2 → 1, M3 → 2, P4 → 3, P5 → 4, M6 → 5, M7 → 6

4. **Transformation**: The scale degree is used to look up the corresponding interval in the target mode

5. **Re-rendering**: All fretboard instances are recreated with the new interval labels

### Data Flow

```
Original Config (Ionian)
    ↓
generateModeGrid(selectedMode)
    ↓
Transform each note's label
    ↓
Update hidden inputs in DOM
    ↓
Recreate Fretboard instances
    ↓
Display updated diagrams
```

## Customization

### Adding Custom Modes

You can extend the system with custom modes by modifying the `MODE_INTERVALS` object in mode-transformer.js:

```javascript
const MODE_INTERVALS = {
    'Ionian': ['R', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
    'Dorian': ['R', 'M2', 'b3', 'P4', 'P5', 'M6', 'b7'],
    // ... existing modes ...
    'MyCustomMode': ['R', 'b2', 'M3', 'P4', 'b5', 'M6', 'b7']
};
```

Then update the dropdown options in `addModeSelector()`.

### Styling the Mode Selector

The mode selector uses these CSS classes:
- `.mode-selector`: Container div
- Inline styles are applied by default, but you can override them in your CSS

## Troubleshooting

### Mode selector doesn't appear
- Check that `mode-transformer.js` is loaded before `md-loader.js`
- Verify the grid ID matches exactly: `church-modes-grid-2`
- Check browser console for errors

### Intervals don't update
- Ensure the Fretboard instances are being recreated (check console)
- Verify that `window.convertUserNotes` exists (defined in fretboard-grid.js)
- Check that the original config is stored in `window.fretboardGridConfigs`

### Position issues after transformation
- The transformation should never change fret positions, only labels
- If positions change, there's likely an issue with the config storage

## Example Code

Here's a complete example of setting up a custom mode grid:

```javascript
const myModeGrid = {
    "id": "my-mode-grid",
    "rows": 7,
    "cols": 1,
    "transposable": true,
    "items": [
        {
            "startFret": 0,
            "endFret": 12,
            "notes": [
                {"fret": 5, "string": 6, "color": "red", "label": "R"},
                {"fret": 7, "string": 6, "color": "blue", "label": "M2"},
                // ... more notes ...
            ],
            "title": "Shape 1"
        },
        // ... more shapes ...
    ]
};

// Store the config
window.fretboardGridConfigs['my-mode-grid'] = myModeGrid;

// Add mode selector after grid is initialized
setTimeout(() => {
    ModeTransformer.addModeSelector('my-mode-grid', myModeGrid);
}, 100);
```

## Browser Compatibility

The Mode Transformer works in all modern browsers that support:
- ES6 JavaScript (arrow functions, const/let, spread operator)
- DOM manipulation APIs
- JSON parse/stringify

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

Potential improvements:
- Harmonic/Melodic minor modes
- Exotic scales (harmonic major, Hungarian minor, etc.)
- Save mode preferences to localStorage
- Animate transitions between modes
- Show mode relationships visually
