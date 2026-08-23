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
                    position: sticky;
                      top: 20px;
                    z-index: 40;
                    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
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

                .tab-builder-slice-head.line-break-after::before,
                .tab-builder-slice-cell.line-break-after::before {
                    content: "";
                    position: absolute;
                    right: -6px;
                    top: -4px;
                    bottom: -4px;
                    width: 0;
                    border-right: 2px dashed #7a8a88;
                    pointer-events: none;
                    z-index: 2;
                }

                .tab-builder-slice-head.bar-after.line-break-after::before,
                .tab-builder-slice-cell.bar-after.line-break-after::before {
                    right: -11px;
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
            <button data-action="toggle-line-break" class="warn">Toggle Line Break After Selected</button>
            <button data-action="clear-all">Clear All</button>
            <button data-action="build-export" class="primary">Build Export</button>
            <button data-action="copy-export">Copy Export</button>
                        <button data-action="import-tab">Import Tab</button>
            <button data-action="download-export">Download .txt</button>
                        <input type="file" data-role="import-file" accept=".txt,.md,.json,text/plain,application/json" style="display:none;" />
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
        const importFileInput = container.querySelector('[data-role="import-file"]');

        const state = {
            slices: [createEmptySlice()],
            selectedSlice: null,
            nonEmptySliceCount: 0,
            visualSlicesPerRow: 23
        };

        function createEmptySlice() {
            return {
                strings: Array(STRING_COUNT).fill(''),
                rhythm: '',
                barAfter: false,
                lineBreakAfter: false
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

        function escapeHtml(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function ensureTrailingEmptySlice() {
            if (state.slices.length === 0) {
                state.slices.push(createEmptySlice());
                return;
            }

            const lastSlice = state.slices[state.slices.length - 1];

            if (state.nonEmptySliceCount > 0 && !isSliceEmpty(lastSlice)) {
                state.slices.push(createEmptySlice());
            }
        }

        function getSlicesForExport() {
            const slices = state.slices.filter(function (slice, idx) {
                if (!isSliceEmpty(slice)) return true;
                return idx !== state.slices.length - 1;
            });

            return slices.map(function (slice) {
                return {
                    strings: slice.strings.map(function (value) {
                        return value == null ? '' : String(value);
                    }),
                    rhythm: slice.rhythm == null ? '' : String(slice.rhythm),
                    barAfter: !!slice.barAfter,
                    lineBreakAfter: !!slice.lineBreakAfter
                };
            });
        }

        function getSliceExportWidth(slice) {
            const normalized = slice.strings.map(function (raw) {
                const token = sanitizeToken(raw);
                return token || '-';
            });
            const normalizedRhythm = sanitizeToken(slice.rhythm) || '-';
            return Math.max(1, normalizedRhythm.length, ...normalized.map(function (v) { return v.length; }));
        }

        function splitContentIntoSections(contentLines) {
            const sections = [];
            let current = [];

            for (let i = 0; i < contentLines.length; i++) {
                const line = contentLines[i];
                if (line === '' || line == null) {
                    if (current.length > 0) {
                        sections.push(current);
                        current = [];
                    }
                } else {
                    current.push(String(line));
                }
            }

            if (current.length > 0) {
                sections.push(current);
            }

            return sections;
        }

        function parseSlicesFromContent(contentLines, sliceWidths) {
            if (!Array.isArray(contentLines)) return null;

            const sections = splitContentIntoSections(contentLines);
            if (sections.length === 0) return [];

            const widths = Array.isArray(sliceWidths)
                ? sliceWidths.map(function (w) { return parseInt(w, 10); })
                : [];
            let widthIndex = 0;
            const parsedSlices = [];

            for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
                const section = sections[sectionIndex];
                if (section.length !== 7) {
                    return null;
                }

                const stringLines = section.slice(0, 6);
                const rhythmLine = section[6];
                const lineLength = stringLines[0].length;

                if (!stringLines.every(function (line) { return line.length === lineLength; }) || rhythmLine.length !== lineLength) {
                    return null;
                }

                if (lineLength < 2 || stringLines[0][0] !== '|' || stringLines[0][lineLength - 1] !== '|') {
                    return null;
                }

                let cursor = 1;
                let sectionSliceCount = 0;

                while (cursor < lineLength - 1) {
                    const width = widths[widthIndex];
                    if (!Number.isFinite(width) || width <= 0) {
                        return null;
                    }

                    if (cursor + 1 + width > lineLength - 1) {
                        return null;
                    }

                    const slice = createEmptySlice();

                    for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex++) {
                        const line = stringLines[stringIndex];
                        if (line[cursor] !== '-') {
                            return null;
                        }
                        const rawToken = line.slice(cursor + 1, cursor + 1 + width);
                        const token = rawToken.replace(/-+$/g, '');
                        slice.strings[stringIndex] = token === '-' ? '' : token;
                    }

                    if (rhythmLine[cursor] !== '-') {
                        return null;
                    }

                    const rawRhythm = rhythmLine.slice(cursor + 1, cursor + 1 + width);
                    const rhythmToken = rawRhythm.replace(/-+$/g, '');
                    slice.rhythm = rhythmToken === '-' ? '' : rhythmToken;

                    const afterTokenIndex = cursor + 1 + width;
                    const barAfter =
                        afterTokenIndex + 1 < lineLength &&
                        stringLines[0][afterTokenIndex] === '-' &&
                        stringLines[0][afterTokenIndex + 1] === '|';

                    // If one line has a bar marker, all lines should match.
                    if (barAfter) {
                        for (let i = 1; i < STRING_COUNT; i++) {
                            if (stringLines[i][afterTokenIndex] !== '-' || stringLines[i][afterTokenIndex + 1] !== '|') {
                                return null;
                            }
                        }
                        if (rhythmLine[afterTokenIndex] !== '-' || rhythmLine[afterTokenIndex + 1] !== '|') {
                            return null;
                        }
                    }

                    slice.barAfter = barAfter;
                    parsedSlices.push(slice);
                    sectionSliceCount += 1;
                    widthIndex += 1;

                    cursor = afterTokenIndex + (barAfter ? 2 : 0);
                }

                if (sectionSliceCount > 0) {
                    parsedSlices[parsedSlices.length - 1].lineBreakAfter = true;
                }
            }

            if (parsedSlices.length > 0) {
                parsedSlices[parsedSlices.length - 1].lineBreakAfter = false;
            }

            if (widths.length !== widthIndex) {
                return null;
            }

            return parsedSlices;
        }

        function extractJsonPayload(text) {
            const raw = (text || '').trim();
            if (!raw) return '';

            const fencedBlocks = [];
            const fencedRegex = /```([\w-]*)\s*([\s\S]*?)```/g;
            let match;
            while ((match = fencedRegex.exec(raw)) !== null) {
                fencedBlocks.push({
                    language: (match[1] || '').toLowerCase(),
                    body: (match[2] || '').trim()
                });
            }

            if (fencedBlocks.length > 0) {
                const preferred = fencedBlocks.find(function (block) {
                    return block.language === 'tabulature' && block.body.includes('"builderImportMeta"');
                }) || fencedBlocks.find(function (block) {
                    return block.body.includes('"builderImportMeta"') && block.body.includes('"content"');
                }) || fencedBlocks.find(function (block) {
                    return block.language === 'tabulature';
                }) || fencedBlocks[0];

                if (preferred && preferred.body) {
                    return preferred.body;
                }
            }

            const firstBrace = raw.indexOf('{');
            const lastBrace = raw.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                return raw.slice(firstBrace, lastBrace + 1);
            }

            return raw;
        }

        function importTabFromText(rawText) {
            const jsonPayload = extractJsonPayload(rawText);
            if (!jsonPayload) {
                window.alert('Nothing to import. Paste a tabulature export first.');
                return;
            }

            let parsed;
            try {
                parsed = JSON.parse(jsonPayload);
            } catch (error) {
                window.alert('Import failed: invalid JSON payload.');
                return;
            }

            const importMeta = parsed.builderImportMeta || {};
            const importedSlices = parseSlicesFromContent(parsed.content, importMeta.sliceWidths);
            if (importedSlices === null) {
                status.textContent = 'Import failed: invalid tab payload';
                return;
            }

            state.slices = importedSlices.length > 0 ? importedSlices : [createEmptySlice()];

            if (typeof parsed.tuning === 'string' && parsed.tuning.trim()) {
                tuningInput.value = parsed.tuning;
            }
            if (typeof parsed.time === 'string' && parsed.time.trim()) {
                timeInput.value = parsed.time;
            }
            if (typeof parsed.key === 'string') {
                keyInput.value = parsed.key;
            } else {
                keyInput.value = '';
            }

            recalculateNonEmptySliceCount();
            ensureTrailingEmptySlice();
            state.selectedSlice = 0;

            render();
            buildExportAndPreview();
        }

        function importTabFromSelectedFile() {
            if (!importFileInput) return;
            importFileInput.value = '';
            importFileInput.click();
        }

        function handleImportFileChange(event) {
            const input = event.target;
            const file = input && input.files && input.files[0] ? input.files[0] : null;
            if (!file) return;

            file.text().then(function (text) {
                importTabFromText(text);
            }).catch(function () {
                status.textContent = 'Import failed: could not read file';
            });
        }

        function recalculateNonEmptySliceCount() {
            let count = 0;
            for (let i = 0; i < state.slices.length; i++) {
                if (!isSliceEmpty(state.slices[i])) {
                    count += 1;
                }
            }
            state.nonEmptySliceCount = count;
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
            const breakLabel = slice && slice.lineBreakAfter ? ', line break after' : '';
            status.textContent = 'Selected slice: ' + (state.selectedSlice + 1) + bar + breakLabel;
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

        function updateSliceHasContentClasses(sliceIndex, hasContent) {
            if (typeof hasContent !== 'boolean') {
                const slice = state.slices[sliceIndex];
                if (!slice) return;
                hasContent = !isSliceEmpty(slice);
            }

            board.querySelectorAll('.tab-builder-slice-cell[data-slice-index="' + sliceIndex + '"]').forEach(function (el) {
                el.classList.toggle('has-content', hasContent);
            });
        }

        function handleBoardFocusIn(event) {
            const input = event.target.closest('.tab-builder-slice-cell input[data-slice][data-row]');
            if (!input) return;
            const sliceIndex = parseInt(input.getAttribute('data-slice'), 10);
            if (!Number.isNaN(sliceIndex)) {
                selectSlice(sliceIndex);
            }
        }

        function handleBoardClick(event) {
            const head = event.target.closest('.tab-builder-slice-head[data-slice-index]');
            if (head && board.contains(head)) {
                const sliceIndex = parseInt(head.getAttribute('data-slice-index'), 10);
                if (!Number.isNaN(sliceIndex)) {
                    selectSlice(sliceIndex);
                }
                return;
            }

            const cell = event.target.closest('.tab-builder-slice-cell[data-slice-index]');
            if (!cell || !board.contains(cell)) return;

            const sliceIndex = parseInt(cell.getAttribute('data-slice-index'), 10);
            if (!Number.isNaN(sliceIndex)) {
                selectSlice(sliceIndex);
            }

            const input = cell.querySelector('input[data-slice][data-row]');
            if (input) input.focus();
        }

        function handleBoardInput(event) {
            const input = event.target.closest('.tab-builder-slice-cell input[data-slice][data-row]');
            if (!input || !board.contains(input)) return;

            const sliceIndex = parseInt(input.getAttribute('data-slice'), 10);
            const rowIndex = parseInt(input.getAttribute('data-row'), 10);
            if (Number.isNaN(sliceIndex) || Number.isNaN(rowIndex)) return;

            const visualRow = VISUAL_ROWS[rowIndex];
            if (!visualRow) return;

            const slice = state.slices[sliceIndex];
            if (!slice) return;
            const wasEmpty = isSliceEmpty(slice);

            if (visualRow.kind === 'rhythm') {
                slice.rhythm = input.value;
            } else {
                slice.strings[visualRow.stringIndex] = input.value;
            }

            const isEmpty = isSliceEmpty(slice);
            if (wasEmpty !== isEmpty) {
                state.nonEmptySliceCount += isEmpty ? -1 : 1;
            }

            if (wasEmpty !== isEmpty) {
                updateSliceHasContentClasses(sliceIndex, !isEmpty);
            }

            const previousSliceCount = state.slices.length;
            ensureTrailingEmptySlice();
            const didAppendTrailingSlice = state.slices.length > previousSliceCount;

            if (didAppendTrailingSlice) {
                const didIncrementalAppend = tryAppendTrailingSliceIncremental(previousSliceCount);
                if (!didIncrementalAppend) {
                    render();
                }
                focusCell(sliceIndex, rowIndex, true);
            }
        }

        function handleBoardKeyDown(event) {
            const input = event.target.closest('.tab-builder-slice-cell input[data-slice][data-row]');
            if (!input || !board.contains(input)) return;

            const sliceIndex = parseInt(input.getAttribute('data-slice'), 10);
            const rowIndex = parseInt(input.getAttribute('data-row'), 10);
            if (Number.isNaN(sliceIndex) || Number.isNaN(rowIndex)) return;

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
        }

        function focusCell(sliceIndex, rowIndex, moveCaretToEnd) {
            const selector = 'input[data-slice="' + sliceIndex + '"][data-row="' + rowIndex + '"]';
            const input = board.querySelector(selector);
            if (!input) return;

            input.focus();

            // After append-triggered rerenders the browser can place the caret at
            // the start of the restored input; move it to the end so typing 12
            // does not become 21.
            if (moveCaretToEnd) {
                const valueLength = input.value.length;
                try {
                    input.setSelectionRange(valueLength, valueLength);
                } catch (e) {
                    // Ignore non-text input selection errors.
                }
            }
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

        function buildVisualRows(slicesPerRow, totalSlicesOverride) {
            const perRow = Number.isFinite(slicesPerRow) && slicesPerRow > 0
                ? slicesPerRow
                : getDynamicSlicesPerRow();
            const totalSlices = Number.isFinite(totalSlicesOverride) && totalSlicesOverride >= 0
                ? Math.min(state.slices.length, Math.floor(totalSlicesOverride))
                : state.slices.length;

            if (totalSlices === 0) {
                return [[0]];
            }

            const rows = [];
            let currentRow = [];

            for (let i = 0; i < totalSlices; i++) {
                const slice = state.slices[i];
                currentRow.push(i);

                if (currentRow.length >= perRow || (slice && slice.lineBreakAfter)) {
                    rows.push(currentRow);
                    currentRow = [];
                }
            }

            if (currentRow.length > 0) {
                rows.push(currentRow);
            }

            return rows;
        }

        function getRowSliceIndexes(rowIndex, totalSlices, slicesPerRow) {
            const start = rowIndex * slicesPerRow;
            const end = Math.min(start + slicesPerRow, totalSlices);
            const indexes = [];
            for (let i = start; i < end; i++) {
                indexes.push(i);
            }
            return indexes;
        }

        function buildRowMarkup(rowSlices) {
            const htmlParts = [];
            htmlParts.push(
                '<div class="tab-builder-row" style="grid-template-columns:36px repeat(' + rowSlices.length + ', minmax(52px, 56px)); grid-template-rows:30px repeat(' + VISUAL_ROWS.length + ', 30px);">'
            );
            htmlParts.push('<div class="tab-builder-slice-head" style="min-width:36px; font-weight:700;">#</div>');

            rowSlices.forEach(function (sliceIndex) {
                const slice = state.slices[sliceIndex];
                const headClasses = ['tab-builder-slice-head'];
                if (state.selectedSlice === sliceIndex) headClasses.push('selected');
                if (slice.barAfter) headClasses.push('bar-after');
                if (slice.lineBreakAfter) headClasses.push('line-break-after');
                htmlParts.push(
                    '<div class="' + headClasses.join(' ') + '" data-slice-index="' + sliceIndex + '">' + (sliceIndex + 1) + '</div>'
                );
            });

            for (let rowIndex = 0; rowIndex < VISUAL_ROWS.length; rowIndex++) {
                const visualRow = VISUAL_ROWS[rowIndex];
                const labelClasses = ['tab-builder-string-label'];
                if (visualRow.kind === 'rhythm') labelClasses.push('rhythm-row');
                htmlParts.push('<div class="' + labelClasses.join(' ') + '">' + escapeHtml(visualRow.label) + '</div>');

                rowSlices.forEach(function (sliceIndex) {
                    const slice = state.slices[sliceIndex];
                    const cellClasses = ['tab-builder-slice-cell'];
                    if (!isSliceEmpty(slice)) cellClasses.push('has-content');
                    if (state.selectedSlice === sliceIndex) cellClasses.push('selected');
                    if (slice.barAfter) cellClasses.push('bar-after');
                    if (slice.lineBreakAfter) cellClasses.push('line-break-after');
                    if (visualRow.kind === 'rhythm') cellClasses.push('rhythm-row');

                    let inputValue = '';
                    if (visualRow.kind === 'rhythm') {
                        inputValue = slice.rhythm || '';
                    } else {
                        inputValue = slice.strings[visualRow.stringIndex];
                    }

                    htmlParts.push(
                        '<div class="' + cellClasses.join(' ') + '" data-slice-index="' + sliceIndex + '">' +
                            '<input data-slice="' + sliceIndex + '" data-row="' + rowIndex + '" placeholder="-" spellcheck="false" value="' + escapeHtml(inputValue || '') + '">' +
                        '</div>'
                    );
                });
            }

            htmlParts.push('</div>');
            return htmlParts.join('');
        }

        function createRowElementFromMarkup(rowMarkup) {
            const template = document.createElement('template');
            template.innerHTML = rowMarkup;
            return template.content.firstElementChild;
        }

        function tryAppendTrailingSliceIncremental(previousSliceCount) {
            const newSliceCount = state.slices.length;
            if (newSliceCount !== previousSliceCount + 1) return false;

            const currentSlicesPerRow = getDynamicSlicesPerRow();
            if (currentSlicesPerRow !== state.visualSlicesPerRow) {
                state.visualSlicesPerRow = currentSlicesPerRow;
                return false;
            }

            const slicesPerRow = state.visualSlicesPerRow > 0
                ? state.visualSlicesPerRow
                : getDynamicSlicesPerRow();
            const oldRows = buildVisualRows(slicesPerRow, previousSliceCount);
            const newRows = buildVisualRows(slicesPerRow, newSliceCount);
            const oldRowCount = oldRows.length;
            const newRowCount = newRows.length;
            const existingRows = board.querySelectorAll('.tab-builder-row');

            // Guard against stale layout assumptions.
            if (existingRows.length !== oldRowCount) return false;

            if (newRowCount === oldRowCount) {
                const rowSlices = newRows[newRowCount - 1];
                const newRowEl = createRowElementFromMarkup(buildRowMarkup(rowSlices));
                const oldLastRow = existingRows[newRowCount - 1];
                if (!newRowEl || !oldLastRow) return false;
                board.replaceChild(newRowEl, oldLastRow);
                updateStatus();
                return true;
            }

            if (newRowCount === oldRowCount + 1) {
                const rowSlices = newRows[newRowCount - 1];
                const newRowEl = createRowElementFromMarkup(buildRowMarkup(rowSlices));
                if (!newRowEl) return false;
                board.appendChild(newRowEl);
                updateStatus();
                return true;
            }

            return false;
        }

        function render() {
            clampSelection();
            const htmlParts = [];
            const slicesPerRow = getDynamicSlicesPerRow();
            state.visualSlicesPerRow = slicesPerRow;
            const visualRows = buildVisualRows(slicesPerRow);

            visualRows.forEach(function (rowSlices) {
                htmlParts.push(buildRowMarkup(rowSlices));
            });

            board.innerHTML = htmlParts.join('');

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
                state.nonEmptySliceCount = 0;
                state.selectedSlice = 0;
                render();
                return;
            }

            const deletedSlice = state.slices[state.selectedSlice];
            const deletedWasNonEmpty = deletedSlice && !isSliceEmpty(deletedSlice);
            state.slices.splice(state.selectedSlice, 1);
            if (deletedWasNonEmpty) {
                state.nonEmptySliceCount = Math.max(0, state.nonEmptySliceCount - 1);
            }
            if (state.selectedSlice >= state.slices.length) {
                state.selectedSlice = state.slices.length - 1;
            }
            ensureTrailingEmptySlice();
            render();
        }

        function toggleBarAfterSelected(forceOn) {
            if (state.selectedSlice === null) return;
            if (state.selectedSlice < 0 || state.selectedSlice >= state.slices.length) return;
            const slice = state.slices[state.selectedSlice];
            const wasLastSlice = state.selectedSlice === state.slices.length - 1;

            if (typeof forceOn === 'boolean') {
                slice.barAfter = forceOn;
            } else {
                slice.barAfter = !slice.barAfter;
            }

            // Special case: if bar is toggled on at the final slice,
            // add a new empty slice right after the bar.
            if (slice.barAfter && wasLastSlice) {
                state.slices.push(createEmptySlice());
                state.selectedSlice = state.slices.length - 1;
            }

            render();
        }

        function toggleLineBreakAfterSelected(forceOn) {
            if (state.selectedSlice === null) return;
            if (state.selectedSlice < 0 || state.selectedSlice >= state.slices.length) return;

            if (typeof forceOn === 'boolean') {
                state.slices[state.selectedSlice].lineBreakAfter = forceOn;
            } else {
                state.slices[state.selectedSlice].lineBreakAfter = !state.slices[state.selectedSlice].lineBreakAfter;
            }

            render();
            rebuildExport();
        }

        function buildTabLines() {
            const slicesToExport = getSlicesForExport();

            if (slicesToExport.length === 0) {
                return Array(STRING_COUNT + 1).fill('|-|');
            }

            let lines = Array(STRING_COUNT + 1).fill('').map(function () {
                return '|';
            });
            const content = [];

            function flushSection() {
                const sectionLines = lines.map(function (line) {
                    return line.endsWith('|') ? line : line + '|';
                });
                sectionLines.forEach(function (sectionLine) {
                    content.push(sectionLine);
                });
            }

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

                if (slice.lineBreakAfter) {
                    flushSection();
                    content.push('');
                    lines = Array(STRING_COUNT + 1).fill('').map(function () {
                        return '|';
                    });
                }
            });

            const hasContentInCurrentSection = lines.some(function (line) {
                return line !== '|';
            });

            if (hasContentInCurrentSection) {
                flushSection();
            } else if (content.length > 0 && content[content.length - 1] === '') {
                content.pop();
            }

            return content;
        }

        function buildExportText() {
            const contentLines = buildTabLines();
            const slicesForExport = getSlicesForExport();
            const sliceWidthsForImport = slicesForExport.map(getSliceExportWidth);
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

            out.push('  ],');
            out.push('  "builderImportMeta": ' + JSON.stringify({ v: 1, sliceWidths: sliceWidthsForImport }));
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
        container.querySelector('[data-action="toggle-line-break"]').addEventListener('click', function () { toggleLineBreakAfterSelected(); });
        container.querySelector('[data-action="build-export"]').addEventListener('click', buildExportAndPreview);
        container.querySelector('[data-action="copy-export"]').addEventListener('click', copyExport);
        container.querySelector('[data-action="import-tab"]').addEventListener('click', importTabFromSelectedFile);
        container.querySelector('[data-action="download-export"]').addEventListener('click', downloadExport);
        if (importFileInput) {
            importFileInput.addEventListener('change', handleImportFileChange);
        }
        container.querySelector('[data-action="clear-all"]').addEventListener('click', function () {
            state.slices = [createEmptySlice()];
            state.nonEmptySliceCount = 0;
            state.selectedSlice = 0;
            render();
            buildExportAndPreview();
        });

        board.addEventListener('focusin', handleBoardFocusIn);
        board.addEventListener('click', handleBoardClick);
        board.addEventListener('input', handleBoardInput);
        board.addEventListener('keydown', handleBoardKeyDown);

        if (typeof ResizeObserver === 'function' && boardWrap) {
            const boardWrapResizeObserver = new ResizeObserver(function () {
                const currentSlicesPerRow = getDynamicSlicesPerRow();
                if (currentSlicesPerRow !== state.visualSlicesPerRow) {
                    render();
                }
            });
            boardWrapResizeObserver.observe(boardWrap);
        }

        window.addEventListener('resize', function () {
            render();
        });

        recalculateNonEmptySliceCount();
        ensureTrailingEmptySlice();
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
