/* scale-database.js
   Small key/scale helper for tablature highlighting.
   Exposes window.ScaleDatabase.
*/
(function () {
    'use strict';

    const NOTE_INDEX_BY_NAME = {
        'C': 8,
        'B#': 8,
        'C#': 9,
        'Db': 9,
        'D': 10,
        'D#': 11,
        'Eb': 11,
        'E': 0,
        'Fb': 0,
        'E#': 1,
        'F': 1,
        'F#': 2,
        'Gb': 2,
        'G': 3,
        'G#': 4,
        'Ab': 4,
        'A': 5,
        'A#': 6,
        'Bb': 6,
        'B': 7,
        'Cb': 7,
    };

    const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
    const PENTATONIC_INTERVALS = {
        maj: [0, 2, 4, 7, 9],
        min: [0, 3, 5, 7, 10],
    };

    function normalizeNoteName(noteName) {
        if (!noteName) return '';
        return noteName.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
    }

    function getPitchClass(noteName) {
        const normalized = normalizeNoteName(noteName);
        return Object.prototype.hasOwnProperty.call(NOTE_INDEX_BY_NAME, normalized)
            ? NOTE_INDEX_BY_NAME[normalized]
            : null;
    }

    function parseKeySignature(keyText) {
        if (typeof keyText !== 'string') return null;

        const compact = normalizeNoteName(keyText).replace(/\s+/g, '');
        const match = compact.match(/^([A-Ga-g])([#b]?)(maj|min|m)?$/i);
        if (!match) return null;

        const root = `${match[1].toUpperCase()}${match[2] || ''}`;
        const qualityToken = (match[3] || 'maj').toLowerCase();
        const quality = qualityToken === 'm' ? 'min' : qualityToken;

        if (getPitchClass(root) === null) return null;

        return {
            raw: compact,
            root,
            quality,
            canonical: `${root}${quality}`,
        };
    }

    function getScalePitchClasses(rootNote, intervals) {
        const rootPitch = getPitchClass(rootNote);
        if (rootPitch === null) return [];

        return intervals.map(interval => (rootPitch + interval) % 12);
    }

    function getMajorScalePitchClasses(rootNote) {
        return getScalePitchClasses(rootNote, MAJOR_SCALE_INTERVALS);
    }

    function getPentatonicPitchClasses(keyText) {
        const parsed = parseKeySignature(keyText);
        if (!parsed) return [];

        const intervals = PENTATONIC_INTERVALS[parsed.quality] || PENTATONIC_INTERVALS.maj;
        return getScalePitchClasses(parsed.root, intervals);
    }

    if (typeof window !== 'undefined') {
        window.ScaleDatabase = {
            NOTE_INDEX_BY_NAME,
            MAJOR_SCALE_INTERVALS,
            PENTATONIC_INTERVALS,
            normalizeNoteName,
            parseKeySignature,
            getPitchClass,
            getScalePitchClasses,
            getMajorScalePitchClasses,
            getPentatonicPitchClasses,
        };
    }
})();
