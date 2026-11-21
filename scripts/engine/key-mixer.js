/* key-mixer.js
   Implements the "Mixing 2 Keys" feature to compare two modes/keys
   and show common notes between them.
   
   Musical Theory:
   - Each mode is defined by its intervals from the root (pitch classes 0-11)
   - Comparing two modes means finding which pitch classes they share
   - Shared pitch classes are shown in green, unique in blue/red
*/

(function () {
    'use strict';

    const MODE_INTERVALS = {
        'Ionian': [0, 2, 4, 5, 7, 9, 11],
        'Dorian': [0, 2, 3, 5, 7, 9, 10],
        'Phrygian': [0, 1, 3, 5, 7, 8, 10],
        'Lydian': [0, 2, 4, 6, 7, 9, 11],
        'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
        'Aeolian': [0, 2, 3, 5, 7, 8, 10],
        'Locrian': [0, 1, 3, 5, 6, 8, 10]
    };

    const NOTE_NAMES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
    const NOTE_NAMES_FLAT = ['E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb'];

    const NOTE_INDEX_BY_NAME = {
        'C': 8, 'B#': 8,
        'C#': 9, 'Db': 9,
        'D': 10,
        'D#': 11, 'Eb': 11,
        'E': 0, 'Fb': 0,
        'E#': 1,
        'F': 1,
        'F#': 2, 'Gb': 2,
        'G': 3,
        'G#': 4, 'Ab': 4,
        'A': 5,
        'A#': 6, 'Bb': 6,
        'B': 7, 'Cb': 7,
    };

    // Guitar standard tuning: E A D G B E (pitch classes)
    // But visual display is HIGH to LOW (top to bottom on screen)
    // So we need: E B G D A E (high to low)
    const GUITAR_TUNING = [0, 7, 3, 10, 5, 0]; // E, B, G, D, A, E (high E to low E visually)

    /**
     * Gets pitch class (0-11) for a note name
     */
    function getPitchClass(noteName) {
        if (!noteName) return null;
        const normalized = noteName.toString().trim().replace(/♯/g, '#').replace(/♭/g, 'b');
        return NOTE_INDEX_BY_NAME[normalized] !== undefined ? NOTE_INDEX_BY_NAME[normalized] : null;
    }

    /**
     * Gets the pitch classes for a given root and mode
     */
    function getModePitchClasses(rootNote, modeName) {
        const rootPitch = getPitchClass(rootNote);
        if (rootPitch === null || !MODE_INTERVALS[modeName]) {
            return [];
        }
        return MODE_INTERVALS[modeName].map(interval => (rootPitch + interval) % 12);
    }

    /**
     * Gets common pitch classes between two modes
     */
    function getCommonPitchClasses(pitchClasses1, pitchClasses2) {
        return pitchClasses1.filter(pc => pitchClasses2.includes(pc));
    }

    /**
     * Gets unique pitch classes in first scale but not in second
     */
    function getUniquePitchClasses(pitchClasses1, pitchClasses2) {
        return pitchClasses1.filter(pc => !pitchClasses2.includes(pc));
    }

    /**
     * Creates a fretboard configuration for the mixer
     * Shows first key in blue, second key in red, common in green
     */
    function createMixerFretboard(rootNote1, mode1, rootNote2, mode2, startFret, endFret) {
        const pc1 = getModePitchClasses(rootNote1, mode1);
        const pc2 = getModePitchClasses(rootNote2, mode2);
        const common = getCommonPitchClasses(pc1, pc2);

        // Create notes array by scanning all frets on all strings
        const notes = [];
        const stringCount = GUITAR_TUNING.length;

        for (let string = 0; string < stringCount; string++) {
            const openStringPitch = GUITAR_TUNING[string];

            // Add the open string (fret -1) when the displayed window includes it.
            if (startFret <= 0) {
                let openColor = 'transparent';
                let openLabel = '';

                if (common.includes(openStringPitch)) {
                    openColor = 'green';
                    openLabel = 'C';
                } else if (pc1.includes(openStringPitch)) {
                    openColor = 'blue';
                    openLabel = '1';
                } else if (pc2.includes(openStringPitch)) {
                    openColor = 'red';
                    openLabel = '2';
                }

                if (openColor !== 'transparent') {
                    notes.push({
                        fret: -1,
                        string: string,
                        color: openColor,
                        label: openLabel
                    });
                }
            }

            for (let fret = startFret; fret < endFret; fret++) {
                // DOM fret 0 is the first physical fret, not the open string.
                const notePitch = (openStringPitch + fret + 1) % 12;
                
                // Determine color and label
                let color = 'transparent';
                let label = '';
                
                if (common.includes(notePitch)) {
                    color = 'green';
                    label = 'C';
                } else if (pc1.includes(notePitch)) {
                    color = 'blue';
                    label = '1';
                } else if (pc2.includes(notePitch)) {
                    color = 'red';
                    label = '2';
                }

                // Only add notes that are in one of the scales
                if (color !== 'transparent') {
                    notes.push({
                        fret: fret,
                        string: string,
                        color: color,
                        label: label
                    });
                }
            }
        }

        return {
            id: 'key-mixer-fretboard',
            startFret: startFret + 1,  // Convert to 1-based for display
            endFret: endFret,
            width: 800,
            height: 350,
            notes: notes,
            transposable: false,
            title: `${rootNote1} ${mode1} (blue) + ${rootNote2} ${mode2} (red), Common (green)`
        };
    }

    /**
     * Renders the mixer fretboard on the page
     */
    function renderMixerFretboard(containerId, fretboardConfig) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        // Clear previous content
        container.innerHTML = '';

        // Create the SVG and wrapper
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'fretboard-embed-scroll-wrapper';

        const fretboardDiv = document.createElement('div');
        fretboardDiv.className = 'fretboard-embed';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', fretboardConfig.width);
        svg.setAttribute('height', fretboardConfig.height);
        svg.setAttribute('style', 'background-color: white;');

        fretboardDiv.appendChild(svg);
        scrollWrapper.appendChild(fretboardDiv);
        container.appendChild(scrollWrapper);

        // Initialize the Fretboard
        try {
            const fbOpts = {
                svg: svg,
                startFret: fretboardConfig.startFret - 1,  // Convert to 0-based internal
                endFret: fretboardConfig.endFret,
                notes: fretboardConfig.notes,
                transposable: false
            };
            new Fretboard(fbOpts);
        } catch (e) {
            console.error('Failed to initialize mixer fretboard:', e);
        }
    }

    /**
     * Initializes the key mixer UI with dropdowns and updates
     */
    function initKeyMixer() {
        // Create the mixer container if it doesn't exist
        const mixerContainer = document.getElementById('key-mixer-controls');
        if (!mixerContainer) {
            console.warn('key-mixer-controls container not found');
            return;
        }

        // Get the root note selector and BASE MODE selector from the main controls
        const rootNoteSelect = document.getElementById('root-note-select');
        const rootNotes = ['E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B', 'C', 'C#/Db', 'D', 'D#/Eb'];
        
        const getSelectedRootNote = () => {
            const idx = parseInt(rootNoteSelect.value);
            const mapping = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
            return mapping[idx] || 'A';
        };

        const getSelectedBaseMode = () => {
            return 'Aeolian';
        };

        const modes = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];

        // Create dropdowns if they don't exist
        let key2ModeSelect = document.getElementById('key2-mode-select');
        if (!key2ModeSelect) {
            const selectsWrapper = document.createElement('div');
            selectsWrapper.style.cssText = 'display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;';

            // Base key mode selector, local to this comparator
            const label1 = document.createElement('label');
            label1.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
            label1.innerHTML = '<span style="font-weight:600; font-size:12px;">Base Key Mode:</span>';

            const key1ModeSelect = document.createElement('select');
            key1ModeSelect.id = 'key1-mode-select';
            key1ModeSelect.style.cssText = 'padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;';
            modes.forEach(mode => {
                const opt = document.createElement('option');
                opt.value = mode;
                opt.textContent = mode;
                if (mode === getSelectedBaseMode()) opt.selected = true;
                key1ModeSelect.appendChild(opt);
            });
            label1.appendChild(key1ModeSelect);

            // Mode 2 selector
            const label2 = document.createElement('label');
            label2.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
            label2.innerHTML = '<span style="font-weight:600; font-size:12px;">Second Key Mode:</span>';
            
            key2ModeSelect = document.createElement('select');
            key2ModeSelect.id = 'key2-mode-select';
            key2ModeSelect.style.cssText = 'padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;';
            modes.forEach(mode => {
                const opt = document.createElement('option');
                opt.value = mode;
                opt.textContent = mode;
                if (mode === 'Ionian') opt.selected = true;
                key2ModeSelect.appendChild(opt);
            });
            label2.appendChild(key2ModeSelect);

            // Root 2 selector
            const label3 = document.createElement('label');
            label3.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
            label3.innerHTML = '<span style="font-weight:600; font-size:12px;">Second Key Root:</span>';
            
            const key2RootSelect = document.createElement('select');
            key2RootSelect.id = 'key2-root-select';
            key2RootSelect.style.cssText = 'padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;';
            rootNotes.forEach((note, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = note;
                if (note === 'B') opt.selected = true;
                key2RootSelect.appendChild(opt);
            });
            label3.appendChild(key2RootSelect);

            selectsWrapper.appendChild(label1);
            selectsWrapper.appendChild(label2);
            selectsWrapper.appendChild(label3);
            mixerContainer.appendChild(selectsWrapper);

            // Add update button
            const updateBtn = document.createElement('button');
            updateBtn.id = 'mixer-update-btn';
            updateBtn.textContent = 'Update Fretboard';
            updateBtn.style.cssText = 'height: auto; padding: 10px 20px; display: inline-flex; align-items: center; justify-content: center; text-align: center; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;';
            
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display: flex; gap: 10px;';
            btnContainer.appendChild(updateBtn);
            mixerContainer.appendChild(btnContainer);

            // Update fretboard on selection change or button click
            const updateFretboard = () => {
                const root1 = getSelectedRootNote();
                const mode1 = key1ModeSelect.value || getSelectedBaseMode();
                
                const idx2 = parseInt(key2RootSelect.value);
                const mapping = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
                const root2 = mapping[idx2];
                const mode2 = key2ModeSelect.value;

                const config = createMixerFretboard(root1, mode1, root2, mode2, 0, 15);
                renderMixerFretboard('key-mixer-fretboard-container', config);
            };

            key1ModeSelect.addEventListener('change', updateFretboard);
            key2ModeSelect.addEventListener('change', updateFretboard);
            key2RootSelect.addEventListener('change', updateFretboard);
            updateBtn.addEventListener('click', updateFretboard);
            rootNoteSelect.addEventListener('change', updateFretboard);

            // Initial render
            setTimeout(updateFretboard, 100);
        }
    }

    // Export for window
    if (typeof window !== 'undefined') {
        window.KeyMixer = {
            MODE_INTERVALS,
            getPitchClass,
            getModePitchClasses,
            getCommonPitchClasses,
            getUniquePitchClasses,
            createMixerFretboard,
            renderMixerFretboard,
            initKeyMixer
        };
    }
})();
