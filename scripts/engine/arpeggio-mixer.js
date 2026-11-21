/* arpeggio-mixer.js
   Compares the pitch classes of two selected arpeggio shapes.
*/

(function () {
    'use strict';

    const NOTE_INDEX_BY_NAME = {
        'E': 0, 'F': 1, 'F#': 2, 'Gb': 2, 'G': 3, 'G#': 4, 'Ab': 4,
        'A': 5, 'A#': 6, 'Bb': 6, 'B': 7, 'C': 8, 'C#': 9, 'Db': 9,
        'D': 10, 'D#': 11, 'Eb': 11
    };

    const INTERVALS = {
        'R': 0, 'b2': 1, 'm2': 1, '2': 2, 'M2': 2,
        'b3': 3, 'm3': 3, '3': 4, 'M3': 4,
        'P4': 5, '4': 5, 'A4': 6, 'b5': 6, 'P5': 7,
        'b6': 8, 'm6': 8, '6': 9, 'M6': 9,
        'b7': 10, 'm7': 10, '7': 11, 'M7': 11
    };

    const GUITAR_TUNING = [0, 7, 3, 10, 5, 0];
    const ROOT_NAMES = ['E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B', 'C', 'C#/Db', 'D', 'D#/Eb'];
    const ROOT_MAPPING = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
    const selectedShapes = [];

    function getSelectedRoot() {
        const select = document.getElementById('root-note-select');
        if (!select) return 'A';
        const index = parseInt(select.value);
        return ROOT_MAPPING[index] || 'A';
    }

    function getPitchClass(rootName) {
        const normalized = rootName.replace(/♯/g, '#').replace(/♭/g, 'b').trim();
        return NOTE_INDEX_BY_NAME[normalized];
    }

    function getShapePitchClasses(shape) {
        const intervals = new Set([0]);

        if (shape.config && Array.isArray(shape.config.notes)) {
            shape.config.notes.forEach(note => {
                if (note.label && INTERVALS[note.label] !== undefined) {
                    intervals.add(INTERVALS[note.label]);
                }
            });
        }

        if (intervals.size === 1) {
            const quality = shape.quality.toLowerCase();
            if (quality.includes('maj7#5')) intervals.add(...[4, 8, 11]);
            else if (quality.includes('maj7')) intervals.add(...[4, 7, 11]);
            else if (quality.includes('mmaj7')) intervals.add(...[3, 7, 11]);
            else if (quality.includes('m7b5')) intervals.add(...[3, 6, 10]);
            else if (quality.includes('m7')) intervals.add(...[3, 7, 10]);
            else if (quality.includes('o7')) intervals.add(...[3, 6, 9]);
            else if (quality.includes('7')) intervals.add(...[4, 7, 10]);
        }

        return [...intervals];
    }

    function getSectionHeading(container) {
        let element = container.previousElementSibling;
        while (element) {
            if (/^H[1-6]$/.test(element.tagName)) return element.textContent.trim();
            element = element.previousElementSibling;
        }
        return 'Arpeggio';
    }

    function deriveShapes() {
        document.querySelectorAll('#md-arpeggios .fretboard-grid').forEach(container => {
            container.style.setProperty('--grid-cell-row-height', '270px');
            container.classList.add('arpeggio-fretboard-grid');
            const baseId = container.id;
            const config = window.fretboardGridConfigs && window.fretboardGridConfigs[baseId];
            if (!config || !Array.isArray(config.items)) return;

            const section = getSectionHeading(container);
            config.items.forEach((item, index) => {
                if (!item) return;
                const col = config.cols ? index % config.cols : 0;
                const row = config.cols ? Math.floor(index / config.cols) : 0;
                const colTitle = config.colTitles && config.colTitles[col] ? config.colTitles[col] : '';
                const quality = colTitle || section;
                const formNumber = row + 1;
                const fretboardItem = container.querySelector(`#${baseId}-fb-${index + 1}`)?.parentElement;
                if (!fretboardItem) return;

                let checkbox = fretboardItem.querySelector('.arpeggio-select-checkbox');
                if (!checkbox) {
                    const label = document.createElement('label');
                    label.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:6px; margin:4px 0 8px; font-size:12px; cursor:pointer;';

                    checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'arpeggio-select-checkbox';
                    checkbox.style.cursor = 'pointer';
                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(` Select form ${formNumber}`));
                    fretboardItem.appendChild(label);
                }

                const shape = {
                    id: `${baseId}-fb-${index + 1}`,
                    name: `${quality} - form ${formNumber}`,
                    quality,
                    section,
                    config: item
                };
                checkbox.dataset.shapeId = shape.id;
                checkbox.dataset.shapeName = shape.name;
                checkbox.dataset.shapeJson = JSON.stringify(shape);

                if (!checkbox.dataset.bound) {
                    checkbox.dataset.bound = '1';
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            if (selectedShapes.length >= 2) {
                                const removed = selectedShapes.shift();
                                const removedCheckbox = document.querySelector(
                                    `[data-shape-id="${CSS.escape(removed.id)}"].arpeggio-select-checkbox`
                                );
                                if (removedCheckbox) removedCheckbox.checked = false;
                            }
                            selectedShapes.push(JSON.parse(checkbox.dataset.shapeJson));
                        } else {
                            const indexToRemove = selectedShapes.findIndex(shapeItem => shapeItem.id === checkbox.dataset.shapeId);
                            if (indexToRemove !== -1) selectedShapes.splice(indexToRemove, 1);
                        }
                        updateComparisonStatus();
                        updateComparison();
                    });
                }
            });
        });
    }

    function initBurgerControls() {
        if (document.getElementById('arpeggio-second-root-select')) return;

        const container = document.getElementById('arpeggio-mixer-fretboard-container');
        if (!container) return;

        const panel = document.createElement('div');
        panel.id = 'arpeggio-mixer-controls';
        panel.style.cssText = 'display:flex; gap:15px; align-items:flex-end; flex-wrap:wrap; margin:0 0 15px; padding:15px; background:#f5f5f5; border-radius:4px;';
        panel.innerHTML = '<span style="font-weight:600;font-size:12px;">Arpeggio Comparison</span>';

        const label = document.createElement('label');
        label.style.cssText = 'display:flex; flex-direction:column; gap:6px;';
        label.innerHTML = '<span style="font-size:12px;">Second Arpeggio Root:</span>';

        const select = document.createElement('select');
        select.id = 'arpeggio-second-root-select';
        select.style.cssText = 'padding:8px;border:1px solid #ccc;border-radius:4px;background:white;cursor:pointer;';
        ROOT_NAMES.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name;
            if (name === 'D#/Eb') option.selected = true;
            select.appendChild(option);
        });
        label.appendChild(select);
        panel.appendChild(label);

        const button = document.createElement('button');
        button.id = 'arpeggio-mixer-update';
        button.textContent = 'Compare 2 Arpeggios';
        button.style.cssText = 'height:auto;padding:10px 12px;display:inline-flex;align-items:center;justify-content:center;text-align:center;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;';
        button.addEventListener('click', updateComparison);
        panel.appendChild(button);

        const clearButton = document.createElement('button');
        clearButton.id = 'arpeggio-mixer-clear';
        clearButton.textContent = 'Clear Selection';
        clearButton.style.cssText = 'height:auto;padding:10px 12px;display:inline-flex;align-items:center;justify-content:center;text-align:center;background:#777;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:600;';
        clearButton.addEventListener('click', () => {
            selectedShapes.splice(0, selectedShapes.length);
            document.querySelectorAll('.arpeggio-select-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            updateComparisonStatus();

            const comparisonContainer = document.getElementById('arpeggio-mixer-fretboard-container');
            if (comparisonContainer) comparisonContainer.innerHTML = '';
        });
        panel.appendChild(clearButton);

        container.after(panel);

        select.addEventListener('change', updateComparison);
        document.getElementById('root-note-select')?.addEventListener('change', updateComparison);
    }

    function getSecondRoot() {
        const select = document.getElementById('arpeggio-second-root-select');
        if (!select) return 'D#';
        return ROOT_MAPPING[parseInt(select.value)] || 'D#';
    }

    function updateComparisonStatus() {
        const status = document.getElementById('arpeggio-mixer-status');
        if (!status) return;
        if (selectedShapes.length === 0) status.textContent = 'Select two arpeggio shapes.';
        else if (selectedShapes.length === 1) status.textContent = `Ready: ${selectedShapes[0].name} at both selected roots.`;
        else status.textContent = `Ready: ${selectedShapes[0].name} and ${selectedShapes[1].name}`;
    }

    function createComparisonConfig() {
        if (selectedShapes.length === 0) return null;

        const firstShape = selectedShapes[0];
        const secondShape = selectedShapes.length === 2
            ? selectedShapes[1]
            : firstShape;

        const root1 = getSelectedRoot();
        const root2 = getSecondRoot();
        const pitchClasses1 = getShapePitchClasses(firstShape).map(interval => (getPitchClass(root1) + interval) % 12);
        const pitchClasses2 = getShapePitchClasses(secondShape).map(interval => (getPitchClass(root2) + interval) % 12);

        const uniquePc = {
            pc1: [...new Set(pitchClasses1)],
            pc2: [...new Set(pitchClasses2)]
        };
        const common = uniquePc.pc1.filter(pc => uniquePc.pc2.includes(pc));
        const notes = [];

        const rootOffset1 = getPitchClass(root1) - getPitchClass('A');
        const rootOffset2 = getPitchClass(root2) - getPitchClass('A');

        function transposeShape(shape, rootOffset, ownerColor, ownerLabel) {
            const configNotes = shape.config && Array.isArray(shape.config.notes)
                ? shape.config.notes
                : [];

            configNotes.forEach(note => {
                if (!note || note.fret === 'X' || note.fret === 'x') return;

                const userFret = parseInt(note.fret);
                const userString = parseInt(note.string);
                if (!Number.isFinite(userFret) || !Number.isFinite(userString)) return;

                if (userFret === 0) return;

                const string = Math.max(0, Math.min(5, userString - 1));
                let fret = (userFret - 1) + rootOffset;

                while (fret < 0) fret += 12;
                while (fret > 14) fret -= 12;

                const pitch = (GUITAR_TUNING[string] + fret + 1) % 12;
                let color = ownerColor;
                let label = ownerLabel;
                if (common.includes(pitch)) {
                    color = 'green';
                    label = 'C';
                }
                notes.push({ fret, string, color, label });
            });
        }

        transposeShape(firstShape, rootOffset1, 'blue', '1');
        transposeShape(secondShape, rootOffset2, 'red', '2');

        const deduplicatedNotes = new Map();
        notes.forEach(note => {
            const key = `${note.string}-${note.fret}`;
            const existing = deduplicatedNotes.get(key);
            if (!existing || note.color === 'green') {
                deduplicatedNotes.set(key, note);
            }
        });
        const shapeNotes = [...deduplicatedNotes.values()];

        return {
            id: 'arpeggio-mixer-fretboard',
            startFret: 1,
            endFret: 15,
            width: 800,
            height: 350,
            notes: shapeNotes,
            transposable: false,
            title: `${firstShape.name} (${root1}) vs ${secondShape.name} (${root2})`
        };
    }

    function updateComparison() {
        updateComparisonStatus();
        const container = document.getElementById('arpeggio-mixer-fretboard-container');
        if (!container) return;
        container.innerHTML = '';

        const config = createComparisonConfig();
        if (!config) return;

        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'fretboard-embed-scroll-wrapper';
        const fretboardDiv = document.createElement('div');
        fretboardDiv.className = 'fretboard-embed';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', config.width);
        svg.setAttribute('height', config.height);
        svg.setAttribute('style', 'background-color: white;');
        fretboardDiv.appendChild(svg);
        scrollWrapper.appendChild(fretboardDiv);
        container.appendChild(scrollWrapper);

        new Fretboard({
            svg,
            startFret: 0,
            endFret: 15,
            notes: config.notes,
            transposable: false
        });
    }

    function initArpeggioMixer() {
        deriveShapes();
        initBurgerControls();

        let status = document.getElementById('arpeggio-mixer-status');
        if (!status) {
            status = document.createElement('p');
            status.id = 'arpeggio-mixer-status';
            status.style.cssText = 'margin:8px 0 0;color:#666;font-size:13px;';
            const container = document.getElementById('arpeggio-mixer-fretboard-container');
            if (container) container.before(status);
        }
        updateComparisonStatus();
    }

    window.ArpeggioMixer = {
        initArpeggioMixer,
        updateComparison,
        getShapePitchClasses
    };
})();
