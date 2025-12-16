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
        paddingTop: 20,          // Top padding
        paddingBottom: 20,       // Bottom padding
        paddingLeft: 40,         // Left padding (space for tuning labels)
        paddingRight: 10,        // Right padding
        stringColor: '#aaa',     // Color for strings
        barColor: '#aaa',        // Color for vertical bars
        numberColor: '#000',     // Color for fret numbers
        fontFamily: 'Courier New, monospace',
        tuningLabelOffset: 25    // Horizontal offset for tuning labels from left edge
    };

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

            groups.push({
                start: i,
                end: groupEnd,
                type: type,
                content: groupContent
            });

            i = groupEnd;
        }

        return groups;
    }

    /**
     * Convert vertical groups into aligned tokens for rendering
     */
    function normalizeTableture(lines) {
        const groups = identifyVerticalGroups(lines);

        // Build token arrays where each group creates one token per string
        const tokenLines = Array(lines.length).fill(null).map(() => []);

        for (const group of groups) {
            for (let stringIndex = 0; stringIndex < lines.length; stringIndex++) {
                const content = group.content[stringIndex];

                if (group.type === 'gap') {
                    // Gap - track the size for wider spacing
                    const spacing = group.gapSize > 1 ? 'wide' : 'normal';
                    tokenLines[stringIndex].push({type: 'dash', value: '-', spacing: spacing});
                } else if (content === '-') {
                    // Empty position - render as dash
                    tokenLines[stringIndex].push({type: 'dash', value: '-', spacing: 'normal'});
                } else if (content === '|') {
                    // Bar position
                    tokenLines[stringIndex].push({type: 'bar', value: '|'});
                } else {
                    // Content (number, letter, symbol, etc.)
                    tokenLines[stringIndex].push({type: 'content', value: content});
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
     *     "|--0------3-|"
     *   ]
     * }
     */
    function parseTabulature(config) {
        if (!config || !Array.isArray(config.content)) {
            console.warn('Invalid tabulature config: content array required');
            return null;
        }

        const lines = config.content;

        // Validate we have 6 strings (standard guitar)
        if (lines.length !== 6) {
            console.warn('Invalid tabulature: expected 6 strings, got', lines.length);
            return null;
        }

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

        // Normalize while preserving vertical alignment and get tokens
        const tokenLines = normalizeTableture(lines);

        // Find the maximum number of tokens
        const maxTokens = Math.max(...tokenLines.map(tokens => tokens.length));

        return {
            tokenLines: tokenLines,
            maxTokens: maxTokens,
            numStrings: tokenLines.length,
            tuning: tuning
        };
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
            } else if (token.type === 'dash') {
                // Render horizontal line segment (part of the string)
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x);
                line.setAttribute('y1', yPosition);

                // Use wider spacing for gaps with multiple dashes
                const width = token.spacing === 'wide' ? TAB_CONFIG.characterWidth * 2.0 : TAB_CONFIG.characterWidth;
                line.setAttribute('x2', x + width);
                line.setAttribute('y2', yPosition);
                line.setAttribute('stroke', TAB_CONFIG.stringColor);
                line.setAttribute('stroke-width', TAB_CONFIG.stringStrokeWidth);
                line.setAttribute('class', 'tab-line-segment');
                group.appendChild(line);

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
                text.setAttribute('fill', TAB_CONFIG.numberColor);
                text.setAttribute('class', 'tab-content');
                text.textContent = token.value;
                group.appendChild(text);
            }

            currentX += TAB_CONFIG.characterWidth;
        }

        svg.appendChild(group);
    }

    /**
     * Render the complete tablature
     */
    function renderTabulature(container, tabData) {
        // Calculate SVG width by accounting for wide spacing
        let totalWidth = TAB_CONFIG.paddingLeft + TAB_CONFIG.paddingRight;
        if (tabData.tokenLines.length > 0) {
            for (const token of tabData.tokenLines[0]) {
                if (token.type === 'dash' && token.spacing === 'wide') {
                    totalWidth += TAB_CONFIG.characterWidth * 2.5;
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
        svg.setAttribute('style', 'background-color: white;');

        // Render each string (from top to bottom, representing strings 1-6)
        for (let i = 0; i < tabData.numStrings; i++) {
            const yPosition = TAB_CONFIG.paddingTop + (i * TAB_CONFIG.lineHeight);
            const tuningLabel = tabData.tuning ? tabData.tuning[i] : null;
            renderString(svg, i, tabData.tokenLines[i], yPosition, tabData.maxTokens, tuningLabel);
        }

        container.appendChild(svg);
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
