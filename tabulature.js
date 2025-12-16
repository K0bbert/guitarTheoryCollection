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
        paddingLeft: 10,         // Left padding
        paddingRight: 10,        // Right padding
        stringColor: '#333',     // Color for strings
        barColor: '#333',        // Color for vertical bars
        numberColor: '#000',     // Color for fret numbers
        fontFamily: 'Courier New, monospace'
    };

    /**
     * Normalize tablature by collapsing consecutive "empty" columns (columns with only dashes/spaces)
     * while preserving vertical alignment of notes
     */
    function normalizeTableture(lines) {
        // Pad all lines to the same length first
        const maxLen = Math.max(...lines.map(line => line.length));
        const paddedLines = lines.map(line => line.padEnd(maxLen, '-'));

        // Determine which columns to keep
        const columnsToKeep = [];
        let i = 0;
        while (i < maxLen) {
            // Check if current column has any non-dash/space characters across all strings
            const hasContent = paddedLines.some(line => {
                const char = line[i];
                return char !== '-' && char !== ' ';
            });

            if (hasContent) {
                // This column has content (number or bar), keep it
                columnsToKeep.push(i);
                i++;
            } else {
                // This column is all dashes/spaces
                // Keep one column to represent the gap
                columnsToKeep.push(i);
                // Skip all consecutive empty columns
                while (i < maxLen && paddedLines.every(line => {
                    const char = line[i];
                    return char === '-' || char === ' ';
                })) {
                    i++;
                }
            }
        }

        // Build normalized lines by keeping only selected columns
        const normalizedLines = paddedLines.map(line => {
            let result = '';
            for (const colIndex of columnsToKeep) {
                const char = line[colIndex];
                // Convert spaces to dashes for consistency
                result += (char === ' ') ? '-' : char;
            }
            return result;
        });

        return normalizedLines;
    }

    /**
     * Parse tablature content from the JSON structure
     * Expected format:
     * {
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

        // Normalize while preserving vertical alignment
        const normalizedLines = normalizeTableture(lines);

        // Find the maximum length
        const maxLength = Math.max(...normalizedLines.map(line => line.length));

        return {
            lines: normalizedLines,
            maxLength: maxLength,
            numStrings: normalizedLines.length
        };
    }

    /**
     * Render a single tablature string (guitar string line)
     */
    function renderString(svg, stringIndex, tabLine, yPosition, maxLength) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `tab-string tab-string-${stringIndex}`);

        let currentX = TAB_CONFIG.paddingLeft;

        for (let charIndex = 0; charIndex < maxLength; charIndex++) {
            const char = charIndex < tabLine.length ? tabLine[charIndex] : ' ';
            const x = currentX;

            if (char === '|') {
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
            } else if (char === '-' || char === ' ') {
                // Render horizontal line segment (part of the string)
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x);
                line.setAttribute('y1', yPosition);
                line.setAttribute('x2', x + TAB_CONFIG.characterWidth);
                line.setAttribute('y2', yPosition);
                line.setAttribute('stroke', TAB_CONFIG.stringColor);
                line.setAttribute('stroke-width', TAB_CONFIG.stringStrokeWidth);
                line.setAttribute('class', 'tab-line-segment');
                group.appendChild(line);
            } else if (char >= '0' && char <= '9') {
                // Render fret number
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x + TAB_CONFIG.characterWidth / 2);
                text.setAttribute('y', yPosition + 5); // Slight offset for better vertical centering
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-family', TAB_CONFIG.fontFamily);
                text.setAttribute('font-size', TAB_CONFIG.fontSize);
                text.setAttribute('fill', TAB_CONFIG.numberColor);
                text.setAttribute('class', 'tab-number');
                text.textContent = char;
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
        // Calculate SVG dimensions
        const width = (tabData.maxLength * TAB_CONFIG.characterWidth) +
                      TAB_CONFIG.paddingLeft + TAB_CONFIG.paddingRight;
        const height = (5 * TAB_CONFIG.lineHeight) +
                       TAB_CONFIG.paddingTop + TAB_CONFIG.paddingBottom;

        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('class', 'tablature-svg');
        svg.setAttribute('style', 'background-color: white;');

        // Render each string (from top to bottom, representing strings 1-6)
        for (let i = 0; i < tabData.numStrings; i++) {
            const yPosition = TAB_CONFIG.paddingTop + (i * TAB_CONFIG.lineHeight);
            renderString(svg, i, tabData.lines[i], yPosition, tabData.maxLength);
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
