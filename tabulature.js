/* tabulature.js
   Responsible for rendering guitar tablature from markdown code blocks.
   Parses fenced code blocks with language 'tabulature' and converts them
   into visual guitar tab diagrams using SVG.
*/
(function () {
    'use strict';

    // Configuration constants for tablature rendering
    const TAB_CONFIG = {
        lineHeight: 20,          // Vertical spacing between strings
        characterWidth: 20,      // Width per character in monospace
        fontSize: 14,            // Font size for fret numbers
        stringStrokeWidth: 1.5,  // Width of string lines
        barStrokeWidth: 2,       // Width of vertical bars
        paddingTop: 65,          // Top padding (increased for rhythm stems)
        paddingBottom: 20,       // Bottom padding
        paddingLeft: 40,         // Left padding (space for tuning labels)
        paddingRight: 10,        // Right padding
        stringColor: '#aaa',     // Color for strings
        barColor: '#aaa',        // Color for vertical bars
        numberColor: '#000',     // Color for fret numbers
        fontFamily: 'Courier New, monospace',
        tuningLabelOffset: 25,   // Horizontal offset for tuning labels from left edge
        stemHeight: 50,          // Height of rhythm stems (spacing from tab to rhythm notation)
        stemStrokeWidth: 1.5,    // Width of rhythm stems
        stemColor: '#000',       // Color for rhythm stems
        flagWidth: 8,            // Width of flags/beams
        flagHeight: 6            // Height of flags
    };

    /**
     * Parse rhythm line to extract rhythm symbols and their positions
     * Rhythm line format: "|-h---w-h.-w.-q--------q.-e--e.-t-t-t--------|"
     * Also supports pauses: hp (half pause), qp (quarter pause), etc.
     * Returns array of {symbol, position, isPause} objects
     */
    function parseRhythmLine(rhythmLine) {
        if (!rhythmLine) return [];

        const rhythms = [];
        let i = 0;

        while (i < rhythmLine.length) {
            const char = rhythmLine[i];

            // Skip bars, dashes, and spaces
            if (char === '|' || char === '-' || char === ' ') {
                i++;
                continue;
            }

            // Found a rhythm symbol
            let symbol = char;
            let j = i + 1;

            // Check for pause indicator (e.g., "hp", "qp", "wp", "ep", "tp")
            if (j < rhythmLine.length && rhythmLine[j] === 'p') {
                symbol += 'p';
                j++;
            }

            // Check for dotted note/pause (e.g., "h.", "hp.", "q.")
            if (j < rhythmLine.length && rhythmLine[j] === '.') {
                symbol += '.';
                j++;
            }

            const isPause = symbol.includes('p');

            rhythms.push({
                symbol: symbol,
                position: i,
                isPause: isPause
            });

            i = j;
        }

        return rhythms;
    }

    /**
     * Identify vertical groupings in the tablature
     * A group represents content that appears at the same horizontal position across strings
     */
    function identifyVerticalGroups(lines) {
        const maxLen = Math.max(...lines.map(line => line.length));
        const paddedLines = lines.map(line => line.padEnd(maxLen, '-'));

        const groups = [];
        let i = 0;

        while (i < maxLen) {
            // Check what's at this position across all strings
            const charsAtPos = paddedLines.map(line => line[i]);

            // Count consecutive empty columns (gap)
            if (charsAtPos.every(char => char === '-' || char === ' ')) {
                const gapStart = i;
                while (i < maxLen) {
                    const chars = paddedLines.map(line => line[i]);
                    if (!chars.every(char => char === '-' || char === ' ')) break;
                    i++;
                }
                const gapSize = i - gapStart;

                // Create a gap group to track the size
                groups.push({
                    start: gapStart,
                    end: i,
                    type: 'gap',
                    gapSize: gapSize,
                    content: Array(paddedLines.length).fill('-')
                });
                continue;
            }

            // Find the extent of this group (how many columns it spans)
            let groupEnd = i + 1;

            // Keep extending if ANY string has non-dash/non-bar content
            while (groupEnd < maxLen) {
                const nextChars = paddedLines.map(line => line[groupEnd]);
                // Stop if all strings are empty (dash/space)
                if (nextChars.every(char => char === '-' || char === ' ')) break;
                // Stop if we hit a bar on any string
                if (nextChars.some(char => char === '|')) break;
                groupEnd++;
            }

            // Extract content from each string for this group
            const groupContent = paddedLines.map(line => {
                let content = '';
                for (let j = i; j < groupEnd; j++) {
                    const char = line[j];
                    content += (char === ' ') ? '-' : char;
                }
                // Trim trailing dashes and return
                return content.replace(/-+$/, '') || '-';
            });

            // Determine group type
            let type = 'content';
            if (groupContent.every(c => c === '|')) {
                type = 'bar';
            }

            // Check if this group has actual note content (not just dashes)
            const hasNotes = groupContent.some(c => c !== '-' && c !== '|');

            groups.push({
                start: i,
                end: groupEnd,
                type: type,
                content: groupContent,
                hasNotes: hasNotes
            });

            i = groupEnd;
        }

        return groups;
    }

    /**
     * Assign rhythm symbols to groups
     * Matches non-pause rhythms to note groups and pauses to gaps
     */
    function assignRhythmsToGroups(groups, rhythms) {
        if (!rhythms || rhythms.length === 0) return;

        let rhythmIndex = 0;
        let noteGroupIndex = 0;

        // First pass: assign non-pause rhythms to note groups
        for (let i = 0; i < groups.length && rhythmIndex < rhythms.length; i++) {
            const group = groups[i];

            if (group.hasNotes) {
                // Find next non-pause rhythm
                while (rhythmIndex < rhythms.length && rhythms[rhythmIndex].isPause) {
                    rhythmIndex++;
                }

                if (rhythmIndex < rhythms.length) {
                    group.rhythm = rhythms[rhythmIndex].symbol;
                    group.rhythmIndex = rhythmIndex;
                    rhythmIndex++;
                    noteGroupIndex = i;
                }
            }
        }

        // Second pass: assign pauses to gaps
        rhythmIndex = 0;
        let lastNoteGroupIndex = -1;

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];

            if (group.hasNotes) {
                // Check for pauses between last note and this note
                const pausesToInsert = [];

                while (rhythmIndex < rhythms.length) {
                    if (!rhythms[rhythmIndex].isPause) {
                        // This is the rhythm for the current note group
                        rhythmIndex++;
                        break;
                    } else {
                        // Collect pause
                        pausesToInsert.push(rhythms[rhythmIndex].symbol);
                        rhythmIndex++;
                    }
                }

                // If we have pauses, assign them to the gap before this note
                if (pausesToInsert.length > 0) {
                    // Find the gap before this note group
                    for (let j = Math.max(0, lastNoteGroupIndex + 1); j < i; j++) {
                        if (groups[j].type === 'gap') {
                            groups[j].pauses = pausesToInsert;
                            break;
                        }
                    }
                }

                lastNoteGroupIndex = i;
            }
        }

        // Third pass: handle any remaining pauses after all notes
        const remainingPauses = [];
        while (rhythmIndex < rhythms.length) {
            if (rhythms[rhythmIndex].isPause) {
                remainingPauses.push(rhythms[rhythmIndex].symbol);
            }
            rhythmIndex++;
        }

        if (remainingPauses.length > 0) {
            // Assign to the first gap after the last note, or the last gap
            for (let j = lastNoteGroupIndex + 1; j < groups.length; j++) {
                if (groups[j].type === 'gap') {
                    groups[j].pauses = remainingPauses;
                    break;
                }
            }
        }
    }

    /**
     * Convert vertical groups into aligned tokens for rendering
     */
    function normalizeTableture(lines, rhythmLine) {
        const groups = identifyVerticalGroups(lines);

        // Parse and assign rhythms if provided
        if (rhythmLine) {
            const rhythms = parseRhythmLine(rhythmLine);
            assignRhythmsToGroups(groups, rhythms);
        }

        // Build token arrays where each group creates one token per string
        const tokenLines = Array(lines.length).fill(null).map(() => []);

        for (const group of groups) {
            for (let stringIndex = 0; stringIndex < lines.length; stringIndex++) {
                const content = group.content[stringIndex];

                if (group.type === 'gap') {
                    // Gap - track the size for wider spacing
                    const spacing = group.gapSize > 1 ? 'wide' : 'normal';
                    tokenLines[stringIndex].push({
                        type: 'gap',
                        value: '-',
                        spacing: spacing,
                        rhythm: null,
                        pauses: group.pauses || null
                    });
                } else if (content === '-') {
                    // Empty position - render as dash, preserve rhythm from group
                    tokenLines[stringIndex].push({
                        type: 'dash',
                        value: '-',
                        spacing: 'normal',
                        rhythm: group.rhythm
                    });
                } else if (content === '|') {
                    // Bar position
                    tokenLines[stringIndex].push({type: 'bar', value: '|', rhythm: null});
                } else {
                    // Content (number, letter, symbol, etc.) - attach rhythm if present
                    tokenLines[stringIndex].push({
                        type: 'content',
                        value: content,
                        rhythm: group.rhythm
                    });
                }
            }
        }

        return tokenLines;
    }

    /**
     * Parse tablature content from the JSON structure
     * Expected format:
     * {
     *   tuning: "E A D G B E",  // optional
     *   content: [
     *     "|---------|",
     *     "|---------|",
     *     "|---------|",
     *     "|-----2---|",
     *     "|--1--1---|",
     *     "|--0------3-|",
     *     "",  // Empty string for line break
     *     "|---------|",
     *     ... (next section)
     *   ]
     * }
     */
    function parseTabulature(config) {
        if (!config || !Array.isArray(config.content)) {
            console.warn('Invalid tabulature config: content array required');
            return null;
        }

        const lines = config.content;

        // Parse tuning if provided
        let tuning = null;
        if (config.tuning) {
            tuning = config.tuning.trim().split(/\s+/);
            if (tuning.length !== 6) {
                console.warn('Invalid tuning: expected 6 notes, got', tuning.length);
                tuning = null;
            } else {
                // Reverse tuning so first note (low E) appears at bottom (string 6)
                tuning = tuning.reverse();
            }
        }

        // Split content into sections by empty strings
        const sections = [];
        let currentSection = [];

        for (const line of lines) {
            if (line === '' || line === null) {
                // Empty line indicates a section break
                if (currentSection.length > 0) {
                    sections.push(currentSection);
                    currentSection = [];
                }
            } else {
                currentSection.push(line);
            }
        }

        // Add the last section if it exists
        if (currentSection.length > 0) {
            sections.push(currentSection);
        }

        // Validate and parse each section
        const parsedSections = [];
        for (const section of sections) {
            let rhythmLine = null;
            let stringLines = section;

            // Check if section has rhythm line (7 lines: 6 strings + 1 rhythm)
            if (section.length === 7) {
                // Last line is the rhythm line
                rhythmLine = section[6];
                stringLines = section.slice(0, 6);
            } else if (section.length !== 6) {
                console.warn('Invalid tabulature section: expected 6 or 7 lines, got', section.length);
                continue;
            }

            // Normalize while preserving vertical alignment and get tokens
            const tokenLines = normalizeTableture(stringLines, rhythmLine);

            // Find the maximum number of tokens
            const maxTokens = Math.max(...tokenLines.map(tokens => tokens.length));

            parsedSections.push({
                tokenLines: tokenLines,
                maxTokens: maxTokens,
                numStrings: tokenLines.length
            });
        }

        if (parsedSections.length === 0) {
            console.warn('No valid tabulature sections found');
            return null;
        }

        return {
            sections: parsedSections,
            tuning: tuning
        };
    }

    /**
     * Render rest symbol for pauses
     */
    function renderRestSymbol(svg, x, rhythm) {
        const centerX = x + TAB_CONFIG.characterWidth / 2;
        const noteHeadY = TAB_CONFIG.paddingTop - 22;  // Note heads close to the tab
        const stemEndY = TAB_CONFIG.paddingTop - TAB_CONFIG.stemHeight;  // Stems extend upward to here
        const centerY = (noteHeadY + stemEndY) / 2;  // Center between note head and stem end

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'rhythm-rest');

        // Determine rest type from rhythm symbol
        const baseRhythm = rhythm.replace('p', '').replace('.', '');

        if (baseRhythm === 'w') {
            // Whole rest - hollow rectangle hanging down
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', centerX - 4);
            rect.setAttribute('y', centerY - 5);
            rect.setAttribute('width', 8);
            rect.setAttribute('height', 4);
            rect.setAttribute('stroke', TAB_CONFIG.stemColor);
            rect.setAttribute('stroke-width', 1.5);
            rect.setAttribute('fill', 'none');
            group.appendChild(rect);
        } else if (baseRhythm === 'h') {
            // Half rest - filled rectangle sitting on line
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', centerX - 4);
            rect.setAttribute('y', centerY + 1);
            rect.setAttribute('width', 8);
            rect.setAttribute('height', 4);
            rect.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(rect);
        } else if (baseRhythm === 'q') {
            // Quarter rest - zigzag/lightning symbol
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${centerX - 3} ${centerY - 8} L ${centerX + 3} ${centerY - 3} L ${centerX - 2} ${centerY} L ${centerX + 4} ${centerY + 8}`;
            path.setAttribute('d', d);
            path.setAttribute('stroke', TAB_CONFIG.stemColor);
            path.setAttribute('stroke-width', 2);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            group.appendChild(path);
        } else if (baseRhythm === 'e') {
            // Eighth rest - diagonal stroke with filled flag
            // Main diagonal stroke
            const stroke = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            stroke.setAttribute('x1', centerX - 3);
            stroke.setAttribute('y1', centerY - 7);
            stroke.setAttribute('x2', centerX + 3);
            stroke.setAttribute('y2', centerY + 7);
            stroke.setAttribute('stroke', TAB_CONFIG.stemColor);
            stroke.setAttribute('stroke-width', 1.5);
            stroke.setAttribute('stroke-linecap', 'round');
            group.appendChild(stroke);

            // Filled flag/blob at the top
            const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${centerX - 3} ${centerY - 7} q 2 -1 4 0 q 2 2 0 4 q -2 1 -4 0 Z`;
            flag.setAttribute('d', d);
            flag.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag);
        } else if (baseRhythm === 's') {
            // Sixteenth rest - diagonal stroke with two filled flags
            // Main diagonal stroke
            const stroke = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            stroke.setAttribute('x1', centerX - 3);
            stroke.setAttribute('y1', centerY - 7);
            stroke.setAttribute('x2', centerX + 3);
            stroke.setAttribute('y2', centerY + 7);
            stroke.setAttribute('stroke', TAB_CONFIG.stemColor);
            stroke.setAttribute('stroke-width', 1.5);
            stroke.setAttribute('stroke-linecap', 'round');
            group.appendChild(stroke);

            // First filled flag/blob at the top
            const flag1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d1 = `M ${centerX - 3} ${centerY - 7} q 2 -1 4 0 q 2 2 0 4 q -2 1 -4 0 Z`;
            flag1.setAttribute('d', d1);
            flag1.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag1);

            // Second filled flag/blob below the first
            const flag2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d2 = `M ${centerX - 1.5} ${centerY - 3} q 2 -1 4 0 q 2 2 0 4 q -2 1 -4 0 Z`;
            flag2.setAttribute('d', d2);
            flag2.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag2);
        } else if (baseRhythm === 't') {
            // Triplet rest - eighth rest with "3" above
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${centerX} ${centerY - 4} L ${centerX - 2} ${centerY} L ${centerX + 2} ${centerY + 4} q 3 2 3 4`;
            path.setAttribute('d', d);
            path.setAttribute('stroke', TAB_CONFIG.stemColor);
            path.setAttribute('stroke-width', 1.5);
            path.setAttribute('fill', 'none');
            group.appendChild(path);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', centerX);
            text.setAttribute('y', centerY - 10);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-family', TAB_CONFIG.fontFamily);
            text.setAttribute('font-size', 10);
            text.setAttribute('fill', TAB_CONFIG.stemColor);
            text.textContent = '3';
            group.appendChild(text);
        }

        // Add dot for dotted rests
        if (rhythm.includes('.')) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', centerX + 8);
            dot.setAttribute('cy', centerY);
            dot.setAttribute('r', 2);
            dot.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(dot);
        }

        svg.appendChild(group);
    }

    /**
     * Render rhythm stem above a note
     */
    function renderRhythmStem(svg, x, rhythm, isFirstOfTriplet, isLastOfTriplet, tripletGroupX) {
        if (!rhythm) return;

        // Check if this is a pause/rest
        if (rhythm.includes('p')) {
            renderRestSymbol(svg, x, rhythm);
            return;
        }

        const stemX = x + TAB_CONFIG.characterWidth / 2;
        const noteHeadY = TAB_CONFIG.paddingTop - 22;  // Note heads close to the tab
        const stemEndY = TAB_CONFIG.paddingTop - TAB_CONFIG.stemHeight;  // Stems extend upward to here

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'rhythm-stem');

        // Draw stem for all notes except whole notes (stem goes upward from note head)
        if (rhythm !== 'w' && rhythm !== 'w.') {
            const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            stem.setAttribute('x1', stemX);
            stem.setAttribute('y1', noteHeadY + 3);  // Start slightly below center to go through note head
            stem.setAttribute('x2', stemX);
            stem.setAttribute('y2', stemEndY);  // End higher up
            stem.setAttribute('stroke', TAB_CONFIG.stemColor);
            stem.setAttribute('stroke-width', TAB_CONFIG.stemStrokeWidth);
            group.appendChild(stem);
        }

        // Add note head for whole and half notes (hollow circle)
        if (rhythm === 'w' || rhythm === 'w.' || rhythm === 'h' || rhythm === 'h.') {
            const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            noteHead.setAttribute('cx', stemX);
            noteHead.setAttribute('cy', noteHeadY);
            noteHead.setAttribute('rx', 4);
            noteHead.setAttribute('ry', 3);
            noteHead.setAttribute('stroke', TAB_CONFIG.stemColor);
            noteHead.setAttribute('stroke-width', 1.5);
            noteHead.setAttribute('fill', 'none');
            group.appendChild(noteHead);
        }

        // Add note head for quarter notes (filled circle)
        if (rhythm === 'q' || rhythm === 'q.') {
            const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            noteHead.setAttribute('cx', stemX);
            noteHead.setAttribute('cy', noteHeadY);
            noteHead.setAttribute('rx', 4);
            noteHead.setAttribute('ry', 3);
            noteHead.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(noteHead);
        }

        // Add note head and flag for eighth notes (filled circle + flag)
        if (rhythm === 'e' || rhythm === 'e.') {
            const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            noteHead.setAttribute('cx', stemX);
            noteHead.setAttribute('cy', noteHeadY);
            noteHead.setAttribute('rx', 4);
            noteHead.setAttribute('ry', 3);
            noteHead.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(noteHead);

            // Add flag (filled curved shape pointing downward from top of stem)
            const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const flagPath = `M ${stemX} ${stemEndY} q ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight} ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight * 2} q ${-TAB_CONFIG.flagWidth * 0.5} ${-TAB_CONFIG.flagHeight} ${-TAB_CONFIG.flagWidth} ${-TAB_CONFIG.flagHeight * 1.5} Z`;
            flag.setAttribute('d', flagPath);
            flag.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag);
        }

        // Add note head and flags for sixteenth notes (filled circle + two flags)
        if (rhythm === 's' || rhythm === 's.') {
            const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            noteHead.setAttribute('cx', stemX);
            noteHead.setAttribute('cy', noteHeadY);
            noteHead.setAttribute('rx', 4);
            noteHead.setAttribute('ry', 3);
            noteHead.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(noteHead);

            // Add first flag (filled curved shape pointing downward from top of stem)
            const flag1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const flagPath1 = `M ${stemX} ${stemEndY} q ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight} ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight * 2} q ${-TAB_CONFIG.flagWidth * 0.5} ${-TAB_CONFIG.flagHeight} ${-TAB_CONFIG.flagWidth} ${-TAB_CONFIG.flagHeight * 1.5} Z`;
            flag1.setAttribute('d', flagPath1);
            flag1.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag1);

            // Add second flag slightly below the first
            const flag2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const flagOffset = 5;  // Vertical spacing between flags
            const flagPath2 = `M ${stemX} ${stemEndY + flagOffset} q ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight} ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight * 2} q ${-TAB_CONFIG.flagWidth * 0.5} ${-TAB_CONFIG.flagHeight} ${-TAB_CONFIG.flagWidth} ${-TAB_CONFIG.flagHeight * 1.5} Z`;
            flag2.setAttribute('d', flagPath2);
            flag2.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag2);
        }

        // Handle triplet notes
        if (rhythm === 't') {
            const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            noteHead.setAttribute('cx', stemX);
            noteHead.setAttribute('cy', noteHeadY);
            noteHead.setAttribute('rx', 4);
            noteHead.setAttribute('ry', 3);
            noteHead.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(noteHead);

            // Add beam connecting triplet notes (draw on the last note of the group)
            if (isLastOfTriplet && tripletGroupX) {
                const beamY = stemEndY;
                const midX = (tripletGroupX.firstStemX + tripletGroupX.lastStemX) / 2;

                // Draw left beam segment (from first stem to middle)
                const leftBeam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                leftBeam.setAttribute('x1', tripletGroupX.firstStemX);
                leftBeam.setAttribute('y1', beamY);
                leftBeam.setAttribute('x2', midX - 8);  // Leave gap for "3"
                leftBeam.setAttribute('y2', beamY);
                leftBeam.setAttribute('stroke', TAB_CONFIG.stemColor);
                leftBeam.setAttribute('stroke-width', 3);
                group.appendChild(leftBeam);

                // Draw right beam segment (from middle to last stem)
                const rightBeam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                rightBeam.setAttribute('x1', midX + 8);  // Leave gap for "3"
                rightBeam.setAttribute('y1', beamY);
                rightBeam.setAttribute('x2', tripletGroupX.lastStemX);
                rightBeam.setAttribute('y2', beamY);
                rightBeam.setAttribute('stroke', TAB_CONFIG.stemColor);
                rightBeam.setAttribute('stroke-width', 3);
                group.appendChild(rightBeam);

                // Add "3" in the middle of the beam
                const bracketText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                bracketText.setAttribute('x', midX);
                bracketText.setAttribute('y', beamY - 4);  // Position above beam level
                bracketText.setAttribute('text-anchor', 'middle');
                bracketText.setAttribute('font-family', TAB_CONFIG.fontFamily);
                bracketText.setAttribute('font-size', 11);
                bracketText.setAttribute('font-weight', 'bold');
                bracketText.setAttribute('fill', TAB_CONFIG.stemColor);
                bracketText.textContent = '3';
                group.appendChild(bracketText);
            }
        }

        // Add dot for dotted notes
        if (rhythm.includes('.')) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', stemX + 8);
            dot.setAttribute('cy', noteHeadY);
            dot.setAttribute('r', 2);
            dot.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(dot);
        }

        svg.appendChild(group);
    }

    /**
     * Render a single tablature string (guitar string line)
     */
    function renderString(svg, stringIndex, tokens, yPosition, maxTokens, tuningLabel) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `tab-string tab-string-${stringIndex}`);

        // Render tuning label if provided
        if (tuningLabel) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', TAB_CONFIG.tuningLabelOffset);
            text.setAttribute('y', yPosition + 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-family', TAB_CONFIG.fontFamily);
            text.setAttribute('font-size', TAB_CONFIG.fontSize);
            text.setAttribute('fill', TAB_CONFIG.numberColor);
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('class', 'tab-tuning-label');
            text.textContent = tuningLabel;
            group.appendChild(text);
        }

        let currentX = TAB_CONFIG.paddingLeft;

        // Track triplet groups for beam rendering
        let tripletGroupStart = null;
        let tripletCount = 0;
        let tripletStemPositions = [];

        for (let tokenIndex = 0; tokenIndex < maxTokens; tokenIndex++) {
            const token = tokenIndex < tokens.length ? tokens[tokenIndex] : {type: 'dash', value: '-'};
            const x = currentX;

            if (token.type === 'bar') {
                // Render vertical bar
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x + TAB_CONFIG.characterWidth / 2);
                line.setAttribute('y1', TAB_CONFIG.paddingTop);
                line.setAttribute('x2', x + TAB_CONFIG.characterWidth / 2);
                line.setAttribute('y2', TAB_CONFIG.paddingTop + (5 * TAB_CONFIG.lineHeight));
                line.setAttribute('stroke', TAB_CONFIG.barColor);
                line.setAttribute('stroke-width', TAB_CONFIG.barStrokeWidth);
                line.setAttribute('class', 'tab-bar');
                group.appendChild(line);
            } else if (token.type === 'gap') {
                // Render horizontal line segment (gap)
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x);
                line.setAttribute('y1', yPosition);

                // Use wider spacing for gaps with multiple dashes
                let width = token.spacing === 'wide' ? TAB_CONFIG.characterWidth * 2.0 : TAB_CONFIG.characterWidth;

                // If there are pauses, ensure we have enough width for them
                if (token.pauses && token.pauses.length > 0) {
                    const minPauseWidth = TAB_CONFIG.characterWidth * 2;  // Minimum space per pause
                    const totalPauseWidth = minPauseWidth * token.pauses.length;
                    width = Math.max(width, totalPauseWidth);
                }

                line.setAttribute('x2', x + width);
                line.setAttribute('y2', yPosition);
                line.setAttribute('stroke', TAB_CONFIG.stringColor);
                line.setAttribute('stroke-width', TAB_CONFIG.stringStrokeWidth);
                line.setAttribute('class', 'tab-line-segment');
                group.appendChild(line);

                // Render pauses in the gap (on the first string)
                if (stringIndex === 0 && token.pauses && token.pauses.length > 0) {
                    const pauseSpacing = width / token.pauses.length;

                    token.pauses.forEach((pause, idx) => {
                        const pauseX = x + pauseSpacing * idx + pauseSpacing / 2 - TAB_CONFIG.characterWidth / 2;
                        renderRhythmStem(svg, pauseX, pause, false, false, null);
                    });
                }

                // Adjust currentX for next token
                currentX += width;
                continue; // Skip the normal increment at the end
            } else if (token.type === 'dash') {
                // Render horizontal line segment (part of the string)
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x);
                line.setAttribute('y1', yPosition);

                const width = TAB_CONFIG.characterWidth;
                line.setAttribute('x2', x + width);
                line.setAttribute('y2', yPosition);
                line.setAttribute('stroke', TAB_CONFIG.stringColor);
                line.setAttribute('stroke-width', TAB_CONFIG.stringStrokeWidth);
                line.setAttribute('class', 'tab-line-segment');
                group.appendChild(line);

                // Track triplet groups
                if (stringIndex === 0 && token.rhythm === 't') {
                    if (tripletGroupStart === null) {
                        tripletGroupStart = x;
                        tripletCount = 1;
                        tripletStemPositions = [x + TAB_CONFIG.characterWidth / 2];
                    } else {
                        tripletCount++;
                        tripletStemPositions.push(x + TAB_CONFIG.characterWidth / 2);
                    }
                } else if (stringIndex === 0 && token.rhythm !== 't' && tripletGroupStart !== null) {
                    tripletGroupStart = null;
                    tripletCount = 0;
                    tripletStemPositions = [];
                }

                // Render rhythm stem on the first string
                if (stringIndex === 0 && token.rhythm) {
                    const isFirstOfTriplet = (token.rhythm === 't' && tripletCount === 1);
                    const isLastOfTriplet = (token.rhythm === 't' && tripletCount === 3);
                    const tripletGroupX = isLastOfTriplet ? {firstStemX: tripletStemPositions[0], lastStemX: tripletStemPositions[2]} : null;

                    renderRhythmStem(svg, x, token.rhythm, isFirstOfTriplet, isLastOfTriplet, tripletGroupX);

                    if (isLastOfTriplet) {
                        tripletGroupStart = null;
                        tripletCount = 0;
                        tripletStemPositions = [];
                    }
                }

                // Adjust currentX for next token
                currentX += width;
                continue; // Skip the normal increment at the end
            } else if (token.type === 'content') {
                // Render content (fret number, letter, symbol, etc.)
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x + TAB_CONFIG.characterWidth / 2);
                text.setAttribute('y', yPosition + 5); // Slight offset for better vertical centering
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-family', TAB_CONFIG.fontFamily);
                text.setAttribute('font-size', TAB_CONFIG.fontSize);
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('fill', TAB_CONFIG.numberColor);
                text.setAttribute('class', 'tab-content');
                text.textContent = token.value;
                group.appendChild(text);

                // Track triplet groups
                if (stringIndex === 0 && token.rhythm === 't') {
                    if (tripletGroupStart === null) {
                        tripletGroupStart = x;
                        tripletCount = 1;
                        tripletStemPositions = [x + TAB_CONFIG.characterWidth / 2];
                    } else {
                        tripletCount++;
                        tripletStemPositions.push(x + TAB_CONFIG.characterWidth / 2);
                    }
                } else if (stringIndex === 0 && token.rhythm !== 't' && tripletGroupStart !== null) {
                    tripletGroupStart = null;
                    tripletCount = 0;
                    tripletStemPositions = [];
                }

                // Render rhythm stem on the first string
                if (stringIndex === 0 && token.rhythm) {
                    const isFirstOfTriplet = (token.rhythm === 't' && tripletCount === 1);
                    const isLastOfTriplet = (token.rhythm === 't' && tripletCount === 3);
                    const tripletGroupX = isLastOfTriplet ? {firstStemX: tripletStemPositions[0], lastStemX: tripletStemPositions[2]} : null;

                    renderRhythmStem(svg, x, token.rhythm, isFirstOfTriplet, isLastOfTriplet, tripletGroupX);

                    if (isLastOfTriplet) {
                        tripletGroupStart = null;
                        tripletCount = 0;
                        tripletStemPositions = [];
                    }
                }
            }

            currentX += TAB_CONFIG.characterWidth;
        }

        svg.appendChild(group);
    }

    /**
     * Render the complete tablature
     */
    function renderTabulature(container, tabData) {
        // Render each section
        tabData.sections.forEach((section, sectionIndex) => {
            // Calculate SVG width by accounting for wide spacing and pauses
            let totalWidth = TAB_CONFIG.paddingLeft + TAB_CONFIG.paddingRight;
            if (section.tokenLines.length > 0) {
                for (const token of section.tokenLines[0]) {
                    if (token.type === 'gap') {
                        // Calculate gap width (same logic as in rendering)
                        let width = token.spacing === 'wide' ? TAB_CONFIG.characterWidth * 2.0 : TAB_CONFIG.characterWidth;

                        // If there are pauses, ensure we have enough width for them
                        if (token.pauses && token.pauses.length > 0) {
                            const minPauseWidth = TAB_CONFIG.characterWidth * 2;
                            const totalPauseWidth = minPauseWidth * token.pauses.length;
                            width = Math.max(width, totalPauseWidth);
                        }

                        totalWidth += width;
                    } else if (token.type === 'dash' && token.spacing === 'wide') {
                        totalWidth += TAB_CONFIG.characterWidth * 2.0;
                    } else {
                        totalWidth += TAB_CONFIG.characterWidth;
                    }
                }
            }

            const height = (5 * TAB_CONFIG.lineHeight) +
                           TAB_CONFIG.paddingTop + TAB_CONFIG.paddingBottom;

            // Create SVG element
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', totalWidth);
            svg.setAttribute('height', height);
            svg.setAttribute('class', 'tablature-svg');
            svg.setAttribute('style', 'background-color: white; margin-bottom: 10px; display: block;');

            // Render each string (from top to bottom, representing strings 1-6)
            for (let i = 0; i < section.numStrings; i++) {
                const yPosition = TAB_CONFIG.paddingTop + (i * TAB_CONFIG.lineHeight);
                // Show tuning labels on all sections
                const tuningLabel = tabData.tuning ? tabData.tuning[i] : null;
                renderString(svg, i, section.tokenLines[i], yPosition, section.maxTokens, tuningLabel);
            }

            container.appendChild(svg);
        });
    }

    /**
     * Initialize tablature rendering from markdown code blocks
     * Finds all code blocks with language 'tabulature' and converts them to SVG
     */
    function initTabulatureEmbeds(root) {
        if (!root) return;

        const blocks = root.querySelectorAll('pre > code.language-tabulature');
        if (!blocks || blocks.length === 0) return;

        blocks.forEach(code => {
            let config = null;
            try {
                config = JSON.parse(code.textContent);
            } catch (e) {
                console.error('Invalid tabulature JSON in markdown:', e);
                console.error('Content was:', code.textContent);
                // Replace the code block with an error message
                const errorDiv = document.createElement('div');
                errorDiv.style.color = 'red';
                errorDiv.style.padding = '10px';
                errorDiv.style.border = '1px solid red';
                errorDiv.textContent = 'Error: Invalid tabulature JSON. Make sure strings are quoted. ' + e.message;
                const pre = code.parentNode;
                pre.parentNode.replaceChild(errorDiv, pre);
                return;
            }

            const tabData = parseTabulature(config);
            if (!tabData) return;

            // Create container for the tablature
            const container = document.createElement('div');
            container.className = 'tabulature-embed';
            container.style.margin = '20px 0';

            // Render the tablature
            renderTabulature(container, tabData);

            // Replace the code block with the rendered tablature
            const pre = code.parentNode;
            pre.parentNode.replaceChild(container, pre);
        });
    }

    /**
     * Initialize tablature when DOM is ready
     * This is called by md-loader.js after markdown is loaded
     */
    function init() {
        // Process any existing tabulature blocks in the document
        initTabulatureEmbeds(document.body);
    }

    // Expose functions to window for use by md-loader.js
    if (typeof window !== 'undefined') {
        window.initTabulatureEmbeds = initTabulatureEmbeds;
    }

    // Auto-initialize if DOM is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
