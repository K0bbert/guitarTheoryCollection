/* tab-builder.js
   Integrated tab builder view for main markdown app.
*/
(function () {
    'use strict';

    const STYLE_ID = 'tab-builder-style';

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
        .tab-builder-view {
          color: #222;
        }
        .tab-builder-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
          background: #fffdf9;
          border: 1px solid #dbd4c7;
          border-radius: 12px;
          padding: 10px;
        }
        .tab-builder-toolbar button {
          border: 1px solid #dbd4c7;
          border-radius: 8px;
          background: white;
          color: #222;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
        }
        .tab-builder-toolbar button.primary {
          background: #0f766e;
          border-color: #0f766e;
          color: #fff;
        }
        .tab-builder-toolbar button.warn {
          border-color: #b45309;
          color: #b45309;
        }
        .tab-builder-toolbar button.danger {
          border-color: #b91c1c;
          color: #b91c1c;
        }
        .tab-builder-meta {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 12px;
          background: #fffdf9;
          border: 1px solid #dbd4c7;
          border-radius: 12px;
          padding: 10px;
        }
        .tab-builder-meta label {
          display: flex;
          gap: 6px;
          align-items: center;
          font-size: 0.95rem;
        }
        .tab-builder-meta input {
          border: 1px solid #dbd4c7;
          border-radius: 8px;
          padding: 6px 8px;
          min-width: 110px;
          font-family: Consolas, "Courier New", monospace;
        }
        .tab-builder-status {
          margin-left: auto;
          font-size: 0.9rem;
          color: #666;
        }
        .tab-builder-board-wrap {
          overflow-x: auto;
          border: 1px solid #dbd4c7;
          border-radius: 12px;
          background: #fffdf9;
          padding: 10px;
        }
        .tab-builder-board {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tab-builder-row {
          display: grid;
          gap: 6px;
          align-items: start;
          width: max-content;
          padding: 8px;
          border: 1px dashed #d5cebf;
          border-radius: 10px;
          background: #fffefb;
        }
        .tab-builder-string-label,
        .tab-builder-slice-head,
        .tab-builder-slice-cell {
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid #dbd4c7;
          background: white;
        }
        .tab-builder-string-label {
          font-weight: 700;
          min-width: 36px;
          font-family: Consolas, "Courier New", monospace;
          font-size: 0.83rem;
        }
        .tab-builder-slice-head {
          font-size: 0.72rem;
          color: #666;
          min-width: 56px;
          user-select: none;
          cursor: pointer;
          position: relative;
        }
        .tab-builder-slice-head.selected,
        .tab-builder-slice-cell.selected {
          background: #d9f0ee;
          border-color: #7ab8b1;
        }
        .tab-builder-slice-head.bar-after::after,
        .tab-builder-slice-cell.bar-after::after {
          content: "";
          position: absolute;
          right: -6px;
          top: -4px;
          bottom: -4px;
          width: 0;
          border-right: 2px solid #164e63;
          pointer-events: none;
          z-index: 3;
        }
        .tab-builder-slice-cell {
          padding: 0;
          min-width: 56px;
          position: relative;
        }
        .tab-builder-slice-cell input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: none;
          text-align: center;
          font-family: Consolas, "Courier New", monospace;
          font-size: 0.84rem;
          border-radius: 6px;
          background: transparent;
          padding: 0 2px;
        }
        .tab-builder-slice-cell.has-content {
          background: #fffdfa;
        }
        .tab-builder-slice-cell.rhythm-row,
        .tab-builder-string-label.rhythm-row {
          border-top-width: 2px;
          border-top-color: #8ca6a3;
        }
        .tab-builder-preview,
        .tab-builder-export {
          margin-top: 12px;
          background: #fffdf9;
          border: 1px solid #dbd4c7;
          border-radius: 12px;
          padding: 10px;
        }
        .tab-builder-preview h3,
        .tab-builder-export h3 {
          margin: 0 0 8px;
          font-size: 0.95rem;
          color: #666;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .tab-builder-export textarea {
          width: 100%;
          min-height: 230px;
          resize: vertical;
          border-radius: 8px;
          border: 1px solid #dbd4c7;
          padding: 10px;
          font-family: Consolas, "Courier New", monospace;
          font-size: 0.92rem;
          background: #fcfcfc;
        }
        .tab-builder-hint {
          margin-top: 8px;
          color: #666;
          font-size: 0.88rem;
        }
        `;

        document.head.appendChild(style);
    }

    function buildMarkup(root) {
        root.innerHTML = `
        <div class="tab-builder-view">
          <div class="tab-builder-meta">
            <label>Tuning <input data-role="tuning" value="E A D G B E"></label>
            <label>Time <input data-role="time" value="4/4"></label>
            <label>Key (optional) <input data-role="key" placeholder="e.g. Dmin"></label>
            <span class="tab-builder-status" data-role="status">No slice selected</span>
          </div>

          <div class="tab-builder-toolbar">
            <button data-action="insert-slice" class="primary">Insert Slice After Selection</button>
            <button data-action="append-slice">Append Slice</button>
            <button data-action="delete-slice" class="danger">Delete Selected Slice</button>
            <button data-action="toggle-bar" class="warn">Toggle Bar After Selected</button>
            <button data-action="finish-bar">Finish Bar After Selected</button>
            <button data-action="clear-all">Clear All</button>
            <button data-action="build-export" class="primary">Build Export</button>
            <button data-action="copy-export">Copy Export</button>
            <button data-action="download-export">Download .txt</button>
          </div>

          <div class="tab-builder-board-wrap">
            <div class="tab-builder-board" data-role="board"></div>
          </div>

          <div class="tab-builder-preview">
            <h3>Rendered Preview</h3>
            <div data-role="preview"></div>
          </div>

          <div class="tab-builder-export">
            <h3>Built Export</h3>
            <textarea data-role="export" spellcheck="false" placeholder="Export appears here"></textarea>
            <div class="tab-builder-hint">Tips: The R row is rhythm per slice and exports as the 7th tab line. Build Export refreshes both export text and preview with playback controls.</div>
          </div>
        </div>`;
    }

    function initTabBuilderView(container) {
        if (!container || container.dataset.tabBuilderReady === '1') return;
        ensureStyles();
        buildMarkup(container);

        const STRING_COUNT = 6;
        const VISUAL_ROWS = [
            { kind: 'string', stringIndex: 0, label: 'E' },
            { kind: 'string', stringIndex: 1, label: 'B' },
            { kind: 'string', stringIndex: 2, label: 'G' },
            { kind: 'string', stringIndex: 3, label: 'D' },
            { kind: 'string', stringIndex: 4, label: 'A' },
            { kind: 'string', stringIndex: 5, label: 'E' },
            { kind: 'rhythm', label: 'R' }
        ];
        const MIN_VISUAL_SLICES_PER_ROW = 8;
        const MAX_VISUAL_SLICES_PER_ROW = 64;
        const LABEL_COLUMN_WIDTH = 36;
        const SLICE_COLUMN_WIDTH = 56;
        const GRID_GAP = 6;
        const ROW_SIDE_PADDING = 16;

        const board = container.querySelector('[data-role="board"]');
        const boardWrap = container.querySelector('.tab-builder-board-wrap');
        const status = container.querySelector('[data-role="status"]');
        const exportOutput = container.querySelector('[data-role="export"]');
        const previewRoot = container.querySelector('[data-role="preview"]');
        const tuningInput = container.querySelector('[data-role="tuning"]');
        const timeInput = container.querySelector('[data-role="time"]');
        const keyInput = container.querySelector('[data-role="key"]');

        const state = {
            slices: [createEmptySlice()],
            selectedSlice: null
        };

        function createEmptySlice() {
            return {
                strings: Array(STRING_COUNT).fill(''),
                rhythm: '',
                barAfter: false
            };
        }

        function isSliceEmpty(slice) {
            const hasStringContent = slice.strings.some(v => !!(v && v.trim()));
            const hasRhythmContent = !!(slice.rhythm && slice.rhythm.trim());
            return !hasStringContent && !hasRhythmContent;
        }

        function sanitizeToken(value) {
            return (value || '').replace(/\s+/g, ' ').trim();
        }

        function ensureTrailingEmptySlice() {
            if (state.slices.length === 0) {
                state.slices.push(createEmptySlice());
                return;
            }

            const hasNonEmpty = state.slices.some(slice => !isSliceEmpty(slice));
            const lastSlice = state.slices[state.slices.length - 1];

            if (hasNonEmpty && !isSliceEmpty(lastSlice)) {
                state.slices.push(createEmptySlice());
            }
        }

        function clampSelection() {
            if (state.selectedSlice === null) return;
            if (state.selectedSlice < 0) state.selectedSlice = 0;
            if (state.selectedSlice >= state.slices.length) {
                state.selectedSlice = state.slices.length - 1;
            }
        }

        function updateStatus() {
            if (state.selectedSlice === null) {
                status.textContent = 'No slice selected';
                return;
            }

            const slice = state.slices[state.selectedSlice];
            const bar = slice && slice.barAfter ? ', bar after' : '';
            status.textContent = 'Selected slice: ' + (state.selectedSlice + 1) + bar;
        }

        function selectSlice(index) {
            if (state.selectedSlice === index) {
                return;
            }
            state.selectedSlice = index;
            updateStatus();
            applySelectionClasses();
        }

        function applySelectionClasses() {
            const selectedIndex = state.selectedSlice;

            board.querySelectorAll('.tab-builder-slice-head[data-slice-index]').forEach(function (el) {
                const idx = parseInt(el.getAttribute('data-slice-index'), 10);
                el.classList.toggle('selected', idx === selectedIndex);
            });

            board.querySelectorAll('.tab-builder-slice-cell[data-slice-index]').forEach(function (el) {
                const idx = parseInt(el.getAttribute('data-slice-index'), 10);
                el.classList.toggle('selected', idx === selectedIndex);
            });
        }

        function focusCell(sliceIndex, rowIndex) {
            const selector = 'input[data-slice="' + sliceIndex + '"][data-row="' + rowIndex + '"]';
            const input = board.querySelector(selector);
            if (input) input.focus();
        }

        function getDynamicSlicesPerRow() {
            if (!boardWrap) return 23;

            const wrapStyles = window.getComputedStyle(boardWrap);
            const wrapPaddingLeft = parseFloat(wrapStyles.paddingLeft) || 0;
            const wrapPaddingRight = parseFloat(wrapStyles.paddingRight) || 0;
            const availableWidth = Math.max(320, boardWrap.clientWidth - wrapPaddingLeft - wrapPaddingRight);
            const usableWidth = Math.max(0, availableWidth - ROW_SIDE_PADDING);

            const perRow = Math.floor((usableWidth - LABEL_COLUMN_WIDTH + GRID_GAP) / (SLICE_COLUMN_WIDTH + GRID_GAP));
            if (!Number.isFinite(perRow) || perRow <= 0) {
                return 23;
            }

            return Math.max(MIN_VISUAL_SLICES_PER_ROW, Math.min(MAX_VISUAL_SLICES_PER_ROW, perRow));
        }

        function buildVisualRows() {
            const slicesPerRow = getDynamicSlicesPerRow();
            const allSliceIndexes = [];
            for (let i = 0; i < state.slices.length; i++) {
                allSliceIndexes.push(i);
            }

            if (allSliceIndexes.length === 0) {
                return [[0]];
            }

            const rows = [];
            for (let i = 0; i < allSliceIndexes.length; i += slicesPerRow) {
                rows.push(allSliceIndexes.slice(i, i + slicesPerRow));
            }

            return rows;
        }

        function render() {
            clampSelection();
            board.innerHTML = '';

            const visualRows = buildVisualRows();
            visualRows.forEach(function (rowSlices) {
                const row = document.createElement('div');
                row.className = 'tab-builder-row';
                row.style.gridTemplateColumns = '36px repeat(' + rowSlices.length + ', minmax(52px, 56px))';
                row.style.gridTemplateRows = '30px repeat(' + VISUAL_ROWS.length + ', 30px)';

                const topLeft = document.createElement('div');
                topLeft.className = 'tab-builder-slice-head';
                topLeft.textContent = '#';
                topLeft.style.minWidth = '36px';
                topLeft.style.fontWeight = '700';
                row.appendChild(topLeft);

                rowSlices.forEach(function (sliceIndex) {
                    const slice = state.slices[sliceIndex];
                    const head = document.createElement('div');
                    head.className = 'tab-builder-slice-head';
                    head.setAttribute('data-slice-index', String(sliceIndex));
                    head.textContent = String(sliceIndex + 1);
                    if (state.selectedSlice === sliceIndex) head.classList.add('selected');
                    if (slice.barAfter) head.classList.add('bar-after');
                    head.addEventListener('click', function () {
                        selectSlice(sliceIndex);
                    });
                    row.appendChild(head);
                });

                for (let rowIndex = 0; rowIndex < VISUAL_ROWS.length; rowIndex++) {
                    const visualRow = VISUAL_ROWS[rowIndex];
                    const label = document.createElement('div');
                    label.className = 'tab-builder-string-label';
                    label.textContent = visualRow.label;
                    if (visualRow.kind === 'rhythm') {
                        label.classList.add('rhythm-row');
                    }
                    row.appendChild(label);

                    rowSlices.forEach(function (sliceIndex) {
                        const slice = state.slices[sliceIndex];
                        const cell = document.createElement('div');
                        cell.className = 'tab-builder-slice-cell';
                        cell.setAttribute('data-slice-index', String(sliceIndex));
                        if (!isSliceEmpty(slice)) cell.classList.add('has-content');
                        if (state.selectedSlice === sliceIndex) cell.classList.add('selected');
                        if (slice.barAfter) cell.classList.add('bar-after');
                        if (visualRow.kind === 'rhythm') cell.classList.add('rhythm-row');

                        const input = document.createElement('input');
                        if (visualRow.kind === 'rhythm') {
                            input.value = slice.rhythm || '';
                        } else {
                            input.value = slice.strings[visualRow.stringIndex];
                        }
                        input.setAttribute('data-slice', String(sliceIndex));
                        input.setAttribute('data-row', String(rowIndex));
                        input.placeholder = '-';
                        input.spellcheck = false;

                        input.addEventListener('focus', function () {
                            selectSlice(sliceIndex);
                        });
                        input.addEventListener('click', function () {
                            selectSlice(sliceIndex);
                        });

                        cell.addEventListener('click', function () {
                            selectSlice(sliceIndex);
                            input.focus();
                        });

                        input.addEventListener('input', function () {
                            if (visualRow.kind === 'rhythm') {
                                state.slices[sliceIndex].rhythm = input.value;
                            } else {
                                state.slices[sliceIndex].strings[visualRow.stringIndex] = input.value;
                            }
                            const hadTrailingEmpty = state.slices.length > 0 && isSliceEmpty(state.slices[state.slices.length - 1]);
                            ensureTrailingEmptySlice();
                            const hasTrailingEmpty = state.slices.length > 0 && isSliceEmpty(state.slices[state.slices.length - 1]);

                            if (!hadTrailingEmpty && hasTrailingEmpty) {
                                render();
                                focusCell(sliceIndex, rowIndex);
                            }
                        });

                        input.addEventListener('keydown', function (event) {
                            if (event.key === 'ArrowRight' && sliceIndex < state.slices.length - 1) {
                                event.preventDefault();
                                focusCell(sliceIndex + 1, rowIndex);
                            }
                            if (event.key === 'ArrowLeft' && sliceIndex > 0) {
                                event.preventDefault();
                                focusCell(sliceIndex - 1, rowIndex);
                            }
                            if (event.key === 'ArrowUp' && rowIndex > 0) {
                                event.preventDefault();
                                focusCell(sliceIndex, rowIndex - 1);
                            }
                            if (event.key === 'ArrowDown' && rowIndex < VISUAL_ROWS.length - 1) {
                                event.preventDefault();
                                focusCell(sliceIndex, rowIndex + 1);
                            }
                        });

                        cell.appendChild(input);
                        row.appendChild(cell);
                    });
                }

                board.appendChild(row);
            });

            updateStatus();
        }

        function getInsertIndexAfterSelection() {
            if (state.selectedSlice === null) {
                return state.slices.length;
            }
            return state.selectedSlice + 1;
        }

        function insertSlice(afterSelected) {
            const index = afterSelected ? getInsertIndexAfterSelection() : state.slices.length;
            let carryBarMarker = false;

            if (
                afterSelected &&
                state.selectedSlice !== null &&
                state.selectedSlice >= 0 &&
                state.selectedSlice < state.slices.length &&
                state.slices[state.selectedSlice].barAfter
            ) {
                carryBarMarker = true;
                state.slices[state.selectedSlice].barAfter = false;
            }

            state.slices.splice(index, 0, createEmptySlice());
            if (carryBarMarker) {
                state.slices[index].barAfter = true;
            }

            state.selectedSlice = index;
            ensureTrailingEmptySlice();
            render();
        }

        function deleteSelectedSlice() {
            if (state.selectedSlice === null) return;
            if (state.slices.length === 1) {
                state.slices[0] = createEmptySlice();
                state.selectedSlice = 0;
                render();
                return;
            }

            state.slices.splice(state.selectedSlice, 1);
            if (state.selectedSlice >= state.slices.length) {
                state.selectedSlice = state.slices.length - 1;
            }
            ensureTrailingEmptySlice();
            render();
        }

        function toggleBarAfterSelected(forceOn) {
            if (state.selectedSlice === null) return;
            if (state.selectedSlice < 0 || state.selectedSlice >= state.slices.length) return;

            if (typeof forceOn === 'boolean') {
                state.slices[state.selectedSlice].barAfter = forceOn;
            } else {
                state.slices[state.selectedSlice].barAfter = !state.slices[state.selectedSlice].barAfter;
            }

            render();
        }

        function buildTabLines() {
            const slicesToExport = state.slices.filter(function (slice, idx) {
                if (!isSliceEmpty(slice)) return true;
                return idx !== state.slices.length - 1;
            });

            if (slicesToExport.length === 0) {
                return Array(STRING_COUNT + 1).fill('|-|');
            }

            const lines = Array(STRING_COUNT + 1).fill('').map(function () {
                return '|';
            });

            slicesToExport.forEach(function (slice) {
                const normalized = slice.strings.map(function (raw) {
                    const token = sanitizeToken(raw);
                    return token || '-';
                });
                const normalizedRhythm = sanitizeToken(slice.rhythm) || '-';
                const width = Math.max(1, normalizedRhythm.length, ...normalized.map(function (v) { return v.length; }));

                for (let i = 0; i < STRING_COUNT; i++) {
                    lines[i] += '-';
                    lines[i] += normalized[i].padEnd(width, '-');
                    if (slice.barAfter) {
                        lines[i] += '-|';
                    }
                }

                const rhythmLineIndex = STRING_COUNT;
                lines[rhythmLineIndex] += '-';
                lines[rhythmLineIndex] += normalizedRhythm.padEnd(width, '-');
                if (slice.barAfter) {
                    lines[rhythmLineIndex] += '-|';
                }
            });

            return lines.map(function (line) {
                return line.endsWith('|') ? line : line + '|';
            });
        }

        function buildExportText() {
            const contentLines = buildTabLines();
            const tuning = tuningInput.value.trim() || 'E A D G B E';
            const time = timeInput.value.trim() || '4/4';
            const key = keyInput.value.trim();

            const out = [];
            out.push('```tabulature');
            out.push('{');
            out.push('  "tuning" : "' + tuning.replace(/"/g, '\\"') + '",');
            if (key) {
                out.push('  "key" : "' + key.replace(/"/g, '\\"') + '",');
            }
            out.push('  "time": "' + time.replace(/"/g, '\\"') + '",');
            out.push('  "content":[');

            contentLines.forEach(function (line, idx) {
                const comma = idx === contentLines.length - 1 ? '' : ',';
                out.push('    "' + line.replace(/"/g, '\\"') + '"' + comma);
            });

            out.push('  ]');
            out.push('}');
            out.push('```');
            return out.join('\n');
        }

        function rebuildExport() {
            exportOutput.value = buildExportText();
        }

        function updateRenderedPreview() {
            const contentLines = buildTabLines();
            const config = {
                tuning: tuningInput.value.trim() || 'E A D G B E',
                time: timeInput.value.trim() || '4/4',
                content: contentLines
            };
            const key = keyInput.value.trim();
            if (key) config.key = key;

            previewRoot.innerHTML = '';
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = 'language-tabulature';
            code.textContent = JSON.stringify(config, null, 2);
            pre.appendChild(code);
            previewRoot.appendChild(pre);

            if (typeof window.initTabulatureEmbeds === 'function') {
                window.initTabulatureEmbeds(previewRoot);
            }
            if (window.RhythmPlayback && typeof window.RhythmPlayback.initializePlaybackControls === 'function') {
                window.RhythmPlayback.initializePlaybackControls();
            }
        }

        function buildExportAndPreview() {
            rebuildExport();
            updateRenderedPreview();
        }

        function copyExport() {
            buildExportAndPreview();
            exportOutput.select();
            exportOutput.setSelectionRange(0, exportOutput.value.length);
            navigator.clipboard.writeText(exportOutput.value).catch(function () {
                document.execCommand('copy');
            });
        }

        function downloadExport() {
            buildExportAndPreview();
            const blob = new Blob([exportOutput.value], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'tabulature-export.txt';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
        }

        container.querySelector('[data-action="insert-slice"]').addEventListener('click', function () { insertSlice(true); });
        container.querySelector('[data-action="append-slice"]').addEventListener('click', function () { insertSlice(false); });
        container.querySelector('[data-action="delete-slice"]').addEventListener('click', deleteSelectedSlice);
        container.querySelector('[data-action="toggle-bar"]').addEventListener('click', function () { toggleBarAfterSelected(); });
        container.querySelector('[data-action="finish-bar"]').addEventListener('click', function () { toggleBarAfterSelected(true); });
        container.querySelector('[data-action="build-export"]').addEventListener('click', buildExportAndPreview);
        container.querySelector('[data-action="copy-export"]').addEventListener('click', copyExport);
        container.querySelector('[data-action="download-export"]').addEventListener('click', downloadExport);
        container.querySelector('[data-action="clear-all"]').addEventListener('click', function () {
            state.slices = [createEmptySlice()];
            state.selectedSlice = 0;
            render();
            buildExportAndPreview();
        });

        window.addEventListener('resize', function () {
            render();
        });

        render();
        buildExportAndPreview();
        container.dataset.tabBuilderReady = '1';
    }

    window.initTabBuilderView = function (scopeRoot) {
        const root = scopeRoot || document;
        let mount = root.querySelector('#tab-builder-mount');

        // Fallback: if markdown escaped/removed the HTML mount element,
        // create one directly in the markdown container.
        if (!mount && scopeRoot && scopeRoot.nodeType === 1) {
            mount = document.createElement('div');
            mount.id = 'tab-builder-mount';
            scopeRoot.innerHTML = '';
            scopeRoot.appendChild(mount);
        }

        if (!mount) return;
        initTabBuilderView(mount);
    };
})();
