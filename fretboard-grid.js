/* fretboard-grid.js
   Responsible for creating fretboard grids (containers with class "fretboard-grid").
   Relies on `Fretboard` defined in `fretboard.js`.
*/
(function () {
    // NOTE: Markdown loading is intentionally handled by a separate loader
    // so this file focuses on creating grids and initializing embedded
    // fretboards. The helper `initFretboardEmbeds` is defined below and
    // exposed on `window` for the markdown loader to call after rendering.

    // Store original grid configurations for mode transformation
    window.fretboardGridConfigs = window.fretboardGridConfigs || {};

    // Convert user-supplied notes: fret 0 -> -1 (open), fret N>0 -> N-1 (0-based internal)
    // String numbers: 1-6 (user) -> 0-5 (internal array index)
    function convertUserNotes(notesArr) {
        return notesArr.map(n => {
            const out = Object.assign({}, n);
            if (out.hasOwnProperty('fret')) {
                // Check if it's 'X' for muted strings
                if (out.fret === 'X' || out.fret === 'x') {
                    out.fret = 'X'; // normalize to uppercase
                } else {
                    const fv = parseInt(out.fret);
                    if (!isNaN(fv)) out.fret = (fv === 0) ? -1 : (fv - 1);
                }
            }
            if (out.hasOwnProperty('string')) {
                const sv = parseInt(out.string);
                if (!isNaN(sv)) out.string = Math.max(0, sv - 1);
            }
            return out;
        });
    }

    // Find fenced code blocks with language 'fretboard' and replace them
    // with rendered fretboard SVGs initialized from the JSON config.
    function initFretboardEmbeds(root) {
        if (!root) return;
        const blocks = root.querySelectorAll('pre > code.language-fretboard');
        if (blocks && blocks.length) {
            blocks.forEach(code => {
            let cfg = null;
            try {
                cfg = JSON.parse(code.textContent);
            } catch (e) {
                console.warn('Invalid fretboard JSON in markdown:', e);
                return;
            }

            // Convert user-provided start/end/notes (1-based) to internal
            let startFretInternal = undefined;
            if (cfg.hasOwnProperty('startFret')) {
                const sv = parseInt(cfg.startFret);
                if (!isNaN(sv)) startFretInternal = Math.max(0, sv - 1);
            }
            let endFretInternal = undefined;
            if (cfg.hasOwnProperty('endFret')) {
                const ev = parseInt(cfg.endFret);
                if (!isNaN(ev)) endFretInternal = ev;
            }

            let notesInternal = null;
            if (Array.isArray(cfg.notes)) {
                notesInternal = convertUserNotes(cfg.notes);
            }

            // create container and svg
            const container = document.createElement('div');
            container.className = 'fretboard-embed';
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', cfg.width || 600);
            svg.setAttribute('height', cfg.height || 300);
            svg.setAttribute('style', 'background-color: white;');
            container.appendChild(svg);

            // replace the <pre> parent with the container
            const pre = code.parentNode;
            pre.parentNode.replaceChild(container, pre);

            // initialize Fretboard
            const fbOpts = { svg: svg };
            if (typeof startFretInternal !== 'undefined') fbOpts.startFret = startFretInternal;
            if (typeof endFretInternal !== 'undefined') fbOpts.endFret = endFretInternal;
            if (notesInternal) fbOpts.notes = notesInternal;
            if (cfg.hasOwnProperty('transposable')) fbOpts.transposable = !!cfg.transposable;
            try {
                new Fretboard(fbOpts);
            } catch (e) {
                console.error('Failed to initialize embedded fretboard:', e);
            }
        });
        }

        // Support fenced blocks with language 'fretboard-grid' to embed a grid
        const gridBlocks = root.querySelectorAll('pre > code.language-fretboard-grid');
        if (gridBlocks && gridBlocks.length) {
            gridBlocks.forEach(code => {
                let cfg = null;
                try {
                    cfg = JSON.parse(code.textContent);
                } catch (e) {
                    console.warn('Invalid fretboard-grid JSON in markdown:', e);
                    return;
                }

                // cfg may include rows, cols, total, id (baseId), colTitles, rowTitles, and items (per-cell overrides)
                const rows = cfg.rows || 3;
                const cols = cfg.cols || 3;
                const total = cfg.total || (rows * cols);
                const baseId = cfg.id || `fretboard-grid-${Math.floor(Math.random()*100000)}`;

                // Store the original configuration for later use (e.g., mode transformation)
                window.fretboardGridConfigs[baseId] = JSON.parse(JSON.stringify(cfg));

                const container = document.createElement('div');
                container.className = 'fretboard-grid';
                container.id = baseId;
                container.dataset.rows = rows;
                container.dataset.cols = cols;
                container.dataset.total = total;
                if (cfg.colTitles) container.dataset.colTitles = Array.isArray(cfg.colTitles) ? JSON.stringify(cfg.colTitles) : cfg.colTitles;
                if (cfg.rowTitles) container.dataset.rowTitles = Array.isArray(cfg.rowTitles) ? JSON.stringify(cfg.rowTitles) : cfg.rowTitles;

                // create optional per-item hidden inputs so existing grid initializer picks them up
                if (Array.isArray(cfg.items)) {
                    for (let i = 0; i < cfg.items.length && i < total; i++) {
                        const item = cfg.items[i];
                        const idx = i + 1;
                        if (!item) {
                            // Mark this position as null/empty so it won't be rendered
                            const inp = document.createElement('input');
                            inp.type = 'hidden';
                            inp.id = `${baseId}-fb-${idx}-null`;
                            inp.value = 'true';
                            container.appendChild(inp);
                            continue;
                        }
                        if (item.startFret !== undefined) {
                            const inp = document.createElement('input');
                            inp.type = 'hidden';
                            inp.id = `${baseId}-fb-${idx}-start-fret`;
                            inp.value = String(item.startFret);
                            container.appendChild(inp);
                        }
                        if (item.endFret !== undefined) {
                            const inp = document.createElement('input');
                            inp.type = 'hidden';
                            inp.id = `${baseId}-fb-${idx}-end-fret`;
                            inp.value = String(item.endFret);
                            container.appendChild(inp);
                        }
                        if (item.notes !== undefined) {
                            const inp = document.createElement('input');
                            inp.type = 'hidden';
                            inp.id = `${baseId}-fb-${idx}-notes`;
                            inp.value = JSON.stringify(item.notes);
                            container.appendChild(inp);
                        }
                        if (item.title !== undefined) {
                            const inp = document.createElement('input');
                            inp.type = 'hidden';
                            inp.id = `${baseId}-fb-${idx}-title`;
                            inp.value = String(item.title);
                            container.appendChild(inp);
                        }
                        if (item.transposable !== undefined) {
                            const inp = document.createElement('input');
                            inp.type = 'hidden';
                            inp.id = `${baseId}-fb-${idx}-transposable`;
                            inp.value = String(item.transposable);
                            container.appendChild(inp);
                        }
                    }
                }

                // Store grid-level transposable attribute if present
                if (cfg.transposable !== undefined) {
                    container.dataset.transposable = String(cfg.transposable);
                }

                // replace the code block with the container
                const pre = code.parentNode;
                pre.parentNode.replaceChild(container, pre);
            });
        }
    }

    // expose helper so external markdown loader can initialize embeds and grids
    try {
        window.initFretboardEmbeds = initFretboardEmbeds;
        window.convertUserNotes = convertUserNotes;
        window.initFretboardGrids = initFretboardGrids;
        window.initGlobalControls = initGlobalControls;
    } catch (e) {
        // ignore (e.g., not running in a browser-like environment)
    }

    // Initialize any .fretboard-grid containers found within `root` (or whole document)
    function initFretboardGrids(root = document) {
        const containers = (root || document).querySelectorAll('.fretboard-grid');
        if (!containers || containers.length === 0) return;
        console.log('initFretboardGrids: found containers', containers.length);

        // Wrap each grid in a scroll wrapper for horizontal scrolling
        containers.forEach(grid => {
            if (!grid.parentElement.classList.contains('fretboard-grid-scroll-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'fretboard-grid-scroll-wrapper';
                grid.parentElement.insertBefore(wrapper, grid);
                wrapper.appendChild(grid);
            }
        });

        // Re-select after wrapping
        const wrappedContainers = (root || document).querySelectorAll('.fretboard-grid');

        // small example note sets (can be overridden later)
        const noteSets = [
            [ { fret: 0, string: 0, color: 'blue', label: 'R' }, { fret: 3, string: 0, color: 'blue', label: 'b3' } ],
            [ { fret: 0, string: 0, color: 'green', label: '1' } ],
            [ { fret: 0, string: 0, color: 'red', label: '1' } ],
            [ { fret: 0, string: 3, color: 'blue', label: '1' } ]
        ];

        wrappedContainers.forEach(container => {
            const rows = Number.isFinite(parseInt(container.dataset.rows)) ? parseInt(container.dataset.rows) : 5;
            const cols = Number.isFinite(parseInt(container.dataset.cols)) ? parseInt(container.dataset.cols) : 5;
            const total = Number.isFinite(parseInt(container.dataset.total)) ? parseInt(container.dataset.total) : (rows * cols);
            const baseId = container.id || 'fretboard-grid';

            // parse optional titles (supports JSON array or comma/| separated list)
            function parseTitles(raw) {
                if (!raw) return null;
                raw = raw.trim();
                try {
                    if (raw[0] === '[') return JSON.parse(raw);
                } catch (e) { /* fall through */ }
                // try splitting by pipe first then comma
                const parts = raw.indexOf('|') !== -1 ? raw.split('|') : raw.split(',');
                return parts.map(s => s.trim());
            }

            const colTitles = parseTitles(container.dataset.colTitles || container.dataset.colTitles || container.dataset.col_titles || container.dataset.col_titles);
            const rowTitles = parseTitles(container.dataset.rowTitles || container.dataset.rowTitles || container.dataset.row_titles || container.dataset.row_titles);

            // If titles are present, add header cells directly to the container and
            // expand the container grid to include the title column/row. Compute
            // templates differently depending on which headers exist to avoid
            // introducing an empty header row/column.
            let targetParent = container;
            const hasColTitles = !!colTitles;
            const hasRowTitles = !!rowTitles;

            if (hasColTitles || hasRowTitles) {
                const titleColRaw = (container.dataset.titleColWidth);
                // default to 'auto' so the column width adapts to content unless a fixed width is provided
                const titleCol = (typeof titleColRaw === 'string' && titleColRaw.trim().length > 0) ? titleColRaw.trim() : 'auto';

                // Columns: include title column only when row titles exist
                if (hasRowTitles) {
                    if (titleCol === 'auto') {
                        // let the title column size to its content
                        container.style.gridTemplateColumns = `auto repeat(${cols}, minmax(var(--grid-cell-min-width), 1fr))`;
                    } else {
                        container.style.gridTemplateColumns = `minmax(${titleCol}, ${titleCol}) repeat(${cols}, minmax(var(--grid-cell-min-width), 1fr))`;
                    }
                } else {
                    container.style.gridTemplateColumns = `repeat(${cols}, minmax(var(--grid-cell-min-width), 1fr))`;
                }

                // Rows: include top title row only when column titles exist
                if (hasColTitles) {
                    container.style.gridTemplateRows = `auto repeat(${rows}, var(--grid-cell-row-height))`;
                } else {
                    container.style.gridTemplateRows = `repeat(${rows}, var(--grid-cell-row-height))`;
                }

                container.style.gap = '0px';

                // add corner only if both title types exist
                if (hasColTitles && hasRowTitles) {
                    const corner = document.createElement('div');
                    corner.className = 'grid-corner';
                    corner.style.gridColumn = '1';
                    corner.style.gridRow = '1';
                    container.appendChild(corner);
                }

                // column titles: place at row 1; columns start at 1 or 2 depending on row titles
                if (hasColTitles) {
                    for (let c = 0; c < cols; c++) {
                        const title = document.createElement('div');
                        title.className = 'grid-col-title';
                        title.textContent = colTitles[c] || '';
                        const colPos = hasRowTitles ? (c + 2) : (c + 1);
                        title.style.gridColumn = colPos.toString();
                        title.style.gridRow = '1';
                        container.appendChild(title);
                    }
                }

                // row titles: place at column 1; rows start at 1 or 2 depending on col titles
                if (hasRowTitles) {
                    for (let r = 0; r < rows; r++) {
                        const title = document.createElement('div');
                        title.className = 'grid-row-title';
                        title.textContent = rowTitles[r] || '';
                        const rowPos = hasColTitles ? (r + 2) : (r + 1);
                        title.style.gridColumn = '1';
                        title.style.gridRow = rowPos.toString();
                        container.appendChild(title);
                    }
                }

                targetParent = container;
            } else {
                // ensure container uses grid columns for cols and default row sizing
                try {
                    container.style.gridTemplateColumns = `repeat(${cols}, minmax(var(--grid-cell-min-width), 1fr))`;
                    container.style.gridAutoRows = getComputedStyle(document.documentElement).getPropertyValue('--grid-cell-row-height') || '340px';
                } catch (e) {}
            }

            // create items and place them; when headers are present we must set explicit
            // grid positions (offset by header rows/cols), otherwise just append
            const hasHeaders = !!(colTitles || rowTitles);
            for (let i = 1; i <= total; i++) {
                // Check if this item is marked as null - if so, skip creating it
                const nullMarker = document.getElementById(`${baseId}-fb-${i}-null`);
                if (nullMarker && nullMarker.value === 'true') {
                    continue;
                }

                const fretboardItem = document.createElement('div');
                fretboardItem.className = 'fretboard-item';

                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('id', `${baseId}-fb-${i}`);
                svg.setAttribute('width', 450);
                svg.setAttribute('height', 300);
                svg.setAttribute('style', 'background-color: white;');

                const label = document.createElement('div');
                label.className = 'fretboard-label';
                label.id = `${baseId}-fb-${i}-label`;
                //label.textContent = `Fretboard #${i}`;

                fretboardItem.appendChild(svg);
                fretboardItem.appendChild(label);

                if (!hasHeaders) {
                    container.appendChild(fretboardItem);
                } else {
                    const index = i - 1;
                    const rowIdx = Math.floor(index / cols);
                    const colIdx = index % cols;
                    const colOffset = rowTitles ? 2 : 1; // if row titles exist, content starts at column 2
                    const rowOffset = colTitles ? 2 : 1; // if col titles exist, content starts at row 2
                    fretboardItem.style.gridColumn = (colIdx + colOffset).toString();
                    fretboardItem.style.gridRow = (rowIdx + rowOffset).toString();
                    container.appendChild(fretboardItem);
                }
            }

            // initialize fretboard objects for this container
            const fretboards = [];
            for (let i = 1; i <= total; i++) {
                const svgEl = document.getElementById(`${baseId}-fb-${i}`);
                if (!svgEl) continue;

                // Per-item override inputs (optional). If present in the DOM, they override defaults.
                const startInput = document.getElementById(`${baseId}-fb-${i}-start-fret`);
                const endInput = document.getElementById(`${baseId}-fb-${i}-end-fret`);
                const notesInput = document.getElementById(`${baseId}-fb-${i}-notes`);
                const titleInput = document.getElementById(`${baseId}-fb-${i}-title`);
                const transposableInput = document.getElementById(`${baseId}-fb-${i}-transposable`);
                const labelEl = document.getElementById(`${baseId}-fb-${i}-label`);

                // Set label text if title input exists
                if (titleInput && titleInput.value && labelEl) {
                    labelEl.textContent = titleInput.value;
                }

                // Determine startFret: convert user-facing 1-based fret numbers to 0-based internal
                // User fret 1 (first fret on guitar) -> internal 0
                let startArg = { value: 0 };
                if (startInput && startInput.value) {
                    const v = parseInt(startInput.value);
                    if (!isNaN(v)) {
                        startArg = Math.max(0, v - 1);
                    }
                }

                // Determine endFret: this is the exclusive upper bound, so don't subtract
                // User wants to see up to fret N, loop goes < endFret
                let endArg = { value: 4 };
                if (endInput && endInput.value) {
                    const v = parseInt(endInput.value);
                    if (!isNaN(v)) endArg = v;
                }

                // Determine notes: try parsing JSON from notesInput, else use default noteSets
                let notesArg = noteSets[i - 1] || [];
                if (notesInput && notesInput.value) {
                    try {
                        const parsed = JSON.parse(notesInput.value);
                        if (Array.isArray(parsed)) {
                            // convert user-supplied note fields: fret 0 -> -1 (open), fret N>0 -> N-1, strings 1-6 -> 0-5
                            notesArg = parsed.map(n => {
                                const out = Object.assign({}, n);
                                if (out.hasOwnProperty('fret')) {
                                    // Check if it's 'X' for muted strings
                                    if (out.fret === 'X' || out.fret === 'x') {
                                        out.fret = 'X'; // normalize to uppercase
                                    } else {
                                        const fv = parseInt(out.fret);
                                        if (!isNaN(fv)) out.fret = (fv === 0) ? -1 : (fv - 1);
                                    }
                                }
                                if (out.hasOwnProperty('string')) {
                                    const sv = parseInt(out.string);
                                    if (!isNaN(sv)) out.string = Math.max(0, sv - 1);
                                }
                                return out;
                            });
                        }
                    } catch (e) {
                        console.warn(`Could not parse notes for ${baseId}-fb-${i}:`, e);
                    }
                }

                // Visible log: show which values we'll pass to the constructor
                console.log(`Initializing ${baseId}-fb-${i}: start=${startArg} end=${endArg} notes=${JSON.stringify(notesArg)}`);

                // Determine transposable: check item-level first, then grid-level, default to true
                let transposableArg = true;
                if (transposableInput && transposableInput.value) {
                    transposableArg = transposableInput.value === 'true';
                } else if (container.dataset.transposable) {
                    transposableArg = container.dataset.transposable === 'true';
                }

                const fb = new Fretboard({
                    svg: svgEl,
                    startFret: startArg,
                    endFret: endArg,
                    enharmonic: { value: 0 },
                    notes: notesArg,
                    transposable: transposableArg
                });
                fretboards.push(fb);
            }
        });
    }

    // call at startup for any statically present grids
    document.addEventListener('DOMContentLoaded', function () {
        console.log('fretboard-grid: DOMContentLoaded');
        initFretboardGrids(document);
        // ensure global controls are wired
        initGlobalControls();
    });

    // Wire global UI controls (buttons) once. Safe to call multiple times.
    function initGlobalControls() {
        // labels toggle
        const toggleBtn = document.getElementById('toggle-labels');
        if (toggleBtn && !toggleBtn.dataset.bound) {
            try {
                toggleBtn.textContent = (typeof Fretboard !== 'undefined' && Fretboard.showLabels) ? 'Notes' : 'Intervals';
            } catch (e) {}
            toggleBtn.addEventListener('click', () => {
                if (typeof Fretboard !== 'undefined') {
                    const shown = Fretboard.toggleShowLabels();
                    toggleBtn.textContent = shown ? 'Notes' : 'Intervals';
                }
            });
            toggleBtn.dataset.bound = '1';
        }

        // enharmonic toggle
        const enharmBtn = document.getElementById('toggle-enharmonic');
        if (enharmBtn && !enharmBtn.dataset.bound) {
            enharmBtn.addEventListener('click', () => {
                if (typeof Fretboard !== 'undefined') {
                    const sign = Fretboard.toggleEnharmonicAll();
                    enharmBtn.textContent = sign || 'Enharmonic';
                }
            });
            enharmBtn.dataset.bound = '1';
        }

        // show all notes toggle
        const showAllNotesCheckbox = document.getElementById('toggle-all-notes');
        if (showAllNotesCheckbox && !showAllNotesCheckbox.dataset.bound) {
            showAllNotesCheckbox.addEventListener('change', () => {
                if (typeof Fretboard !== 'undefined') {
                    Fretboard.setShowAllNotes(showAllNotesCheckbox.checked);
                }
            });
            showAllNotesCheckbox.dataset.bound = '1';
        }

        // root note selector
        const rootNoteSelect = document.getElementById('root-note-select');
        if (rootNoteSelect && !rootNoteSelect.dataset.bound) {
            rootNoteSelect.addEventListener('change', () => {
                if (typeof Fretboard !== 'undefined') {
                    const noteIndex = parseInt(rootNoteSelect.value);
                    Fretboard.setRootNote(noteIndex);
                }
            });
            rootNoteSelect.dataset.bound = '1';
        }
    }
})();
