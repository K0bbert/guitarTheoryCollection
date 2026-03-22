/* key-chord-map.js
    Renders harmonic overviews for the selected key:
    - Major map: diatonic major + secondary dominants + parallel-minor borrowing
    - Aeolian map: natural minor + common applied dominants + parallel-major borrowing
    - Harmonic minor map: raised-leading-tone minor + applied dominants + common mixture
*/
(function () {
    'use strict';

    const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    // Major keys that are commonly spelled with flats.
    const FLAT_KEY_ROOTS = new Set([1, 3, 5, 6, 8, 10, 11]);

    const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
    const NATURAL_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
    const HARMONIC_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 11];

    const MAJOR_MIDDLE_ROW = [
        { degree: 0, roman: 'I',    quality: 'M',   seventhType: 'Maj7' },
        { degree: 1, roman: 'ii',   quality: 'm',   seventhType: 'm7'   },
        { degree: 2, roman: 'iii',  quality: 'm',   seventhType: 'm7'   },
        { degree: 3, roman: 'IV',   quality: 'M',   seventhType: 'Maj7' },
        { degree: 4, roman: 'V',    quality: 'M',   seventhType: '7'    },
        { degree: 5, roman: 'vi',   quality: 'm',   seventhType: 'm7'   },
        { degree: 6, roman: 'vii°', quality: 'dim', seventhType: 'm7b5' }
    ];

    const MAJOR_MODAL_INTERCHANGE = [
        { sourceMinorDegree: 2, sourceRoman: 'bIII', quality: 'M',   seventhType: 'Maj7', targets: 'I'  },
        { sourceMinorDegree: 5, sourceRoman: 'bVI',  quality: 'M',   seventhType: 'Maj7', targets: 'IV' },
        { sourceMinorDegree: 3, sourceRoman: 'iv',   quality: 'm',   seventhType: '7',    targets: null },
        { sourceMinorDegree: 6, sourceRoman: 'bVII', quality: 'M',   seventhType: '7',    targets: 'V'  },
        { sourceMinorDegree: 1, sourceRoman: 'ii°',  quality: 'dim', seventhType: 'm7b5', targets: null }
    ];

    // Aeolian (natural minor) diatonic collection: i ii° bIII iv v bVI bVII
    const AEOLIAN_MIDDLE_ROW = [
        { degree: 0, roman: 'i',    quality: 'm',   seventhType: 'm7',   allowSecondary: false },
        { degree: 1, roman: 'ii°',  quality: 'dim', seventhType: 'm7b5', allowSecondary: false },
        { degree: 2, roman: 'bIII', quality: 'M',   seventhType: 'Maj7', allowSecondary: true  },
        { degree: 3, roman: 'iv',   quality: 'm',   seventhType: 'm7',   allowSecondary: true  },
        { degree: 4, roman: 'v',    quality: 'm',   seventhType: 'm7',   allowSecondary: true  },
        { degree: 5, roman: 'bVI',  quality: 'M',   seventhType: 'Maj7', allowSecondary: true  },
        { degree: 6, roman: 'bVII', quality: 'M',   seventhType: '7',    allowSecondary: true  }
    ];

    // Common minor-mode mixture: borrow color from parallel major and harmonic-minor practice.
    const AEOLIAN_MODAL_INTERCHANGE = [
        { sourceMajorDegree: 0, sourceRoman: 'I',  quality: 'M', seventhType: 'Maj7', targets: 'i (Picardy)' },
        { sourceMajorDegree: 1, sourceRoman: 'ii', quality: 'm', seventhType: 'm7',   targets: 'ii°' },
        { sourceMajorDegree: 3, sourceRoman: 'IV', quality: 'M', seventhType: 'Maj7', targets: 'iv' },
        { sourceMajorDegree: 4, sourceRoman: 'V',  quality: 'M', seventhType: '7',    targets: 'v / i cadence' }
    ];

    // Harmonic minor diatonic collection: i ii° bIII+ iv V bVI vii°
    const HARMONIC_MINOR_MIDDLE_ROW = [
        { degree: 0, roman: 'i',     quality: 'm',   seventhType: 'mMaj7', allowSecondary: false },
        { degree: 1, roman: 'ii°',   quality: 'dim', seventhType: 'm7b5',  allowSecondary: false },
        { degree: 2, roman: 'bIII+', quality: 'aug', seventhType: 'Maj7',allowSecondary: true  },
        { degree: 3, roman: 'iv',    quality: 'm',   seventhType: 'm7',     allowSecondary: true  },
        { degree: 4, roman: 'V',     quality: 'M',   seventhType: '7',      allowSecondary: true  },
        { degree: 5, roman: 'bVI',   quality: 'M',   seventhType: 'Maj7',   allowSecondary: true  },
        { degree: 6, roman: 'vii°',  quality: 'dim', seventhType: 'dim7',   allowSecondary: false }
    ];

    // Common replacements/modal interchange around harmonic minor context.
    const HARMONIC_MINOR_MODAL_INTERCHANGE = [
        { sourceType: 'aeolian',         sourceRoman: 'bVII', quality: 'M', seventhType: '7',      targets: 'V / i turnarounds' },
        { sourceType: 'aeolian',         sourceRoman: 'iv7',  quality: 'm', seventhType: 'm7',     targets: 'iv (predominant color)' },
        { sourceType: 'parallel-major',  sourceRoman: 'I',    quality: 'M', seventhType: 'Maj7',   targets: 'i (Picardy tonic)' },
        { sourceType: 'phrygian-mixture',sourceRoman: 'bII',  quality: 'M', seventhType: 'Maj7',   targets: 'V (Neapolitan color)' },
        { sourceType: 'aeolian',         sourceRoman: 'iiø',  quality: 'dim', seventhType: 'm7b5', targets: 'ii° function' }
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
        if (quality === 'aug') return root + '+';
        return root;
    }

    function buildMajorKeyData(rootSelectorIndex) {
        const rootSemitone = selectorIndexToSemitone(rootSelectorIndex);
        const names = pickNoteNames(rootSemitone);
        const majorScale = MAJOR_SCALE_INTERVALS.map(interval => (rootSemitone + interval) % 12);
        const parallelMinor = NATURAL_MINOR_INTERVALS.map(interval => (rootSemitone + interval) % 12);

        const middle = MAJOR_MIDDLE_ROW.map(item => {
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

        const modal = MAJOR_MODAL_INTERCHANGE.map(item => {
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

    function buildAeolianKeyData(rootSelectorIndex) {
        const rootSemitone = selectorIndexToSemitone(rootSelectorIndex);
        const names = pickNoteNames(rootSemitone);
        const aeolianScale = NATURAL_MINOR_INTERVALS.map(interval => (rootSemitone + interval) % 12);
        const parallelMajor = MAJOR_SCALE_INTERVALS.map(interval => (rootSemitone + interval) % 12);

        const middle = AEOLIAN_MIDDLE_ROW.map(item => {
            const semitone = aeolianScale[item.degree];
            return {
                chord: chordName(semitone, item.quality, names),
                roman: item.roman,
                quality: item.quality,
                seventhType: item.seventhType,
                semitone: semitone,
                allowSecondary: item.allowSecondary
            };
        });

        const secondary = middle.filter(item => item.allowSecondary).map(item => {
            const dominantSemitone = (item.semitone + 7) % 12;
            return {
                chord: chordName(dominantSemitone, 'M', names),
                resolvesTo: item.chord,
                roman: 'V/' + item.roman,
                seventhType: '7'
            };
        });

        const modal = AEOLIAN_MODAL_INTERCHANGE.map(item => {
            const semitone = parallelMajor[item.sourceMajorDegree];
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

    function buildHarmonicMinorKeyData(rootSelectorIndex) {
        const rootSemitone = selectorIndexToSemitone(rootSelectorIndex);
        const names = pickNoteNames(rootSemitone);
        const harmonicMinorScale = HARMONIC_MINOR_INTERVALS.map(interval => (rootSemitone + interval) % 12);

        const middle = HARMONIC_MINOR_MIDDLE_ROW.map(item => {
            const semitone = harmonicMinorScale[item.degree];
            return {
                chord: chordName(semitone, item.quality, names),
                roman: item.roman,
                quality: item.quality,
                seventhType: item.seventhType,
                semitone: semitone,
                allowSecondary: item.allowSecondary
            };
        });

        const vChord = middle.find(item => item.roman === 'V');
        const harmonicTop = [];
        if (vChord) {
            const leadingToV = (vChord.semitone + 11) % 12;
            const diminishedFamilyRoots = [0, 3, 6, 9].map(offset => (leadingToV + offset) % 12);
            const diminishedFamilyLabels = [
                'vii°7/V',
                'vii°7/V alt. 1',
                'vii°7/V alt. 2',
                'vii°7/V alt. 3'
            ];

            diminishedFamilyRoots.forEach((root, index) => {
                harmonicTop.push({
                    chord: chordName(root, 'dim', names),
                    resolvesTo: vChord.chord,
                    roman: diminishedFamilyLabels[index],
                    seventhType: 'dim7'
                });
            });

            const neapolitanSemitone = (rootSemitone + 1) % 12;
            const neapolitanBass = noteName((neapolitanSemitone + 4) % 12, names);
            harmonicTop.push({
                chord: chordName(neapolitanSemitone, 'M', names) + '/' + neapolitanBass,
                resolvesTo: vChord.chord,
                roman: 'bII (Neapolitan)',
                seventhType: 'Maj7'
            });
        }

        const harmonicBottom = [];
        const ivChord = middle.find(item => item.roman === 'iv');
        const bVIChord = middle.find(item => item.roman === 'bVI');
        if (ivChord) {
            const leadingToIv = (ivChord.semitone + 11) % 12;
            const diminishedFamilyRoots = [0, 3, 6, 9].map(offset => (leadingToIv + offset) % 12);

            diminishedFamilyRoots.forEach((root, index) => {
                let resolvesTo = null;
                if (index === 0 || index === 1) {
                    resolvesTo = ivChord.chord;
                } else if (index === 2) {
                    resolvesTo = bVIChord ? bVIChord.chord : ivChord.chord;
                }

                harmonicBottom.push({
                    chord: chordName(root, 'dim', names),
                    resolvesTo: resolvesTo,
                    roman: 'vii°7/iv,bVI',
                    seventhType: 'dim7'
                });
            });
        }

        return {
            keyName: noteName(rootSemitone, names),
            middle: middle,
            harmonicTop: harmonicTop,
            harmonicBottom: harmonicBottom
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

    function renderMajorInto(container) {
        if (!container) return;

        const rootIndex = getRootIndex();
        const data = buildMajorKeyData(rootIndex);

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

    function renderAeolianInto(container) {
        if (!container) return;

        const rootIndex = getRootIndex();
        const data = buildAeolianKeyData(rootIndex);

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
            return [
                '<div class="key-chord-map-card">',
                '<div class="key-chord-map-card-main">' + item.chord + '</div>',
                '<div class="key-chord-map-card-sub">' + item.sourceRoman + ' <span class="key-chord-map-seventh">(' + item.seventhType + ')</span></div>',
                '<div class="key-chord-map-card-arrow">borrow for / reinforce → ' + item.targets + '</div>',
                '</div>'
            ].join('');
        }).join('');

        container.innerHTML = [
            '<div class="key-chord-map-wrap">',
            '<h3 class="key-chord-map-title">Harmony Map for ' + data.keyName + ' Aeolian (Natural Minor)</h3>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Applied Dominants (common minor-key tonicizations)</div>',
            '<div class="key-chord-map-grid">' + secondaryHtml + '</div>',
            '</div>',
            '<div class="key-chord-map-connector">↑ Up: To any chord &nbsp;&nbsp;&bull;&nbsp;&nbsp; ↓ Down: Follow the resolution</div>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Main Chords in Aeolian (mixable)</div>',
            '<div class="key-chord-map-grid">' + middleHtml + '</div>',
            '</div>',
            '<div class="key-chord-map-connector">↓ Down: Borrow major-color options &nbsp;&nbsp;&bull;&nbsp;&nbsp; ↑ Up: Return to Aeolian function</div>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Modal Interchange for Minor (from parallel major / cadence practice)</div>',
            '<div class="key-chord-map-grid">' + modalHtml + '</div>',
            '</div>',
            '</div>'
        ].join('');
    }

    function renderHarmonicMinorInto(container) {
        if (!container) return;

        const rootIndex = getRootIndex();
        const data = buildHarmonicMinorKeyData(rootIndex);

        const topHtml = data.harmonicTop.map(item => {
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

        const bottomHtml = data.harmonicBottom.map(item => {
            const arrowHtml = item.resolvesTo
                ? '<div class="key-chord-map-card-arrow">resolves to → ' + item.resolvesTo + '</div>'
                : '';
            return [
                '<div class="key-chord-map-card">',
                '<div class="key-chord-map-card-main">' + item.chord + '</div>',
                '<div class="key-chord-map-card-sub">' + item.roman + ' <span class="key-chord-map-seventh">(' + item.seventhType + ')</span></div>',
                arrowHtml,
                '</div>'
            ].join('');
        }).join('');

        container.innerHTML = [
            '<div class="key-chord-map-wrap">',
            '<h3 class="key-chord-map-title">Harmony Map for ' + data.keyName + ' Harmonic Minor</h3>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Secondary Diminished to V + bII Neapolitan (mixable)</div>',
            '<div class="key-chord-map-grid">' + topHtml + '</div>',
            '</div>',
            '<div class="key-chord-map-connector">↑ Up: To any chord &nbsp;&nbsp;&bull;&nbsp;&nbsp; ↓ Down: Follow the resolution</div>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Main Chords in Harmonic Minor (mixable)</div>',
            '<div class="key-chord-map-grid">' + middleHtml + '</div>',
            '</div>',
            '<div class="key-chord-map-connector">↓ Down: To any chord &nbsp;&nbsp;&bull;&nbsp;&nbsp; ↑ Up: Follow the resolution to return to harmonic-minor function</div>',
            '<div class="key-chord-map-row">',
            '<div class="key-chord-map-row-label">Secondary Diminished to iv and bVI (mixable)</div>',
            '<div class="key-chord-map-grid">' + bottomHtml + '</div>',
            '</div>',
            '</div>'
        ].join('');
    }

    function renderAll() {
        ensureStyles();
        const majorContainers = document.querySelectorAll('.key-chord-map');
        majorContainers.forEach(renderMajorInto);

        const aeolianContainers = document.querySelectorAll('.key-chord-map-aeolian');
        aeolianContainers.forEach(renderAeolianInto);

        const harmonicMinorContainers = document.querySelectorAll('.key-chord-map-harmonic-minor');
        harmonicMinorContainers.forEach(renderHarmonicMinorInto);
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
