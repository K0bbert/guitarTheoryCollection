/* mode-transformer.js
   Transforms fretboard diagrams to display any church mode across the whole fretboard
   by adjusting both the interval labels AND fret positions to show the actual notes
   of the selected mode.
*/

(function() {
    'use strict';

    // Define the interval formulas for each church mode (relative to Ionian/Major)
    const MODE_INTERVALS = {
        'Ionian': ['R', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
        'Dorian': ['R', 'M2', 'b3', 'P4', 'P5', 'M6', 'b7'],
        'Phrygian': ['R', 'b2', 'b3', 'P4', 'P5', 'b6', 'b7'],
        'Lydian': ['R', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
        'Mixolydian': ['R', 'M2', 'M3', 'P4', 'P5', 'M6', 'b7'],
        'Aeolian': ['R', 'M2', 'b3', 'P4', 'P5', 'b6', 'b7'],
        'Locrian': ['R', 'b2', 'b3', 'P4', 'b5', 'b6', 'b7']
    };

    // Map intervals to semitones from root
    const INTERVAL_TO_SEMITONES = {
        'R': 0,
        'b2': 1,
        'M2': 2,
        'b3': 3,
        'M3': 4,
        'P4': 5,
        'A4': 6,
        'b5': 6,
        'P5': 7,
        'b6': 8,
        'M6': 9,
        'b7': 10,
        'M7': 11
    };

    // Map to convert Ionian intervals to scale degree indices (0-6)
    const IONIAN_TO_DEGREE = {
        'R': 0,
        'M2': 1,
        'M3': 2,
        'P4': 3,
        'P5': 4,
        'M6': 5,
        'M7': 6
    };

    /**
     * Converts an interval label from Ionian to the target mode
     * @param {string} ionianLabel - The interval label in Ionian mode (e.g., 'M2', 'M3')
     * @param {string} targetMode - The target mode name (e.g., 'Dorian', 'Phrygian')
     * @returns {string} The converted interval label for the target mode
     */
    function convertIntervalToMode(ionianLabel, targetMode) {
        // Get the scale degree (0-6) from the Ionian label
        const degree = IONIAN_TO_DEGREE[ionianLabel];

        if (degree === undefined) {
            console.warn(`Unknown interval label: ${ionianLabel}`);
            return ionianLabel;
        }

        // Get the corresponding interval in the target mode
        const targetIntervals = MODE_INTERVALS[targetMode];
        if (!targetIntervals) {
            console.warn(`Unknown mode: ${targetMode}`);
            return ionianLabel;
        }

        return targetIntervals[degree];
    }

    /**
     * Transforms a single fretboard grid item from Ionian to the target mode
     * This adjusts BOTH the interval labels AND the fret positions
     * @param {Object} item - The grid item with notes array
     * @param {string} targetMode - The target mode name
     * @returns {Object} A new item with transformed notes (both labels and fret positions)
     */
    function transformItemToMode(item, targetMode) {
        if (!item || !item.notes) return item;
        if (targetMode === 'Ionian') return item; // No transformation needed

        // Deep copy the item
        const newItem = JSON.parse(JSON.stringify(item));

        // Transform each note's label AND fret position
        newItem.notes = newItem.notes.map(note => {
            if (!note.label || !IONIAN_TO_DEGREE.hasOwnProperty(note.label)) {
                return note;
            }

            // Get the scale degree and find the interval in the target mode
            const degree = IONIAN_TO_DEGREE[note.label];
            const newLabel = MODE_INTERVALS[targetMode][degree];

            // Calculate the semitone difference
            const ionianSemitones = INTERVAL_TO_SEMITONES[note.label];
            const targetSemitones = INTERVAL_TO_SEMITONES[newLabel];
            const fretAdjustment = targetSemitones - ionianSemitones;

            // Adjust the fret position
            const newFret = note.fret + fretAdjustment;

            return {
                ...note,
                fret: newFret,
                label: newLabel
            };
        });

        return newItem;
    }

    /**
     * Generates the full fretboard grid configuration for any church mode
     * @param {string} selectedMode - The mode to display (e.g., 'Dorian', 'Phrygian')
     * @param {Object} originalGrid - The original church-modes-grid-2 configuration
     * @returns {Object} New grid configuration with the selected mode applied
     */
    function generateModeGrid(selectedMode, originalGrid) {
        if (!originalGrid || !originalGrid.items) {
            console.error('Invalid grid configuration');
            return originalGrid;
        }

        // Create a new grid configuration
        const newGrid = {
            ...originalGrid,
            items: originalGrid.items.map(item =>
                transformItemToMode(item, selectedMode)
            )
        };

        // Update the ID to reflect the selected mode
        newGrid.id = `church-modes-grid-${selectedMode.toLowerCase()}`;

        return newGrid;
    }

    /**
     * Re-renders a fretboard grid with the selected mode
     * @param {string} gridId - The ID of the grid container to update
     * @param {string} selectedMode - The mode to display
     * @param {Object} originalGridConfig - The original grid configuration
     */
    function updateGridWithMode(gridId, selectedMode, originalGridConfig) {
        console.log(`[ModeTransformer] Updating grid ${gridId} to ${selectedMode} mode`);

        const container = document.getElementById(gridId);
        if (!container) {
            console.error(`Grid container not found: ${gridId}`);
            return;
        }

        // Generate the new grid configuration
        const newGridConfig = generateModeGrid(selectedMode, originalGridConfig);
        console.log(`[ModeTransformer] Generated config for ${selectedMode} with ${newGridConfig.items?.length || 0} items`);

        // Update all the hidden inputs with new note data
        const total = newGridConfig.items ? newGridConfig.items.length : 0;

        for (let i = 0; i < total; i++) {
            const item = newGridConfig.items[i];
            const idx = i + 1;
            const notesInput = document.getElementById(`${gridId}-fb-${idx}-notes`);

            if (notesInput && item && item.notes) {
                // Update the notes JSON
                notesInput.value = JSON.stringify(item.notes);
            }
        }

        // Find and update all existing fretboard instances
        let updatedCount = 0;
        for (let i = 1; i <= total; i++) {
            const svgEl = document.getElementById(`${gridId}-fb-${i}`);
            if (!svgEl) {
                console.warn(`[ModeTransformer] SVG element not found: ${gridId}-fb-${i}`);
                continue;
            }

            const notesInput = document.getElementById(`${gridId}-fb-${i}-notes`);
            const startInput = document.getElementById(`${gridId}-fb-${i}-start-fret`);
            const endInput = document.getElementById(`${gridId}-fb-${i}-end-fret`);
            const transposableInput = document.getElementById(`${gridId}-fb-${i}-transposable`);

            if (!notesInput || !notesInput.value) {
                console.warn(`[ModeTransformer] Notes input not found for ${gridId}-fb-${i}`);
                continue;
            }

            // Parse the updated notes
            let notesArg = [];
            try {
                const parsed = JSON.parse(notesInput.value);
                if (Array.isArray(parsed)) {
                    // Convert user-supplied notes to internal format
                    if (window.convertUserNotes) {
                        notesArg = window.convertUserNotes(parsed);
                    } else {
                        console.warn('[ModeTransformer] convertUserNotes not available, using raw notes');
                        notesArg = parsed;
                    }
                }
            } catch (e) {
                console.error(`[ModeTransformer] Failed to parse notes for ${gridId}-fb-${i}:`, e);
                continue;
            }

            // Get start/end fret values
            let startArg = 0;
            if (startInput && startInput.value) {
                const v = parseInt(startInput.value);
                if (!isNaN(v)) startArg = Math.max(0, v - 1);
            }

            let endArg = 4;
            if (endInput && endInput.value) {
                const v = parseInt(endInput.value);
                if (!isNaN(v)) endArg = v;
            }

            // Check if transposable
            let transposable = true;
            if (transposableInput && transposableInput.value) {
                transposable = transposableInput.value === 'true';
            } else if (container.dataset.transposable) {
                transposable = container.dataset.transposable === 'true';
            }

            // Clear and recreate the fretboard
            svgEl.innerHTML = '';

            try {
                new Fretboard({
                    svg: svgEl,
                    startFret: startArg,
                    endFret: endArg,
                    notes: notesArg,
                    transposable: transposable
                });
                updatedCount++;
            } catch (e) {
                console.error(`[ModeTransformer] Failed to create fretboard for ${gridId}-fb-${i}:`, e);
            }
        }

        console.log(`[ModeTransformer] Successfully updated ${updatedCount} of ${total} fretboards`);
    }

    /**
     * Adds a mode selector dropdown to a grid
     * @param {string} gridId - The ID of the grid container
     * @param {Object} originalGridConfig - The original grid configuration
     */
    function addModeSelector(gridId, originalGridConfig) {
        const container = document.getElementById(gridId);
        if (!container) {
            console.error(`Grid container not found: ${gridId}`);
            return;
        }

        // Check if selector already exists
        if (container.querySelector('.mode-selector')) {
            return;
        }

        // Create dropdown container
        const selectorDiv = document.createElement('div');
        selectorDiv.className = 'mode-selector';
        selectorDiv.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;';

        // Create label
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; flex-direction: column; gap: 8px; font-weight: 600;';
        label.innerHTML = '<span>Select Church Mode:</span>';

        // Create dropdown
        const select = document.createElement('select');
        select.style.cssText = 'padding: 10px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; font-size: 14px;';

        // Add mode options
        const modes = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
        modes.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = mode + (mode === 'Ionian' ? ' (Major)' : mode === 'Aeolian' ? ' (Natural Minor)' : '');
            if (mode === 'Ionian') {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Add change event listener
        select.addEventListener('change', function() {
            updateGridWithMode(gridId, this.value, originalGridConfig);
        });

        label.appendChild(select);
        selectorDiv.appendChild(label);

        // Insert at the beginning of the container
        container.insertBefore(selectorDiv, container.firstChild);
    }

    /**
     * Initialize mode transformation for a specific grid
     * @param {string} gridId - The ID of the grid to enable mode transformation for
     * @param {Object} gridConfig - The original grid configuration (Ionian-based)
     */
    function initModeTransformation(gridId, gridConfig) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                addModeSelector(gridId, gridConfig);
            });
        } else {
            addModeSelector(gridId, gridConfig);
        }
    }

    // Expose functions to window
    window.ModeTransformer = {
        convertIntervalToMode,
        transformItemToMode,
        generateModeGrid,
        updateGridWithMode,
        addModeSelector,
        initModeTransformation,
        MODE_INTERVALS
    };

})();
