/* harmonic-minor-mode-transformer.js
   Transforms fretboard diagrams to display any harmonic minor mode across the whole fretboard
   by adjusting both the interval labels AND fret positions to show the actual notes
   of the selected mode.
*/

(function() {
    'use strict';

    // Define the interval formulas for each harmonic minor mode
    const HARMONIC_MINOR_MODE_INTERVALS = {
        'Harmonic Minor': ['R', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
        'Locrian ♮6': ['R', 'm2', 'm3', 'P4', 'd5', 'M6', 'm7'],
        'Ionian #5': ['R', 'M2', 'M3', 'P4', 'A5', 'M6', 'M7'],
        'Dorian #4': ['R', 'M2', 'm3', 'A4', 'P5', 'M6', 'm7'],
        'Phrygian Dominant': ['R', 'm2', 'M3', 'P4', 'P5', 'm6', 'm7'],
        'Lydian #2': ['R', 'A2', 'M3', 'A4', 'P5', 'M6', 'M7'],
        'Super Locrian': ['R', 'm2', 'm3', 'd4', 'd5', 'm6', 'm7']
    };

    // Map intervals to semitones from root
    const INTERVAL_TO_SEMITONES = {
        'R': 0,
        'm2': 1,
        'M2': 2,
        'A2': 3,
        'm3': 3,
        'M3': 4,
        'd4': 4,
        'P4': 5,
        'A4': 6,
        'd5': 6,
        'P5': 7,
        'A5': 8,
        'm6': 8,
        'M6': 9,
        'm7': 10,
        'M7': 11
    };

    // Map to convert Harmonic Minor intervals to scale degree indices (0-6)
    const HARMONIC_MINOR_TO_DEGREE = {
        'R': 0,
        'M2': 1,
        'm3': 2,
        'P4': 3,
        'P5': 4,
        'm6': 5,
        'M7': 6
    };

    /**
     * Converts an interval label from Harmonic Minor to the target mode
     * @param {string} harmonicMinorLabel - The interval label in Harmonic Minor mode
     * @param {string} targetMode - The target mode name
     * @returns {string} The converted interval label for the target mode
     */
    function convertIntervalToHarmonicMinorMode(harmonicMinorLabel, targetMode) {
        // Get the scale degree (0-6) from the Harmonic Minor label
        const degree = HARMONIC_MINOR_TO_DEGREE[harmonicMinorLabel];

        if (degree === undefined) {
            console.warn(`Unknown interval label: ${harmonicMinorLabel}`);
            return harmonicMinorLabel;
        }

        // Get the corresponding interval in the target mode
        const targetIntervals = HARMONIC_MINOR_MODE_INTERVALS[targetMode];
        if (!targetIntervals) {
            console.warn(`Unknown harmonic minor mode: ${targetMode}`);
            return harmonicMinorLabel;
        }

        return targetIntervals[degree];
    }

    /**
     * Transforms a single fretboard grid item from Harmonic Minor to the target mode
     * @param {Object} item - The grid item with notes array
     * @param {string} targetMode - The target mode name
     * @param {number} shapeIndex - The index of this shape (0-6)
     * @returns {Object} A new item with transformed notes
     */
    function transformItemToHarmonicMinorMode(item, targetMode, shapeIndex) {
        if (!item || !item.notes) return item;
        if (targetMode === 'Harmonic Minor' && shapeIndex === undefined) return item;

        // Deep copy the item
        const newItem = JSON.parse(JSON.stringify(item));

        // Update the title if needed
        if (shapeIndex !== undefined) {
            const modeNames = [
                'Harmonic Minor',
                'Locrian ♮6',
                'Ionian #5',
                'Dorian #4',
                'Phrygian Dominant',
                'Lydian #2',
                'Super Locrian'
            ];
            const targetModeIndex = modeNames.indexOf(targetMode);

            if (targetModeIndex !== -1) {
                // The shape pattern stays the same, but we need to show what mode it's actually playing
                const actualModeIndex = (targetModeIndex + shapeIndex) % 7;
                const actualModeName = modeNames[actualModeIndex];

                // Update the title
                if (actualModeName === 'Harmonic Minor') {
                    newItem.title = '(Close to Aeolian/ Natural Minor Shape)';
                } else if (actualModeName === 'Locrian ♮6') {
                    newItem.title = '(Close to Locrian Shape)';
                } else if (actualModeName === 'Ionian #5') {
                    newItem.title = '(Close to Ionian/ Major Shape)';
                } else if (actualModeName === 'Dorian #4') {
                    newItem.title = '(Close to Dorian Shape)';
                } else if (actualModeName === 'Phrygian Dominant') {
                    newItem.title = '(Close to Phrygian Shape)';
                } else if (actualModeName === 'Lydian #2') {
                    newItem.title = '(Close to Lydian Shape)';
                } else if (actualModeName === 'Super Locrian') {
                    newItem.title = '(Close to Mixolydian Shape)';
                }
            }
        }

        // Transform each note's label AND fret position
        newItem.notes = newItem.notes.map(note => {
            if (!note.label || !HARMONIC_MINOR_TO_DEGREE.hasOwnProperty(note.label)) {
                return note;
            }

            // Get the scale degree and find the interval in the target mode
            const degree = HARMONIC_MINOR_TO_DEGREE[note.label];
            const newLabel = HARMONIC_MINOR_MODE_INTERVALS[targetMode][degree];

            // Calculate the semitone difference
            const harmonicMinorSemitones = INTERVAL_TO_SEMITONES[note.label];
            const targetSemitones = INTERVAL_TO_SEMITONES[newLabel];
            const fretAdjustment = targetSemitones - harmonicMinorSemitones;

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
     * Generates the full fretboard grid configuration for any harmonic minor mode
     * @param {string} selectedMode - The mode to display
     * @param {Object} originalGrid - The original harmonic-minor-modes-grid-2 configuration
     * @returns {Object} New grid configuration with the selected mode applied
     */
    function generateHarmonicMinorModeGrid(selectedMode, originalGrid) {
        if (!originalGrid || !originalGrid.items) {
            console.error('Invalid grid configuration');
            return originalGrid;
        }

        // Create a new grid configuration
        const newGrid = {
            ...originalGrid,
            items: originalGrid.items.map((item, index) =>
                transformItemToHarmonicMinorMode(item, selectedMode, index)
            )
        };

        // Update the ID to reflect the selected mode
        const modeSlug = selectedMode.toLowerCase().replace(/[♮#\s]/g, '-');
        newGrid.id = `harmonic-minor-modes-grid-${modeSlug}`;

        return newGrid;
    }

    /**
     * Re-renders a fretboard grid with the selected harmonic minor mode
     * @param {string} gridId - The ID of the grid container to update
     * @param {string} selectedMode - The mode to display
     * @param {Object} originalGridConfig - The original grid configuration
     */
    function updateGridWithHarmonicMinorMode(gridId, selectedMode, originalGridConfig) {
        console.log(`[HarmonicMinorModeTransformer] Updating grid ${gridId} to ${selectedMode} mode`);

        const container = document.getElementById(gridId);
        if (!container) {
            console.error(`Grid container not found: ${gridId}`);
            return;
        }

        // Generate the new grid configuration
        const newGridConfig = generateHarmonicMinorModeGrid(selectedMode, originalGridConfig);
        console.log(`[HarmonicMinorModeTransformer] Generated config for ${selectedMode} with ${newGridConfig.items?.length || 0} items`);

        // Update all the hidden inputs with new note data AND titles
        const total = newGridConfig.items ? newGridConfig.items.length : 0;

        for (let i = 0; i < total; i++) {
            const item = newGridConfig.items[i];
            const idx = i + 1;
            const notesInput = document.getElementById(`${gridId}-fb-${idx}-notes`);
            const titleInput = document.getElementById(`${gridId}-fb-${idx}-title`);
            const labelEl = document.getElementById(`${gridId}-fb-${idx}-label`);

            if (notesInput && item && item.notes) {
                // Update the notes JSON
                notesInput.value = JSON.stringify(item.notes);
            }

            if (item && item.title) {
                // Update the title in hidden input
                if (titleInput) {
                    titleInput.value = item.title;
                }
                // Update the visible label
                if (labelEl) {
                    labelEl.textContent = item.title;
                }
            }
        }

        // Find and update all existing fretboard instances
        let updatedCount = 0;
        for (let i = 1; i <= total; i++) {
            const svgEl = document.getElementById(`${gridId}-fb-${i}`);
            if (!svgEl) {
                console.warn(`[HarmonicMinorModeTransformer] SVG element not found: ${gridId}-fb-${i}`);
                continue;
            }

            const notesInput = document.getElementById(`${gridId}-fb-${i}-notes`);
            const startInput = document.getElementById(`${gridId}-fb-${i}-start-fret`);
            const endInput = document.getElementById(`${gridId}-fb-${i}-end-fret`);
            const transposableInput = document.getElementById(`${gridId}-fb-${i}-transposable`);

            if (!notesInput || !notesInput.value) {
                console.warn(`[HarmonicMinorModeTransformer] Notes input not found for ${gridId}-fb-${i}`);
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
                        console.warn('[HarmonicMinorModeTransformer] convertUserNotes not available, using raw notes');
                        notesArg = parsed;
                    }
                }
            } catch (e) {
                console.error(`[HarmonicMinorModeTransformer] Failed to parse notes for ${gridId}-fb-${i}:`, e);
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
                console.error(`[HarmonicMinorModeTransformer] Failed to create fretboard for ${gridId}-fb-${i}:`, e);
            }
        }

        console.log(`[HarmonicMinorModeTransformer] Successfully updated ${updatedCount} of ${total} fretboards`);
    }

    /**
     * Adds a harmonic minor mode selector dropdown to a grid
     * @param {string} gridId - The ID of the grid container
     * @param {Object} originalGridConfig - The original grid configuration
     */
    function addHarmonicMinorModeSelector(gridId, originalGridConfig) {
        const container = document.getElementById(gridId);
        if (!container) {
            console.error(`Grid container not found: ${gridId}`);
            return;
        }

        // Check if selector already exists
        if (container.querySelector('.harmonic-minor-mode-selector')) {
            return;
        }

        // Create dropdown container
        const selectorDiv = document.createElement('div');
        selectorDiv.className = 'harmonic-minor-mode-selector';
        selectorDiv.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;';

        // Create label
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; flex-direction: column; gap: 8px; font-weight: 600;';
        label.innerHTML = '<span>Select Harmonic Minor Mode:</span>';

        // Create dropdown
        const select = document.createElement('select');
        select.style.cssText = 'padding: 10px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; font-size: 14px;';

        // Add mode options
        const modes = [
            'Harmonic Minor',
            'Locrian ♮6',
            'Ionian #5',
            'Dorian #4',
            'Phrygian Dominant',
            'Lydian #2',
            'Super Locrian'
        ];

        modes.forEach(mode => {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = mode;
            if (mode === 'Harmonic Minor') {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Add change event listener
        select.addEventListener('change', function() {
            console.log(`[HarmonicMinorModeTransformer] Dropdown changed to: ${this.value}`);
            console.log(`[HarmonicMinorModeTransformer] Original config:`, originalGridConfig);
            try {
                updateGridWithHarmonicMinorMode(gridId, this.value, originalGridConfig);
            } catch (e) {
                console.error(`[HarmonicMinorModeTransformer] Error in updateGridWithHarmonicMinorMode:`, e);
            }
        });

        label.appendChild(select);
        selectorDiv.appendChild(label);

        // Insert at the beginning of the container
        container.insertBefore(selectorDiv, container.firstChild);
    }

    /**
     * Initialize harmonic minor mode transformation for a specific grid
     * @param {string} gridId - The ID of the grid to enable mode transformation for
     * @param {Object} gridConfig - The original grid configuration (Harmonic Minor-based)
     */
    function initHarmonicMinorModeTransformation(gridId, gridConfig) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                addHarmonicMinorModeSelector(gridId, gridConfig);
            });
        } else {
            addHarmonicMinorModeSelector(gridId, gridConfig);
        }
    }

    // Expose functions to window
    window.HarmonicMinorModeTransformer = {
        convertIntervalToHarmonicMinorMode,
        transformItemToHarmonicMinorMode,
        generateHarmonicMinorModeGrid,
        updateGridWithHarmonicMinorMode,
        addHarmonicMinorModeSelector,
        initHarmonicMinorModeTransformation,
        HARMONIC_MINOR_MODE_INTERVALS
    };

})();
