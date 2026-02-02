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
        let barCount = 0;

        while (i < rhythmLine.length) {
            const char = rhythmLine[i];

            // Track bar positions
            if (char === '|') {
                barCount++;
                i++;
                continue;
            }

            // Skip dashes and spaces
            if (char === '-' || char === ' ') {
                i++;
                continue;
            }

            // Found a rhythm symbol
            let symbol = char;
            let j = i + 1;

            // Check for triplet indicator (e.g., "et", "st", "ft", "qt", "ht", "wt")
            if (j < rhythmLine.length && rhythmLine[j] === 't') {
                symbol += 't';
                j++;
            }
            // Check for pause indicator (e.g., "hp", "qp", "wp", "ep", "sp", "fp", "tp")
            else if (j < rhythmLine.length && rhythmLine[j] === 'p') {
                symbol += 'p';
                j++;
            }

            // Check for dotted note/pause (e.g., "h.", "hp.", "q.", "f.", "et.")
            if (j < rhythmLine.length && rhythmLine[j] === '.') {
                symbol += '.';
                j++;
            }

            const isPause = symbol.includes('p');

            rhythms.push({
                symbol: symbol,
                position: i,
                isPause: isPause,
                barIndex: barCount  // Track which bar this rhythm belongs to
            });

            i = j;
        }

        return rhythms;
    }

    /**
     * Count how many notes are in a content string
     * Examples: "2h3" = 2 notes, "4s6" = 2 notes, "5" = 1 note, "12p10" = 2 notes
     */
    function countNotesInContent(content) {
        // Check for multi-note technique pattern (e.g., "4s6s7", "2h3p5")
        const multiNotePattern = /\d+(?:[hpsb]\d+)+/;

        if (multiNotePattern.test(content)) {
            // Count each number in the pattern
            // Match all sequences of digits
            const numbers = content.match(/\d+/g);
            return numbers ? numbers.length : 0;
        }

        // Check if there's at least one number (single note)
        if (/\d+/.test(content)) {
            return 1;
        }

        return 0;
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

            // Count maximum notes in any single string (for multi-note techniques)
            // For a chord (multiple strings), each string has 1 note, so max is 1
            // For "2h3" on one string, that string has 2 notes, so max is 2
            let noteCount = 0;
            if (hasNotes) {
                for (const c of groupContent) {
                    if (c !== '-' && c !== '|') {
                        const count = countNotesInContent(c);
                        if (count > 1) {
                            console.log('Found multi-note content:', c, 'count:', count);
                        }
                        noteCount = Math.max(noteCount, count);
                    }
                }
            }

            groups.push({
                start: i,
                end: groupEnd,
                type: type,
                content: groupContent,
                hasNotes: hasNotes,
                noteCount: noteCount
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

        let currentBarIndex = 0;

        // First, tag all groups with their bar index
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].type === 'bar') {
                currentBarIndex++;
            }
            groups[i].barIndex = currentBarIndex;
        }

        // Process each bar separately
        for (let barIdx = 0; barIdx <= currentBarIndex; barIdx++) {
            // Get all rhythms for this bar in order (preserving pauses and notes sequence)
            const barRhythms = rhythms.filter(r => r.barIndex === barIdx);

            // Get groups in this bar
            const barGroups = groups.filter(g => g.barIndex === barIdx);

            let rhythmIdx = 0;
            let lastNoteGroupIdx = -1;

            // Process each group in sequence
            for (let i = 0; i < barGroups.length; i++) {
                const group = barGroups[i];

                if (group.type === 'bar') {
                    continue;
                }

                if (group.hasNotes) {
                    // Collect any pauses that come before this note
                    const pausesToInsert = [];
                    while (rhythmIdx < barRhythms.length && barRhythms[rhythmIdx].isPause) {
                        pausesToInsert.push(barRhythms[rhythmIdx].symbol);
                        rhythmIdx++;
                    }

                    // If we have pauses, assign them to the gap before this note
                    if (pausesToInsert.length > 0) {
                        // Find the gap before this note group
                        for (let j = Math.max(0, lastNoteGroupIdx + 1); j < i; j++) {
                            if (barGroups[j].type === 'gap') {
                                barGroups[j].pauses = pausesToInsert;
                                break;
                            }
                        }
                    }

                    // Now collect rhythms for the notes in this group
                    const groupRhythms = [];
                    const notesNeeded = group.noteCount || 1;

                    for (let n = 0; n < notesNeeded && rhythmIdx < barRhythms.length; n++) {
                        if (!barRhythms[rhythmIdx].isPause) {
                            groupRhythms.push(barRhythms[rhythmIdx].symbol);
                            rhythmIdx++;
                        }
                    }

                    if (groupRhythms.length > 0) {
                        group.rhythms = groupRhythms;
                        group.rhythm = groupRhythms[0];
                    }

                    lastNoteGroupIdx = i;
                }
            }

            // Handle any remaining pauses at the end of the bar
            const remainingPauses = [];
            while (rhythmIdx < barRhythms.length && barRhythms[rhythmIdx].isPause) {
                remainingPauses.push(barRhythms[rhythmIdx].symbol);
                rhythmIdx++;
            }

            if (remainingPauses.length > 0) {
                // Assign to the last gap in this bar
                for (let j = barGroups.length - 1; j >= 0; j--) {
                    if (barGroups[j].type === 'gap') {
                        barGroups[j].pauses = remainingPauses;
                        break;
                    }
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
            if (group.rhythms && group.rhythms.length > 1) {
                console.log('Processing group with multiple rhythms:', group.rhythms, 'content:', group.content);
            }

            // Check if this group has multi-note technique content
            const multiNotePattern = /\d+(?:[hpsb]\d+)+/;
            const hasMultiNote = group.content.some(c => c && c !== '-' && c !== '|' && multiNotePattern.test(c));

            if (hasMultiNote && group.rhythms && group.rhythms.length > 1) {
                // Parse multi-note techniques into tokens (preserving multi-digit numbers)
                // First, tokenize each string's content
                const parsedTokens = group.content.map(c => {
                    if (!c || c === '-' || c === '|') return [];
                    
                    const tokens = [];
                    let i = 0;
                    while (i < c.length) {
                        if (/\d/.test(c[i])) {
                            // Collect all consecutive digits as a number
                            let num = '';
                            while (i < c.length && /\d/.test(c[i])) {
                                num += c[i];
                                i++;
                            }
                            tokens.push(num);
                        } else {
                            // Single character (technique letter)
                            tokens.push(c[i]);
                            i++;
                        }
                    }
                    return tokens;
                });

                // Find max number of tokens
                const maxTokens = Math.max(...parsedTokens.map(t => t.length));

                let rhythmIndex = 0;

                for (let tokenPos = 0; tokenPos < maxTokens; tokenPos++) {
                    // Check if ANY string has a number at this token position
                    let hasNumberAtPos = false;
                    for (let checkString = 0; checkString < lines.length; checkString++) {
                        const tokens = parsedTokens[checkString];
                        if (tokenPos < tokens.length && /^\d+$/.test(tokens[tokenPos])) {
                            hasNumberAtPos = true;
                            break;
                        }
                    }

                    // Get the rhythm for this position if it has a number
                    let positionRhythm = null;
                    if (hasNumberAtPos && rhythmIndex < group.rhythms.length) {
                        positionRhythm = group.rhythms[rhythmIndex];
                        rhythmIndex++;
                    }

                    // Create tokens for all strings at this position
                    for (let stringIndex = 0; stringIndex < lines.length; stringIndex++) {
                        const tokens = parsedTokens[stringIndex];
                        let tokenValue = '-';

                        if (tokenPos < tokens.length) {
                            tokenValue = tokens[tokenPos];
                        }

                        // Assign rhythm only on string 0 for notes
                        const rhythm = (stringIndex === 0) ? positionRhythm : null;

                        if (tokenValue === '-') {
                            tokenLines[stringIndex].push({
                                type: 'dash',
                                value: '-',
                                spacing: 'normal',
                                rhythm: rhythm
                            });
                        } else {
                            tokenLines[stringIndex].push({
                                type: 'content',
                                value: tokenValue,
                                rhythm: rhythm
                            });
                        }
                    }
                }
            } else {
                // Normal processing for single-note groups
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

            // First flag
            const flag1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d1 = `M ${centerX + 3} ${centerY + 7} q 3 3 3 6 q -1.5 -2 -3 -4 Z`;
            flag1.setAttribute('d', d1);
            flag1.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag1);

            // Second flag
            const flag2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d2 = `M ${centerX + 3} ${centerY + 12} q 3 3 3 6 q -1.5 -2 -3 -4 Z`;
            flag2.setAttribute('d', d2);
            flag2.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag2);
        } else if (baseRhythm === 'f') {
            // 32nd rest - diagonal stroke with three filled flags
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
            const d2 = `M ${centerX + 3} ${centerY + 12} q 3 3 3 6 q -1.5 -2 -3 -4 Z`;
            flag2.setAttribute('d', d2);
            flag2.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag2);

            // Third flag
            const flag3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d3 = `M ${centerX + 3} ${centerY + 17} q 3 3 3 6 q -1.5 -2 -3 -4 Z`;
            flag3.setAttribute('d', d3);
            flag3.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(flag3);
        } else if (isTriplet(rhythm)) {
            // Triplet rest - render base rest with "3" above
            const tripletBase = getTripletBaseValue(rhythm);

            // Render the base rest symbol (reuse the rendering logic)
            if (tripletBase === 'w') {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', centerX - 6);
                rect.setAttribute('y', centerY - 2);
                rect.setAttribute('width', 12);
                rect.setAttribute('height', 4);
                rect.setAttribute('fill', TAB_CONFIG.stemColor);
                group.appendChild(rect);
            } else if (tripletBase === 'h') {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', centerX - 6);
                rect.setAttribute('y', centerY - 2);
                rect.setAttribute('width', 12);
                rect.setAttribute('height', 4);
                rect.setAttribute('fill', TAB_CONFIG.stemColor);
                group.appendChild(rect);
            } else if (tripletBase === 'q') {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const d = `M ${centerX - 3} ${centerY - 6} L ${centerX - 1} ${centerY - 4} L ${centerX + 1} ${centerY} q 2 1 2 3`;
                path.setAttribute('d', d);
                path.setAttribute('stroke', TAB_CONFIG.stemColor);
                path.setAttribute('stroke-width', 1.5);
                path.setAttribute('fill', 'none');
                group.appendChild(path);
            } else if (tripletBase === 'e' || tripletBase === 's' || tripletBase === 'f' || tripletBase === '') {
                // Eighth, sixteenth, or 32nd triplet rest
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const d = `M ${centerX} ${centerY - 4} L ${centerX - 2} ${centerY} L ${centerX + 2} ${centerY + 4} q 3 2 3 4`;
                path.setAttribute('d', d);
                path.setAttribute('stroke', TAB_CONFIG.stemColor);
                path.setAttribute('stroke-width', 1.5);
                path.setAttribute('fill', 'none');
                group.appendChild(path);
            }

            // Add "3" indicator for all triplet rests
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
     * @param {boolean} skipFlags - If true, don't render flags (for beamed notes)
     */
    function renderRhythmStem(svg, x, rhythm, isFirstOfTriplet, isLastOfTriplet, tripletGroupX, skipFlags) {
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
        // Skip stem for whole notes (w, w., wt, wt.)
        const isWholeNote = rhythm === 'w' || rhythm === 'w.' || rhythm === 'wt' || rhythm === 'wt.';
        if (!isWholeNote) {
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

            // Add flag (filled curved shape pointing downward from top of stem) - unless beamed
            if (!skipFlags) {
                const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const flagPath = `M ${stemX} ${stemEndY} q ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight} ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight * 2} q ${-TAB_CONFIG.flagWidth * 0.5} ${-TAB_CONFIG.flagHeight} ${-TAB_CONFIG.flagWidth} ${-TAB_CONFIG.flagHeight * 1.5} Z`;
                flag.setAttribute('d', flagPath);
                flag.setAttribute('fill', TAB_CONFIG.stemColor);
                group.appendChild(flag);
            }
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

            // Add flags - unless beamed
            if (!skipFlags) {
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
        }

        // Add note head and flags for 32nd notes (filled circle + three flags)
        if (rhythm === 'f' || rhythm === 'f.') {
            const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            noteHead.setAttribute('cx', stemX);
            noteHead.setAttribute('cy', noteHeadY);
            noteHead.setAttribute('rx', 4);
            noteHead.setAttribute('ry', 3);
            noteHead.setAttribute('fill', TAB_CONFIG.stemColor);
            group.appendChild(noteHead);

            // Add flags - unless beamed
            if (!skipFlags) {
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

                // Add third flag slightly below the second
                const flag3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const flagPath3 = `M ${stemX} ${stemEndY + flagOffset * 2} q ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight} ${TAB_CONFIG.flagWidth} ${TAB_CONFIG.flagHeight * 2} q ${-TAB_CONFIG.flagWidth * 0.5} ${-TAB_CONFIG.flagHeight} ${-TAB_CONFIG.flagWidth} ${-TAB_CONFIG.flagHeight * 1.5} Z`;
                flag3.setAttribute('d', flagPath3);
                flag3.setAttribute('fill', TAB_CONFIG.stemColor);
                group.appendChild(flag3);
            }
        }

        // Handle triplet notes
        if (isTriplet(rhythm)) {
            const tripletBase = getTripletBaseValue(rhythm);
            const hasDot = rhythm.includes('.');

            // Render note head based on triplet base value
            if (tripletBase === 'w') {
                // Whole note - open note head
                const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                noteHead.setAttribute('cx', stemX);
                noteHead.setAttribute('cy', noteHeadY);
                noteHead.setAttribute('rx', 4);
                noteHead.setAttribute('ry', 3);
                noteHead.setAttribute('fill', 'none');
                noteHead.setAttribute('stroke', TAB_CONFIG.stemColor);
                noteHead.setAttribute('stroke-width', 1.5);
                group.appendChild(noteHead);
            } else if (tripletBase === 'h') {
                // Half note - open note head
                const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                noteHead.setAttribute('cx', stemX);
                noteHead.setAttribute('cy', noteHeadY);
                noteHead.setAttribute('rx', 4);
                noteHead.setAttribute('ry', 3);
                noteHead.setAttribute('fill', 'none');
                noteHead.setAttribute('stroke', TAB_CONFIG.stemColor);
                noteHead.setAttribute('stroke-width', 1.5);
                group.appendChild(noteHead);
            } else {
                // Quarter, eighth, sixteenth - filled note head
                const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                noteHead.setAttribute('cx', stemX);
                noteHead.setAttribute('cy', noteHeadY);
                noteHead.setAttribute('rx', 4);
                noteHead.setAttribute('ry', 3);
                noteHead.setAttribute('fill', TAB_CONFIG.stemColor);
                group.appendChild(noteHead);
            }

            // Add beam connecting triplet notes (draw on the last note of the group)
            if (isLastOfTriplet && tripletGroupX) {
                const beamY = stemEndY;
                const beamThickness = 3;
                const beamSpacing = 4;
                const midX = (tripletGroupX.firstStemX + tripletGroupX.lastStemX) / 2;

                // Determine beam style based on triplet type
                const isDoubleBeam = (tripletBase === 's');  // Sixteenth triplet needs double beam
                const isTripleBeam = (tripletBase === 'f');  // 32nd triplet needs triple beam
                const isDashedBeam = (tripletBase === 'q');  // Quarter triplet uses dashed beam

                // Draw left beam segment (from first stem to middle)
                const leftBeam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                leftBeam.setAttribute('x1', tripletGroupX.firstStemX);
                leftBeam.setAttribute('y1', beamY);
                leftBeam.setAttribute('x2', midX - 8);  // Leave gap for "3"
                leftBeam.setAttribute('y2', beamY);
                leftBeam.setAttribute('stroke', TAB_CONFIG.stemColor);
                leftBeam.setAttribute('stroke-width', beamThickness);
                if (isDashedBeam) {
                    leftBeam.setAttribute('stroke-dasharray', '4 2');  // Dashed pattern for quarter triplets
                }
                group.appendChild(leftBeam);

                // Draw right beam segment (from middle to last stem)
                const rightBeam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                rightBeam.setAttribute('x1', midX + 8);  // Leave gap for "3"
                rightBeam.setAttribute('y1', beamY);
                rightBeam.setAttribute('x2', tripletGroupX.lastStemX);
                rightBeam.setAttribute('y2', beamY);
                rightBeam.setAttribute('stroke', TAB_CONFIG.stemColor);
                rightBeam.setAttribute('stroke-width', beamThickness);
                if (isDashedBeam) {
                    rightBeam.setAttribute('stroke-dasharray', '4 2');  // Dashed pattern for quarter triplets
                }
                group.appendChild(rightBeam);

                // Add second beam for sixteenth triplets
                if (isDoubleBeam) {
                    const secondBeamY = beamY + beamSpacing;

                    const leftBeam2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    leftBeam2.setAttribute('x1', tripletGroupX.firstStemX);
                    leftBeam2.setAttribute('y1', secondBeamY);
                    leftBeam2.setAttribute('x2', midX - 8);
                    leftBeam2.setAttribute('y2', secondBeamY);
                    leftBeam2.setAttribute('stroke', TAB_CONFIG.stemColor);
                    leftBeam2.setAttribute('stroke-width', beamThickness);
                    group.appendChild(leftBeam2);

                    const rightBeam2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    rightBeam2.setAttribute('x1', midX + 8);
                    rightBeam2.setAttribute('y1', secondBeamY);
                    rightBeam2.setAttribute('x2', tripletGroupX.lastStemX);
                    rightBeam2.setAttribute('y2', secondBeamY);
                    rightBeam2.setAttribute('stroke', TAB_CONFIG.stemColor);
                    rightBeam2.setAttribute('stroke-width', beamThickness);
                    group.appendChild(rightBeam2);
                }

                // Add third beam for 32nd triplets
                if (isTripleBeam) {
                    const secondBeamY = beamY + beamSpacing;
                    const thirdBeamY = beamY + beamSpacing * 2;

                    // Second beam
                    const leftBeam2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    leftBeam2.setAttribute('x1', tripletGroupX.firstStemX);
                    leftBeam2.setAttribute('y1', secondBeamY);
                    leftBeam2.setAttribute('x2', midX - 8);
                    leftBeam2.setAttribute('y2', secondBeamY);
                    leftBeam2.setAttribute('stroke', TAB_CONFIG.stemColor);
                    leftBeam2.setAttribute('stroke-width', beamThickness);
                    group.appendChild(leftBeam2);

                    const rightBeam2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    rightBeam2.setAttribute('x1', midX + 8);
                    rightBeam2.setAttribute('y1', secondBeamY);
                    rightBeam2.setAttribute('x2', tripletGroupX.lastStemX);
                    rightBeam2.setAttribute('y2', secondBeamY);
                    rightBeam2.setAttribute('stroke', TAB_CONFIG.stemColor);
                    rightBeam2.setAttribute('stroke-width', beamThickness);
                    group.appendChild(rightBeam2);

                    // Third beam
                    const leftBeam3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    leftBeam3.setAttribute('x1', tripletGroupX.firstStemX);
                    leftBeam3.setAttribute('y1', thirdBeamY);
                    leftBeam3.setAttribute('x2', midX - 8);
                    leftBeam3.setAttribute('y2', thirdBeamY);
                    leftBeam3.setAttribute('stroke', TAB_CONFIG.stemColor);
                    leftBeam3.setAttribute('stroke-width', beamThickness);
                    group.appendChild(leftBeam3);

                    const rightBeam3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    rightBeam3.setAttribute('x1', midX + 8);
                    rightBeam3.setAttribute('y1', thirdBeamY);
                    rightBeam3.setAttribute('x2', tripletGroupX.lastStemX);
                    rightBeam3.setAttribute('y2', thirdBeamY);
                    rightBeam3.setAttribute('stroke', TAB_CONFIG.stemColor);
                    rightBeam3.setAttribute('stroke-width', beamThickness);
                    group.appendChild(rightBeam3);
                }

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
     * Render beamed eighth, sixteenth, or 32nd notes
     * @param {SVGElement} svg - The SVG element to append to
     * @param {Array} noteGroup - Array of {x, rhythm, hasDot} objects
     * @param {string} noteType - 'e' for eighth notes, 's' for sixteenth notes, 'f' for 32nd notes
     */
    function renderBeamedNotes(svg, noteGroup, noteType) {
        if (noteGroup.length < 2) return;

        console.log('>>> BEAMING', noteGroup.length, noteType, 'notes at x positions:', noteGroup.map(n => n.x));

        const stemEndY = TAB_CONFIG.paddingTop - TAB_CONFIG.stemHeight;
        const noteHeadY = TAB_CONFIG.paddingTop - 22;
        const beamThickness = 3;
        const beamSpacing = 4; // Spacing between beams for sixteenth and 32nd notes

        // Render each note head and stem
        noteGroup.forEach(note => {
            const stemX = note.x + TAB_CONFIG.characterWidth / 2;

            // Render stem
            const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            stem.setAttribute('x1', stemX);
            stem.setAttribute('y1', noteHeadY + 3);
            stem.setAttribute('x2', stemX);
            stem.setAttribute('y2', stemEndY);
            stem.setAttribute('stroke', TAB_CONFIG.stemColor);
            stem.setAttribute('stroke-width', TAB_CONFIG.stemStrokeWidth);
            svg.appendChild(stem);

            // Render filled note head
            const noteHead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            noteHead.setAttribute('cx', stemX);
            noteHead.setAttribute('cy', noteHeadY);
            noteHead.setAttribute('rx', 4);
            noteHead.setAttribute('ry', 3);
            noteHead.setAttribute('fill', TAB_CONFIG.stemColor);
            svg.appendChild(noteHead);

            // Render dot if needed
            if (note.hasDot) {
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', stemX + 8);
                dot.setAttribute('cy', noteHeadY);
                dot.setAttribute('r', 2);
                dot.setAttribute('fill', TAB_CONFIG.stemColor);
                svg.appendChild(dot);
            }
        });

        // Render beam(s) connecting the notes
        const firstStemX = noteGroup[0].x + TAB_CONFIG.characterWidth / 2;
        const lastStemX = noteGroup[noteGroup.length - 1].x + TAB_CONFIG.characterWidth / 2;

        // First beam (for both eighth and sixteenth notes)
        const beam1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        beam1.setAttribute('x1', firstStemX);
        beam1.setAttribute('y1', stemEndY);
        beam1.setAttribute('x2', lastStemX);
        beam1.setAttribute('y2', stemEndY);
        beam1.setAttribute('stroke', TAB_CONFIG.stemColor);
        beam1.setAttribute('stroke-width', beamThickness);
        svg.appendChild(beam1);

        // Second beam for sixteenth and 32nd notes
        if (noteType === 's' || noteType === 'f') {
            const beam2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            beam2.setAttribute('x1', firstStemX);
            beam2.setAttribute('y1', stemEndY + beamSpacing);
            beam2.setAttribute('x2', lastStemX);
            beam2.setAttribute('y2', stemEndY + beamSpacing);
            beam2.setAttribute('stroke', TAB_CONFIG.stemColor);
            beam2.setAttribute('stroke-width', beamThickness);
            svg.appendChild(beam2);
        }

        // Third beam for 32nd notes
        if (noteType === 'f') {
            const beam3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            beam3.setAttribute('x1', firstStemX);
            beam3.setAttribute('y1', stemEndY + beamSpacing * 2);
            beam3.setAttribute('x2', lastStemX);
            beam3.setAttribute('y2', stemEndY + beamSpacing * 2);
            beam3.setAttribute('stroke', TAB_CONFIG.stemColor);
            beam3.setAttribute('stroke-width', beamThickness);
            svg.appendChild(beam3);
        }
    }

    /**
     * Helper function to get base rhythm without dot
     */
    function getBaseRhythm(rhythm) {
        if (!rhythm) return '';
        // Strip dots and triplet indicator
        return rhythm.replace('.', '').replace('t', '');
    }

    /**
     * Check if a rhythm is a triplet
     */
    function isTriplet(rhythm) {
        return rhythm && rhythm.includes('t');
    }

    /**
     * Get the base note value for a triplet (without the 't')
     */
    function getTripletBaseValue(rhythm) {
        if (!isTriplet(rhythm)) return null;
        return rhythm.replace('t', '').replace('.', '');
    }

    /**
     * Helper function to check if rhythm can be beamed
     */
    function canBeBeamed(rhythm) {
        const base = getBaseRhythm(rhythm);
        return base === 'e' || base === 's' || base === 'f';
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

        // Track eighth note beaming groups
        let eighthNoteGroup = [];

        // Track sixteenth note beaming groups
        let sixteenthNoteGroup = [];

        // Track 32nd note beaming groups
        let thirtySecondNoteGroup = [];

        for (let tokenIndex = 0; tokenIndex < maxTokens; tokenIndex++) {
            const token = tokenIndex < tokens.length ? tokens[tokenIndex] : {type: 'dash', value: '-'};
            const x = currentX;

            if (stringIndex === 0) {
                console.log('Token', tokenIndex, ':', 'inBounds=', (tokenIndex < tokens.length), 'type=', token.type, 'value=', token.value, 'rhythms=', token.rhythms);
            }

            if (token.type === 'bar') {
                // Render vertical bar (only on first string to avoid duplicates)
                if (stringIndex === 0) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x + TAB_CONFIG.characterWidth / 2);
                    line.setAttribute('y1', TAB_CONFIG.paddingTop);
                    line.setAttribute('x2', x + TAB_CONFIG.characterWidth / 2);
                    line.setAttribute('y2', TAB_CONFIG.paddingTop + (5 * TAB_CONFIG.lineHeight));
                    line.setAttribute('stroke', TAB_CONFIG.barColor);
                    line.setAttribute('stroke-width', TAB_CONFIG.barStrokeWidth);
                    line.setAttribute('class', 'tab-bar');
                    group.appendChild(line);
                }
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
                    // Finalize any pending beaming groups before rendering pauses
                    if (eighthNoteGroup.length > 0) {
                        if (eighthNoteGroup.length >= 2) {
                            renderBeamedNotes(svg, eighthNoteGroup, 'e');
                        } else {
                            renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                        }
                        eighthNoteGroup = [];
                    }
                    if (sixteenthNoteGroup.length > 0) {
                        if (sixteenthNoteGroup.length >= 2) {
                            renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                        } else {
                            renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                        }
                        sixteenthNoteGroup = [];
                    }
                    if (thirtySecondNoteGroup.length > 0) {
                        if (thirtySecondNoteGroup.length >= 2) {
                            renderBeamedNotes(svg, thirtySecondNoteGroup, 'f');
                        } else {
                            renderRhythmStem(svg, thirtySecondNoteGroup[0].x, thirtySecondNoteGroup[0].rhythm, false, false, null, false);
                        }
                        thirtySecondNoteGroup = [];
                    }

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

                // Track triplet groups (skip tokens without rhythms)
                if (stringIndex === 0 && token.rhythm) {
                    if (isTriplet(token.rhythm)) {
                        if (tripletGroupStart === null) {
                            tripletGroupStart = x;
                            tripletCount = 1;
                            tripletStemPositions = [x + TAB_CONFIG.characterWidth / 2];
                        } else {
                            tripletCount++;
                            tripletStemPositions.push(x + TAB_CONFIG.characterWidth / 2);
                        }
                    } else if (tripletGroupStart !== null) {
                        // Non-triplet rhythm encountered, reset triplet tracking
                        tripletGroupStart = null;
                        tripletCount = 0;
                        tripletStemPositions = [];
                    }
                }

                // Render rhythm stem on the first string
                if (stringIndex === 0 && token.rhythm) {
                    const baseRhythm = getBaseRhythm(token.rhythm);
                    const hasDot = token.rhythm.includes('.');

                    // Handle triplets separately (they have their own beaming)
                    if (isTriplet(token.rhythm)) {
                        // Finalize any pending beaming groups before triplet
                        if (eighthNoteGroup.length > 0) {
                            if (eighthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            } else {
                                renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            eighthNoteGroup = [];
                        }
                        if (sixteenthNoteGroup.length > 0) {
                            if (sixteenthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            } else {
                                renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            sixteenthNoteGroup = [];
                        }

                        // Render triplet
                        const isFirstOfTriplet = (tripletCount === 1);
                        const isLastOfTriplet = (tripletCount === 3);
                        const tripletGroupX = isLastOfTriplet ? {firstStemX: tripletStemPositions[0], lastStemX: tripletStemPositions[2]} : null;

                        renderRhythmStem(svg, x, token.rhythm, isFirstOfTriplet, isLastOfTriplet, tripletGroupX, false);

                        if (isLastOfTriplet) {
                            tripletGroupStart = null;
                            tripletCount = 0;
                            tripletStemPositions = [];
                        }
                    }
                    // Handle eighth note beaming
                    else if (baseRhythm === 'e') {
                        // Finalize any pending sixteenth note group
                        if (sixteenthNoteGroup.length > 0) {
                            if (sixteenthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            } else {
                                renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            sixteenthNoteGroup = [];
                        }
                        if (thirtySecondNoteGroup.length > 0) {
                            if (thirtySecondNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, thirtySecondNoteGroup, 'f');
                            } else {
                                renderRhythmStem(svg, thirtySecondNoteGroup[0].x, thirtySecondNoteGroup[0].rhythm, false, false, null, false);
                            }
                            thirtySecondNoteGroup = [];
                        }

                        eighthNoteGroup.push({x: x, rhythm: token.rhythm, hasDot: hasDot});

                        // Finalize group if it reaches 2 notes
                        if (eighthNoteGroup.length >= 2) {
                            renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            eighthNoteGroup = [];
                        }
                    }
                    // Handle sixteenth note beaming
                    else if (baseRhythm === 's') {
                        // Finalize any pending eighth note group
                        if (eighthNoteGroup.length > 0) {
                            if (eighthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            } else {
                                renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            eighthNoteGroup = [];
                        }
                        if (thirtySecondNoteGroup.length > 0) {
                            if (thirtySecondNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, thirtySecondNoteGroup, 'f');
                            } else {
                                renderRhythmStem(svg, thirtySecondNoteGroup[0].x, thirtySecondNoteGroup[0].rhythm, false, false, null, false);
                            }
                            thirtySecondNoteGroup = [];
                        }

                        sixteenthNoteGroup.push({x: x, rhythm: token.rhythm, hasDot: hasDot});

                        // Finalize group if it reaches 4 notes
                        if (sixteenthNoteGroup.length >= 4) {
                            renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            sixteenthNoteGroup = [];
                        }
                    }
                    // Handle 32nd note beaming
                    else if (baseRhythm === 'f') {
                        // Finalize any pending eighth or sixteenth note group
                        if (eighthNoteGroup.length > 0) {
                            if (eighthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            } else {
                                renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            eighthNoteGroup = [];
                        }
                        if (sixteenthNoteGroup.length > 0) {
                            if (sixteenthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            } else {
                                renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            sixteenthNoteGroup = [];
                        }

                        thirtySecondNoteGroup.push({x: x, rhythm: token.rhythm, hasDot: hasDot});

                        // Finalize group if it reaches 8 notes
                        if (thirtySecondNoteGroup.length >= 8) {
                            renderBeamedNotes(svg, thirtySecondNoteGroup, 'f');
                            thirtySecondNoteGroup = [];
                        }
                    }
                    // Other note types - finalize beaming groups and render normally
                    else {
                        // Finalize any pending beaming groups
                        if (eighthNoteGroup.length > 0) {
                            if (eighthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            } else {
                                renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            eighthNoteGroup = [];
                        }
                        if (sixteenthNoteGroup.length > 0) {
                            if (sixteenthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            } else {
                                renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            sixteenthNoteGroup = [];
                        }
                        if (thirtySecondNoteGroup.length > 0) {
                            if (thirtySecondNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, thirtySecondNoteGroup, 'f');
                            } else {
                                renderRhythmStem(svg, thirtySecondNoteGroup[0].x, thirtySecondNoteGroup[0].rhythm, false, false, null, false);
                            }
                            thirtySecondNoteGroup = [];
                        }

                        // Render non-beamable note (w, h, q, etc.)
                        renderRhythmStem(svg, x, token.rhythm, false, false, null, false);
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

                // Track triplet groups (skip tokens without rhythms)
                if (stringIndex === 0 && token.rhythm) {
                    if (isTriplet(token.rhythm)) {
                        if (tripletGroupStart === null) {
                            tripletGroupStart = x;
                            tripletCount = 1;
                            tripletStemPositions = [x + TAB_CONFIG.characterWidth / 2];
                        } else {
                            tripletCount++;
                            tripletStemPositions.push(x + TAB_CONFIG.characterWidth / 2);
                        }
                    } else if (tripletGroupStart !== null) {
                        // Non-triplet rhythm encountered, reset triplet tracking
                        tripletGroupStart = null;
                        tripletCount = 0;
                        tripletStemPositions = [];
                    }
                }

                // Render rhythm stem on the first string (only for tokens with rhythm)
                if (stringIndex === 0 && token.rhythm) {
                    const baseRhythm = getBaseRhythm(token.rhythm);
                    const hasDot = token.rhythm.includes('.');

                    // Handle triplets separately (they have their own beaming)
                    if (isTriplet(token.rhythm)) {
                        // Finalize any pending beaming groups before triplet
                        if (eighthNoteGroup.length > 0) {
                            if (eighthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            } else {
                                renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            eighthNoteGroup = [];
                        }
                        if (sixteenthNoteGroup.length > 0) {
                            if (sixteenthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            } else {
                                renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            sixteenthNoteGroup = [];
                        }

                        // Render triplet
                        const isFirstOfTriplet = (tripletCount === 1);
                        const isLastOfTriplet = (tripletCount === 3);
                        const tripletGroupX = isLastOfTriplet ? {firstStemX: tripletStemPositions[0], lastStemX: tripletStemPositions[2]} : null;

                        renderRhythmStem(svg, x, token.rhythm, isFirstOfTriplet, isLastOfTriplet, tripletGroupX, false);

                        if (isLastOfTriplet) {
                            tripletGroupStart = null;
                            tripletCount = 0;
                            tripletStemPositions = [];
                        }
                    }
                    // Handle eighth note beaming
                    else if (baseRhythm === 'e') {
                        // Finalize any pending sixteenth note group
                        if (sixteenthNoteGroup.length > 0) {
                            if (sixteenthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            } else {
                                renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            sixteenthNoteGroup = [];
                        }

                        eighthNoteGroup.push({x: x, rhythm: token.rhythm, hasDot: hasDot});

                        // Finalize group if it reaches 2 notes
                        if (eighthNoteGroup.length >= 2) {
                            renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            eighthNoteGroup = [];
                        }
                    }
                    // Handle sixteenth note beaming
                    else if (baseRhythm === 's') {
                        // Finalize any pending eighth note group
                        if (eighthNoteGroup.length > 0) {
                            if (eighthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            } else {
                                renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            eighthNoteGroup = [];
                        }

                        sixteenthNoteGroup.push({x: x, rhythm: token.rhythm, hasDot: hasDot});

                        // Finalize group if it reaches 4 notes
                        if (sixteenthNoteGroup.length >= 4) {
                            renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            sixteenthNoteGroup = [];
                        }
                    }
                    // Other note types - finalize beaming groups and render normally
                    else {
                        // Finalize any pending beaming groups
                        if (eighthNoteGroup.length > 0) {
                            if (eighthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, eighthNoteGroup, 'e');
                            } else {
                                renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            eighthNoteGroup = [];
                        }
                        if (sixteenthNoteGroup.length > 0) {
                            if (sixteenthNoteGroup.length >= 2) {
                                renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                            } else {
                                renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                            }
                            sixteenthNoteGroup = [];
                        }

                        // Render non-beamable note (w, h, q, etc.)
                        renderRhythmStem(svg, x, token.rhythm, false, false, null, false);
                    }
                }
            }

            // Add extra spacing if the previous token was a number and current is a technique letter
            // or vice versa (for multi-note techniques like "4s6")
            let extraSpacing = 0;
            if (tokenIndex > 0 && tokenIndex < tokens.length) {
                const prevToken = tokens[tokenIndex - 1];
                const currToken = token;

                // Check if we're in a multi-note sequence: number followed by letter, or letter followed by number
                const prevIsDigit = prevToken.value && /\d/.test(prevToken.value);
                const currIsLetter = currToken.value && /[hpsb]/.test(currToken.value);
                const prevIsLetter = prevToken.value && /[hpsb]/.test(prevToken.value);
                const currIsDigit = currToken.value && /\d/.test(currToken.value);

                if ((prevIsDigit && currIsLetter) || (prevIsLetter && currIsDigit)) {
                    extraSpacing = 1; // Add 1px spacing between numbers and technique letters
                }
            }

            currentX += TAB_CONFIG.characterWidth + extraSpacing;
        }

        // Finalize any remaining beaming groups at the end
        if (stringIndex === 0) {
            if (eighthNoteGroup.length > 0) {
                if (eighthNoteGroup.length >= 2) {
                    renderBeamedNotes(svg, eighthNoteGroup, 'e');
                } else {
                    renderRhythmStem(svg, eighthNoteGroup[0].x, eighthNoteGroup[0].rhythm, false, false, null, false);
                }
            }
            if (sixteenthNoteGroup.length > 0) {
                if (sixteenthNoteGroup.length >= 2) {
                    renderBeamedNotes(svg, sixteenthNoteGroup, 's');
                } else {
                    renderRhythmStem(svg, sixteenthNoteGroup[0].x, sixteenthNoteGroup[0].rhythm, false, false, null, false);
                }
            }
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
