/* key-chord-map.js
   Renders a harmonic overview for the selected key:
   - Diatonic major triads (I to vi)
   - Secondary dominants resolving to those triads
   - Modal interchange options from the parallel minor
*/
(function () {
    'use strict';

    const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    // Major keys that are commonly spelled with flats.
    const FLAT_KEY_ROOTS = new Set([1, 3, 5, 6, 8, 10, 11]);

    const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
    const NATURAL_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

    const MIDDLE_ROW = [
        { degree: 0, roman: 'I',    quality: 'M',   seventhType: 'Maj7' },
        { degree: 1, roman: 'ii',   quality: 'm',   seventhType: 'm7'   },
        { degree: 2, roman: 'iii',  quality: 'm',   seventhType: 'm7'   },
        { degree: 3, roman: 'IV',   quality: 'M',   seventhType: 'Maj7' },
        { degree: 4, roman: 'V',    quality: 'M',   seventhType: '7'    },
        { degree: 5, roman: 'vi',   quality: 'm',   seventhType: 'm7'   },
        { degree: 6, roman: 'vii°', quality: 'dim', seventhType: 'm7b5' }
    ];

    const MODAL_INTERCHANGE = [
        { sourceMinorDegree: 2, sourceRoman: 'bIII', quality: 'M',   seventhType: 'Maj7', targets: 'I'  },
        { sourceMinorDegree: 5, sourceRoman: 'bVI',  quality: 'M',   seventhType: 'Maj7', targets: 'IV' },
        { sourceMinorDegree: 3, sourceRoman: 'iv',   quality: 'm',   seventhType: '7',    targets: null },
        { sourceMinorDegree: 6, sourceRoman: 'bVII', quality: 'M',   seventhType: '7',    targets: 'V'  },
        { sourceMinorDegree: 1, sourceRoman: 'ii°',  quality: 'dim', seventhType: 'm7b5', targets: null }
    ];

    function getRootIndex() {
        const rootSelect = document.getElementById('root-note-select');
        if (!rootSelect) return 5; // A default
        const parsed = parseInt(rootSelect.value, 10);
        return Number.isNaN(parsed) ? 5 : parsed;
    }

    // The app's root selector is E-based (E=0). Convert to C-based semitone indexing.
    function selectorIndexToSemitone(selectorIndex) {
        return ((selectorIndex + 4) % 12 + 12) % 12;
    }

    function getEnharmonicState() {
        try {
            if (typeof Fretboard !== 'undefined' && Fretboard.instances && Fretboard.instances.length > 0) {
                return Fretboard.instances[0].state.enharmonic || 0;
            }
        } catch (e) { /* ignore */ }
        return 0;
    }

    function pickNoteNames(rootSemitone) {
        // Follow the global enharmonic toggle strictly:
        // 0 => sharps, 1 => flats.
        if (getEnharmonicState() === 1) return FLAT_NAMES;
        return SHARP_NAMES;
    }

    function noteName(index, names) {
        return names[((index % 12) + 12) % 12];
    }

    function chordName(rootSemitone, quality, names) {
        const root = noteName(rootSemitone, names);
        if (quality === 'm')   return root + 'm';
        if (quality === 'dim') return root + '°';
        return root;
    }

    function buildKeyData(rootSelectorIndex) {
        const rootSemitone = selectorIndexToSemitone(rootSelectorIndex);
        const names = pickNoteNames(rootSemitone);
        const majorScale = MAJOR_SCALE_INTERVALS.map(interval => (rootSemitone + interval) % 12);
        const parallelMinor = NATURAL_MINOR_INTERVALS.map(interval => (rootSemitone + interval) % 12);

        const middle = MIDDLE_ROW.map(item => {
            const semitone = majorScale[item.degree];
            return {
                chord: chordName(semitone, item.quality, names),
                roman: item.roman,
                quality: item.quality,
                seventhType: item.seventhType,
                semitone: semitone
            };
        });

        const secondary = middle.filter(item => item.quality !== 'dim').map(item => {
            const dominantSemitone = (item.semitone + 7) % 12;
            return {
                chord: chordName(dominantSemitone, 'M', names),
                resolvesTo: item.chord,
                roman: 'V/' + item.roman,
                seventhType: '7'
            };
        });

        const modal = MODAL_INTERCHANGE.map(item => {
            const semitone = parallelMinor[item.sourceMinorDegree];
            return {
                chord: chordName(semitone, item.quality, names),
                sourceRoman: item.sourceRoman,
                seventhType: item.seventhType,
                targets: item.targets
            };
        });

        return {
            keyName: noteName(rootSemitone, names),
            middle: middle,
            secondary: secondary,
            modal: modal
        };
    }

    function ensureStyles() {
        if (document.getElementById('key-chord-map-styles')) return;

        const style = document.createElement('style');
        style.id = 'key-chord-map-styles';
        style.textContent = [
            '.key-chord-map-wrap {',
            '  margin-top: 14px;',
            '  padding: 14px;',
            '  border: 1px solid #d9d9d9;',
            '  border-radius: 10px;',
            '  background: linear-gradient(180deg, #fdfdfd 0%, #f7f7f7 100%);',
            '}',
            '.key-chord-map-title {',
            '  margin: 0 0 12px 0;',
            '  font-size: 16px;',
            '}',
            '.key-chord-map-row {',
            '  border: 1px dashed #bdbdbd;',
            '  border-radius: 10px;',
            '  padding: 10px;',
            '  margin-bottom: 10px;',
            '  background: #ffffff;',
            '}',
            '.key-chord-map-row:last-child {',
            '  margin-bottom: 0;',
            '}',
            '.key-chord-map-row-label {',
            '  font-size: 12px;',
            '  text-transform: uppercase;',
            '  color: #666;',
            '  margin-bottom: 8px;',
            '  font-weight: 700;',
            '  letter-spacing: 0.05em;',
            '}',
            '.key-chord-map-grid {',
            '  display: grid;',
            '  grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));',
            '  gap: 8px;',
            '}',
            '.key-chord-map-card {',
            '  border: 1px solid #cfcfcf;',
            '  border-radius: 8px;',
            '  padding: 8px;',
            '  text-align: center;',
            '  background: #fbfbfb;',
            '}',
            '.key-chord-map-card-main {',
            '  font-size: 20px;',
            '  font-weight: 700;',
            '  line-height: 1.1;',
            '}',
            '.key-chord-map-card-sub {',
            '  margin-top: 4px;',
            '  font-size: 12px;',
            '  color: #666;',
            '}',
            '.key-chord-map-card-arrow {',
            '  margin-top: 6px;',
            '  font-size: 12px;',
            '  color: #3a3a3a;',
            '}',
            '.key-chord-map-seventh {',
            '  color: #888;',
            '  font-size: 11px;',
            '}',
            '.key-chord-map-connector {',
            '  text-align: center;',
            '  font-size: 12px;',
            '  color: #555;',
            '  font-style: italic;',
            '  padding: 4px 0;',
            '  margin: -4px 0;',
            '}',
            '.key-chord-map-card-main.dim { color: #b06000; }',
            '.key-chord-map-card-main.modal-dim { color: #b06000; }',

            '@media (max-width: 640px) {',
            '  .key-chord-map-wrap { padding: 10px; }',
            '  .key-chord-map-card-main { font-size: 18px; }',
            '}',
        ].join('\n');

        document.head.appendChild(style);
    }

    function renderInto(container) {
        if (!container) return;

        const rootIndex = getRootIndex();
        const data = buildKeyData(rootIndex);

        const secondaryHtml = data.secondary.map(item => {
            return [
                '<div class="key-chord-map-card">',
                '<div class="key-chord-map-card-main">' + item.chord + '</div>',
                '<div class="key-chord-map-card-sub">' + item.roman + ' <span class="key-chord-map-seventh">(' + item.seventhType + ')</span></div>',
                '<div class="key-chord-map-card-arrow">resolves to → ' + item.resolvesTo + '</div>',
                '</div>'
            ].join('');
        }).join('');

        const middleHtml = data.middle.map(item => {
            return [
                '<div class="key-chord-map-card">',
                '<div class="key-chord-map-card-main">' + item.chord + '</div>',
                '<div class="key-chord-map-card-sub">' + item.roman + ' <span class="key-chord-map-seventh">(' + item.seventhType + ')</span></div>',
                '</div>'
            ].join('');
        }).join('');

        const modalHtml = data.modal.map(item => {
            const arrowHtml = item.targets
                ? '<div class="key-chord-map-card-arrow">borrow for/ resolve to → ' + item.targets + '</div>'
                : '';
            return [
                '<div class="key-chord-map-card">',
                '<div class="key-chord-map-card-main">' + item.chord + '</div>',
                '<div class="key-chord-map-card-sub">' + item.sourceRoman + ' <span class="key-chord-map-seventh">(' + item.seventhType + ')</span></div>',
                arrowHtml,
                '</div>'
            ].join('');
        }).join('');

        container.innerHTML = [
            '<div class="key-chord-map-wrap">',
            '<h3 class="key-chord-map-title">Harmony Map for ' + data.keyName + ' Major</h3>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Secondary Dominants (not mixable)</div>',
            '<div class="key-chord-map-grid">' + secondaryHtml + '</div>',
            '</div>',
            '<div class="key-chord-map-connector">↑ Up: To any chord &nbsp;&nbsp;&bull;&nbsp;&nbsp; ↓ Down: Follow the resolution</div>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Main Chords (I to vi, mixable)</div>',
            '<div class="key-chord-map-grid">' + middleHtml + '</div>',
            '</div>',
            '<div class="key-chord-map-connector">↓ Down: From I, IV and V to any chord &nbsp;&nbsp;&bull;&nbsp;&nbsp; ↑ Up: Follow the resolution</div>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Modal Interchange (Parallel Minor Borrowing, mixable)</div>',
            '<div class="key-chord-map-grid">' + modalHtml + '</div>',
            '</div>',
            '</div>'
        ].join('');
    }

    function renderAll() {
        ensureStyles();
        const containers = document.querySelectorAll('.key-chord-map');
        containers.forEach(renderInto);
    }

    function init() {
        renderAll();

        const rootSelect = document.getElementById('root-note-select');
        if (rootSelect && !rootSelect.dataset.keyChordMapBound) {
            rootSelect.addEventListener('change', () => {
                renderAll();
            });
            rootSelect.dataset.keyChordMapBound = '1';
        }

        const enharmBtn = document.getElementById('toggle-enharmonic');
        if (enharmBtn && !enharmBtn.dataset.keyChordMapBound) {
            enharmBtn.addEventListener('click', () => {
                renderAll();
            });
            enharmBtn.dataset.keyChordMapBound = '1';
        }

        if (!document.body.dataset.keyChordMapDisplayEventBound) {
            document.addEventListener('fretboard-display-change', () => {
                renderAll();
            });
            document.body.dataset.keyChordMapDisplayEventBound = '1';
        }
    }

    window.initKeyChordMapView = init;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
