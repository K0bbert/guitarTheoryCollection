/* rhythm-playback.js
   Provides rhythm playback functionality with metronome for guitar tablature.
   Uses Web Audio API to generate beeps/clicks for both metronome and note playback.
*/
(function () {
    'use strict';

    // Audio context (initialized on first user interaction)
    let audioContext = null;
    let cachedNoiseBuffer = null;
    let cachedNoiseSampleRate = 0;

    // Default BPM
    const DEFAULT_BPM = 120;
    const DEFAULT_TIME_SIGNATURE = {
        numerator: 4,
        denominator: 4,
        label: '4/4'
    };

    // Audio frequencies
    const FREQUENCIES = {
        metronomeStrong: 1200,  // First beat of bar (Hz)
        metronomeWeak: 800,     // Other beats (Hz)
        note: 600,              // Note playback (Hz)
        rest: 400               // Rest (optional, lower tone)
    };

    // Musical key frequencies (4th octave)
    const KEY_FREQUENCIES = {
        'C': 261.63,
        'C#': 277.18,
        'D': 293.66,
        'D#': 311.13,
        'E': 329.63,
        'F': 349.23,
        'F#': 369.99,
        'G': 392.00,
        'G#': 415.30,
        'A': 440.00,
        'A#': 466.16,
        'B': 493.88
    };

    // Current note frequency (defaults to A)
    let currentNoteFrequency = KEY_FREQUENCIES['A'];

    // Global settings shared across all playback controls
    let globalBPM = DEFAULT_BPM;
    let globalKey = 'A';
    let globalTimeSignature = DEFAULT_TIME_SIGNATURE;

    function parseTimeSignature(timeText) {
        if (typeof timeText !== 'string' || !timeText.trim()) {
            return DEFAULT_TIME_SIGNATURE;
        }

        const compact = timeText.trim().replace(/\s+/g, '');
        const match = compact.match(/^(\d+)\/(\d+)$/);
        if (!match) return DEFAULT_TIME_SIGNATURE;

        const numerator = parseInt(match[1], 10);
        const denominator = parseInt(match[2], 10);
        if ((numerator === 3 || numerator === 4) && denominator === 4) {
            return { numerator, denominator, label: `${numerator}/${denominator}` };
        }

        return DEFAULT_TIME_SIGNATURE;
    }

    function getBeatsPerBar(timeSignature) {
        if (!timeSignature || typeof timeSignature.numerator !== 'number') {
            return DEFAULT_TIME_SIGNATURE.numerator;
        }
        return timeSignature.numerator;
    }

    // Map root note selector values to key names
    const ROOT_NOTE_TO_KEY = {
        '0': 'E',
        '1': 'F',
        '2': 'F#',
        '3': 'G',
        '4': 'G#',
        '5': 'A',
        '6': 'A#',
        '7': 'B',
        '8': 'C',
        '9': 'C#',
        '10': 'D',
        '11': 'D#'
    };

    // Audio durations (in seconds)
    const DURATIONS = {
        metronomeClick: 0.05,   // Short click
        noteBeep: 0.1           // Slightly longer beep for notes
    };

    // Small visual lead so the progress bar better matches perceived audio on the main thread.
    const VISUAL_LEAD_SECONDS = 0.015; // 15ms
    // Additional snap tolerance for event boundaries to avoid per-frame late jumps.
    const BOUNDARY_SNAP_SECONDS = 0.008; // ~half frame at 60fps

    /**
     * Initialize the Audio Context (must be called after user interaction)
     */
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    function getCachedNoiseBuffer(ctx) {
        if (!ctx) return null;

        if (!cachedNoiseBuffer || cachedNoiseSampleRate !== ctx.sampleRate) {
            const bufferSize = Math.floor(ctx.sampleRate * 0.03);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            cachedNoiseBuffer = buffer;
            cachedNoiseSampleRate = ctx.sampleRate;
        }

        return cachedNoiseBuffer;
    }

    /**
     * Play a metronome click sound using noise for a realistic click
     * @param {boolean} isStrong - Whether this is a strong beat (first of bar)
     * @param {number} time - When to play (in audioContext time)
     */
    function playMetronomeClick(isStrong, time) {
        if (!audioContext) return;

        // Create buffer source
        const noise = audioContext.createBufferSource();
        noise.buffer = getCachedNoiseBuffer(audioContext);

        // Create filter to shape the click sound
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = isStrong ? 2500 : 1500; // Much brighter for strong beat
        filter.Q.value = 1;

        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        const volume = isStrong ? 0.7 : 0.2; // Stronger contrast in volume

        // Very sharp envelope for click sound
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(volume, time + 0.001); // Very fast attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.03); // Quick decay

        // Connect nodes
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // For strong beat, add a low frequency "thump" for more punch
        if (isStrong) {
            const lowOsc = audioContext.createOscillator();
            const lowGain = audioContext.createGain();

            lowOsc.frequency.value = 100; // Low frequency thump
            lowOsc.type = 'sine';

            // Quick punch envelope
            lowGain.gain.setValueAtTime(0, time);
            lowGain.gain.linearRampToValueAtTime(0.3, time + 0.002);
            lowGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

            lowOsc.connect(lowGain);
            lowGain.connect(audioContext.destination);

            lowOsc.start(time);
            lowOsc.stop(time + 0.05);
        }

        // Play the click
        noise.start(time);
        noise.stop(time + 0.03);
    }

    /**
     * Play a beep sound for notes
     * @param {number} frequency - Frequency in Hz
     * @param {number} duration - Duration in seconds
     * @param {number} time - When to play (in audioContext time)
     * @param {number} volume - Volume (0-1)
     */
    function playBeep(frequency, duration, time, volume = 0.3) {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        // Envelope for smooth attack/release
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(volume, time + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, time + duration);

        oscillator.start(time);
        oscillator.stop(time + duration);
    }

    /**
     * Get duration in beats for a rhythm symbol (copied from tabulature.js logic)
     */
    function getRhythmDuration(rhythm) {
        if (!rhythm) return 0;

        // Remove 'p' (pause) and 't' (triplet) to get base
        const base = rhythm.replace(/[pt.]/g, '');
        const hasDot = rhythm.includes('.');
        const isTriplet = rhythm.includes('t') && !rhythm.includes('p'); // 't' but not 'tp'

        let duration = 0;
        switch(base) {
            case 'w': duration = 4; break;    // whole note
            case 'h': duration = 2; break;    // half note
            case 'q': duration = 1; break;    // quarter note
            case 'e': duration = 0.5; break;  // eighth note
            case 's': duration = 0.25; break; // sixteenth note
            case 'f': duration = 0.125; break;// 32nd note
            case 't': duration = 0.0625; break;// 64th note
            default: duration = 0;
        }

        // Dotted notes are 1.5x their duration
        if (hasDot) {
            duration *= 1.5;
        }

        // Triplets: 3 notes in the time of 2, so each is 2/3 duration
        if (isTriplet) {
            duration = duration * 2 / 3;
        }

        return duration;
    }

    function buildTiePlaybackMap(rhythmSequence, tieData) {
        const tieMap = {
            suppressAttackByNoteIndex: new Set(),
            sustainExtraBeatsByNoteIndex: {}
        };

        if (!Array.isArray(rhythmSequence) || rhythmSequence.length === 0) {
            return tieMap;
        }

        const noteEventDurations = [];
        rhythmSequence.forEach(item => {
            if (!item.isPause) {
                noteEventDurations.push(item.duration || 0);
            }
        });

        if (!Array.isArray(tieData) || tieData.length === 0 || noteEventDurations.length === 0) {
            return tieMap;
        }

        const effectiveSourceByNoteIndex = noteEventDurations.map((_, idx) => idx);

        tieData.forEach(tie => {
            if (!tie || typeof tie.fromNoteIndex !== 'number' || typeof tie.toNoteIndex !== 'number') {
                return;
            }

            const fromIdx = tie.fromNoteIndex;
            const toIdx = tie.toNoteIndex;
            if (fromIdx < 0 || toIdx < 0 || fromIdx >= noteEventDurations.length || toIdx >= noteEventDurations.length) {
                return;
            }
            if (toIdx <= fromIdx) {
                return;
            }

            const sourceIdx = effectiveSourceByNoteIndex[fromIdx];
            const targetDuration = noteEventDurations[toIdx] || 0;

            if (targetDuration > 0) {
                if (!Object.prototype.hasOwnProperty.call(tieMap.sustainExtraBeatsByNoteIndex, sourceIdx)) {
                    tieMap.sustainExtraBeatsByNoteIndex[sourceIdx] = 0;
                }
                tieMap.sustainExtraBeatsByNoteIndex[sourceIdx] += targetDuration;
            }

            tieMap.suppressAttackByNoteIndex.add(toIdx);
            effectiveSourceByNoteIndex[toIdx] = sourceIdx;
        });

        return tieMap;
    }

    /**
     * Parse rhythm sequence from a tablature's rhythm data
     * Expected format: array of {symbol, isPause} objects
     */
    function parseRhythmSequence(rhythmData, tieData) {
        if (!rhythmData || !Array.isArray(rhythmData)) return [];

        const baseSequence = rhythmData.map(item => ({
            symbol: item.symbol,
            duration: getRhythmDuration(item.symbol),
            isPause: item.isPause || false
        }));

        const tieMap = buildTiePlaybackMap(baseSequence, tieData);
        let noteEventIndex = 0;

        return baseSequence.map(item => {
            if (item.isPause) {
                return item;
            }

            const currentNoteIndex = noteEventIndex;
            noteEventIndex++;

            return {
                ...item,
                noteEventIndex: currentNoteIndex,
                suppressAttack: tieMap.suppressAttackByNoteIndex.has(currentNoteIndex),
                tieSustainExtraBeats: tieMap.sustainExtraBeatsByNoteIndex[currentNoteIndex] || 0
            };
        });
    }

    /**
     * Calculate total duration of rhythm sequence in beats
     */
    function getTotalBeats(rhythmSequence) {
        return rhythmSequence.reduce((sum, item) => sum + item.duration, 0);
    }

    /**
     * Validate rhythm sequence - check if bars are complete (4 beats each)
     * @param {Array} rhythmSequence - Array of {symbol, duration, isPause}
     * @param {Array} rhythmData - Original rhythm data with barIndex
     * @returns {Object} {isValid, errors: [{barIndex, expected, actual, difference}]}
     */
    function validateRhythmSequence(rhythmSequence, rhythmData, timeSignature) {
        if (!rhythmData || rhythmData.length === 0) {
            return { isValid: true, errors: [] };
        }

        const beatsPerBar = getBeatsPerBar(timeSignature);
        const errors = [];
        const barDurations = {};

        // Group rhythms by bar and calculate duration for each bar
        rhythmData.forEach((item, index) => {
            const barIndex = item.barIndex || 0;
            const duration = rhythmSequence[index]?.duration || 0;

            if (!barDurations[barIndex]) {
                barDurations[barIndex] = 0;
            }
            barDurations[barIndex] += duration;
        });

        // Check each bar against the active time signature.
        Object.keys(barDurations).forEach(barIndex => {
            const duration = barDurations[barIndex];
            const difference = duration - beatsPerBar;

            // Use epsilon for floating point comparison (triplets create fractions)
            if (Math.abs(difference) >= 0.001) {
                errors.push({
                    barIndex: parseInt(barIndex),
                    expected: beatsPerBar,
                    actual: duration,
                    difference: difference
                });
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Play rhythm sequence with metronome
     * @param {Array} rhythmSequence - Array of {symbol, duration, isPause}
     * @param {number} bpm - Beats per minute
     * @param {boolean} loop - Whether to loop playback
     * @param {boolean} countIn - Whether to play a count-in before rhythm
     * @param {boolean} countInOnce - Whether to only count-in before the first iteration (only applies if loop is true)
     * @param {Function} onStop - Callback when playback finishes
     * @param {Function} onBeat - Callback for each beat (for visual feedback)
     */
    function playRhythmSequence(rhythmSequence, bpm, loop, countIn, countInOnce, onStop, onBeat, timeSignature) {
        const ctx = initAudioContext();
        if (!ctx) {
            console.error('Failed to initialize audio context');
            return null;
        }

        const beatsPerBar = getBeatsPerBar(timeSignature);
        const secondsPerBeat = 60 / bpm;
        const totalBeats = getTotalBeats(rhythmSequence);
        const totalDuration = totalBeats * secondsPerBeat;
        const countInBeats = beatsPerBar; // One full bar count-in
        const countInDuration = countInBeats * secondsPerBeat;

        // Track all scheduled timeouts and audio nodes for cleanup
        const scheduledTimeouts = [];
        const scheduledNodes = [];
        let isRunning = true;
        let schedulerInterval = null;
        let nextIterationTime = null;

        /**
         * Schedule count-in metronome clicks
         */
        function scheduleCountIn(startTime) {
            if (!countIn) return startTime;

            // Schedule one count-in bar
            for (let beat = 0; beat < countInBeats; beat++) {
                const beatTime = startTime + (beat * secondsPerBeat);
                const isStrongBeat = (beat % beatsPerBar === 0);
                scheduleMetronomeClick(isStrongBeat, beatTime);
            }

            return startTime + countInDuration;
        }

        /**
         * Schedule one playthrough of the rhythm at a specific time
         */
        function schedulePlaythrough(startTime, includeCountIn) {
            // Add count-in if requested
            let rhythmStartTime = startTime;
            if (includeCountIn) {
                rhythmStartTime = scheduleCountIn(startTime);
            }

            let currentBeat = 0;

            // Schedule metronome clicks for each quarter-note beat
            const numMetronomeBeats = Math.ceil(totalBeats);
            for (let beat = 0; beat < numMetronomeBeats; beat++) {
                const beatTime = rhythmStartTime + (beat * secondsPerBeat);
                const isStrongBeat = (beat % beatsPerBar === 0);

                // Create and schedule metronome click
                scheduleMetronomeClick(isStrongBeat, beatTime);
            }

            // Schedule note beeps based on rhythm
            rhythmSequence.forEach((item, index) => {
                const noteTime = rhythmStartTime + (currentBeat * secondsPerBeat);

                // Callback for visual feedback
                if (onBeat) {
                    const delay = (noteTime - ctx.currentTime) * 1000;
                    if (delay > 0) {
                        const timeout = setTimeout(() => {
                            if (isRunning) onBeat(index);
                        }, delay);
                        scheduledTimeouts.push(timeout);
                    }
                }

                // Play note beep (unless it's a rest/pause or a tied target note)
                if (!item.isPause && !item.suppressAttack) {
                    const sustainBeats = item.duration + (item.tieSustainExtraBeats || 0);
                    const sustainSeconds = sustainBeats * secondsPerBeat;
                    scheduleNoteBeep(noteTime, sustainSeconds);
                }

                currentBeat += item.duration;
            });

            // Calculate exact end time of this playthrough
            const endTime = rhythmStartTime + totalDuration;
            return {
                rhythmStartTime: rhythmStartTime,
                endTime: endTime
            };
        }

        /**
         * Look-ahead scheduler - schedules the next iteration when needed
         */
        function schedulerTick() {
            if (!isRunning) return;

            const lookAhead = 0.5; // Schedule 0.5 seconds in advance
            const scheduleAheadTime = ctx.currentTime + lookAhead;

            // If we need to schedule the next iteration
            if (loop && (!nextIterationTime || nextIterationTime < scheduleAheadTime)) {
                // Schedule next iteration
                // If countInOnce is true, don't include count-in for subsequent iterations
                const includeCountInForNext = countIn && !countInOnce;
                const iterationStart = nextIterationTime || ctx.currentTime;
                const scheduledIteration = schedulePlaythrough(iterationStart, includeCountInForNext);
                nextIterationTime = scheduledIteration.endTime;
            }
        }

        /**
         * Schedule a metronome click
         */
        function scheduleMetronomeClick(isStrong, time) {
            if (!ctx || !isRunning) return;

            const noise = ctx.createBufferSource();
            noise.buffer = getCachedNoiseBuffer(ctx);

            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = isStrong ? 2500 : 1500;
            filter.Q.value = 1;

            const gainNode = ctx.createGain();
            const volume = isStrong ? 0.7 : 0.2;

            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(volume, time + 0.001);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.03);

            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            noise.start(time);
            noise.stop(time + 0.03);
            scheduledNodes.push(noise);

            // Add low frequency thump for strong beat
            if (isStrong) {
                const lowOsc = ctx.createOscillator();
                const lowGain = ctx.createGain();

                lowOsc.frequency.value = 100;
                lowOsc.type = 'sine';

                lowGain.gain.setValueAtTime(0, time);
                lowGain.gain.linearRampToValueAtTime(0.3, time + 0.002);
                lowGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

                lowOsc.connect(lowGain);
                lowGain.connect(ctx.destination);

                lowOsc.start(time);
                lowOsc.stop(time + 0.05);
                scheduledNodes.push(lowOsc);
            }
        }

        /**
         * Schedule a note beep
         */
        function scheduleNoteBeep(time, sustainSeconds) {
            if (!ctx || !isRunning) return;

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = currentNoteFrequency;
            oscillator.type = 'sine';

            const safeSustain = Math.max(DURATIONS.noteBeep, sustainSeconds || DURATIONS.noteBeep);
            const releaseSeconds = Math.min(0.03, safeSustain * 0.2);
            const holdEnd = Math.max(time + 0.01, time + safeSustain - releaseSeconds);

            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.5, time + 0.01);
            gainNode.gain.setValueAtTime(0.5, holdEnd);
            gainNode.gain.linearRampToValueAtTime(0, time + safeSustain);

            oscillator.start(time);
            oscillator.stop(time + safeSustain);
            scheduledNodes.push(oscillator);
        }

        // Schedule the first playthrough
        const initialScheduleTime = ctx.currentTime + 0.1;
        const firstIteration = schedulePlaythrough(initialScheduleTime, countIn);
        const actualStartTime = firstIteration.rhythmStartTime;

        // If looping, start the look-ahead scheduler
        if (loop) {
            nextIterationTime = firstIteration.endTime;
            schedulerInterval = setInterval(schedulerTick, 100); // Check every 100ms
        } else {
            // Schedule stop callback for non-looping playback
            const stopDelay = Math.max(0, (firstIteration.endTime - ctx.currentTime) * 1000);
            const stopTimeout = setTimeout(() => {
                if (isRunning && onStop) {
                    onStop();
                }
            }, stopDelay);
            scheduledTimeouts.push(stopTimeout);
        }

        // Return control object
        return {
            startTime: actualStartTime,
            duration: totalDuration,
            stop: () => {
                isRunning = false;

                // Stop the scheduler interval
                if (schedulerInterval) {
                    clearInterval(schedulerInterval);
                    schedulerInterval = null;
                }

                // Clear all scheduled timeouts
                scheduledTimeouts.forEach(timeout => clearTimeout(timeout));
                scheduledTimeouts.length = 0;

                // Stop all scheduled audio nodes
                scheduledNodes.forEach(node => {
                    try {
                        if (node.stop) node.stop();
                    } catch (e) {
                        // Node may have already finished
                    }
                });
                scheduledNodes.length = 0;

                // Call the stop callback
                if (onStop) onStop();
            },
            duration: totalDuration
        };
    }

    /**
     * Create playback controls UI for a tablature element
     * @param {Element} container - Container to attach controls to
     * @param {Array} rhythmData - Rhythm data from tablature
     */
    function createPlaybackControls(container, rhythmData, tieData) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'rhythm-playback-controls';
        controlsDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
            margin-top: 10px;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        // Create one progress bar overlay per rendered tablature SVG section.
        const tabSvgs = Array.from(container.querySelectorAll('svg'));
        const progressBars = [];

        container.style.position = 'relative';

        tabSvgs.forEach((svg, sectionIndex) => {
            const svgParent = svg.parentElement;
            if (!svgParent) return;

            svgParent.style.position = 'relative';

            const progressBar = document.createElement('div');
            progressBar.className = 'playback-progress-bar';
            progressBar.setAttribute('data-section-index', String(sectionIndex));

            const svgHeight = svg.getAttribute('height') || svg.getBoundingClientRect().height || 200;
            progressBar.style.cssText = `
                position: absolute;
                top: ${svg.offsetTop}px;
                left: 0;
                width: 4px;
                height: ${svgHeight}px;
                background: rgba(255, 0, 0, 0.8);
                pointer-events: none;
                display: none;
                z-index: 1000;
                box-shadow: 0 0 10px rgba(255, 0, 0, 0.6);
                border-radius: 2px;
                transform: translateX(0px);
                will-change: transform;
            `;

            svgParent.insertBefore(progressBar, svg);
            progressBars.push(progressBar);
        });

        function refreshProgressBarLayout() {
            tabSvgs.forEach((svg, idx) => {
                const bar = progressBars[idx];
                if (!bar) return;
                const svgHeight = svg.getAttribute('height') || svg.getBoundingClientRect().height || 200;
                bar.style.top = `${svg.offsetTop}px`;
                bar.style.height = `${svgHeight}px`;
            });
        }

        function hideAllProgressBars() {
            progressBars.forEach(bar => {
                bar.style.display = 'none';
            });
        }

        function showProgressBarAt(sectionIndex, xPosition) {
            progressBars.forEach((bar, idx) => {
                if (idx === sectionIndex) {
                    bar.style.display = 'block';
                    bar.style.transform = `translateX(${xPosition}px)`;
                } else {
                    bar.style.display = 'none';
                }
            });
        }

        // Play Button
        const playButton = document.createElement('button');
        playButton.className = 'play-button';
        playButton.textContent = '▶ Play';
        playButton.style.cssText = `
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        playButton.onmouseover = () => playButton.style.background = '#45a049';
        playButton.onmouseout = () => playButton.style.background = '#4CAF50';

        // Stop Button
        const stopButton = document.createElement('button');
        stopButton.className = 'stop-button';
        stopButton.textContent = '■ Stop';
        stopButton.style.cssText = `
            padding: 8px 16px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: background 0.2s;
            display: none;
            align-items: center;
            justify-content: center;
        `;
        stopButton.onmouseover = () => stopButton.style.background = '#da190b';
        stopButton.onmouseout = () => stopButton.style.background = '#f44336';

        // Loop Checkbox
        const loopLabel = document.createElement('label');
        loopLabel.style.cssText = 'display: flex; align-items: center; gap: 5px; cursor: pointer;';
        loopLabel.innerHTML = `
            <input type="checkbox" class="loop-checkbox" style="cursor: pointer;">
            <span style="font-weight: 600;">Loop</span>
        `;

        // Count-in Checkbox
        const countInLabel = document.createElement('label');
        countInLabel.style.cssText = 'display: flex; align-items: center; gap: 5px; cursor: pointer;';
        countInLabel.innerHTML = `
            <input type="checkbox" class="countin-checkbox" checked style="cursor: pointer;">
            <span style="font-weight: 600;">Count-in</span>
        `;

        // Once Checkbox (only shows when both Loop and Count-in are checked)
        const onceLabel = document.createElement('label');
        onceLabel.style.cssText = 'display: none; align-items: center; gap: 5px; cursor: pointer;';
        onceLabel.innerHTML = `
            <input type="checkbox" class="once-checkbox" style="cursor: pointer;">
            <span style="font-weight: 600;">Once</span>
        `;

        // Show/hide "Once" checkbox based on Loop and Count-in states
        const updateOnceVisibility = () => {
            const loopCheckbox = loopLabel.querySelector('.loop-checkbox');
            const countInCheckbox = countInLabel.querySelector('.countin-checkbox');
            if (loopCheckbox.checked && countInCheckbox.checked) {
                onceLabel.style.display = 'flex';
            } else {
                onceLabel.style.display = 'none';
                // Uncheck "Once" when hiding it
                const onceCheckbox = onceLabel.querySelector('.once-checkbox');
                onceCheckbox.checked = false;
            }
        };

        // Status display
        const statusSpan = document.createElement('span');
        statusSpan.className = 'playback-status';
        statusSpan.style.cssText = 'color: #666; font-style: italic;';

        controlsDiv.appendChild(playButton);
        controlsDiv.appendChild(stopButton);
        controlsDiv.appendChild(loopLabel);
        controlsDiv.appendChild(countInLabel);
        controlsDiv.appendChild(onceLabel);
        controlsDiv.appendChild(statusSpan);

        // Add event listeners to update "Once" visibility
        const loopCheckbox = loopLabel.querySelector('.loop-checkbox');
        const countInCheckbox = countInLabel.querySelector('.countin-checkbox');
        loopCheckbox.addEventListener('change', updateOnceVisibility);
        countInCheckbox.addEventListener('change', updateOnceVisibility);

        let currentPlayback = null;
        let progressBarAnimationFrame = null;

        // Play button handler
        playButton.addEventListener('click', () => {
            const loopCheckbox = loopLabel.querySelector('.loop-checkbox');
            const countInCheckbox = countInLabel.querySelector('.countin-checkbox');
            const onceCheckbox = onceLabel.querySelector('.once-checkbox');
            const bpm = globalBPM;
            const loop = loopCheckbox.checked;
            const countIn = countInCheckbox.checked;
            const countInOnce = onceCheckbox.checked;

            // Parse rhythm sequence
            const rhythmSequence = parseRhythmSequence(rhythmData, tieData);
            const timeSignature = container._timeSignature || globalTimeSignature || DEFAULT_TIME_SIGNATURE;
            const beatsPerBar = getBeatsPerBar(timeSignature);

            if (rhythmSequence.length === 0) {
                statusSpan.textContent = 'No rhythm data to play';
                return;
            }

            // Validate rhythm sequence
            const validation = validateRhythmSequence(rhythmSequence, rhythmData, timeSignature);
            if (!validation.isValid) {
                const barErrors = validation.errors.map(err => {
                    const sign = err.difference > 0 ? '+' : '';
                    return `Bar ${err.barIndex + 1}: ${sign}${err.difference.toFixed(2)} beats`;
                }).join(', ');

                statusSpan.textContent = `Cannot play: Invalid rhythm (${barErrors})`;
                statusSpan.style.color = 'red';

                // Reset color after 5 seconds
                setTimeout(() => {
                    statusSpan.style.color = '#666';
                    statusSpan.textContent = '';
                }, 5000);

                return;
            }

            // Show stop button, hide play button
            playButton.style.display = 'none';
            stopButton.style.display = 'flex';
            statusSpan.textContent = loop ? 'Playing (looping)...' : 'Playing...';
            statusSpan.style.color = '#666';

            // Start playback
            currentPlayback = playRhythmSequence(
                rhythmSequence,
                bpm,
                loop,
                countIn,
                countInOnce,
                () => {
                    // On stop
                    playButton.style.display = 'flex';
                    stopButton.style.display = 'none';
                    statusSpan.textContent = '';
                    if (progressBarAnimationFrame) {
                        cancelAnimationFrame(progressBarAnimationFrame);
                        progressBarAnimationFrame = null;
                    }
                    hideAllProgressBars();
                    currentPlayback = null;
                },
                null,
                timeSignature
            );

            // Show progress bar AFTER playback is started
            if (progressBars.length > 0 && tabSvgs.length > 0 && currentPlayback) {
                refreshProgressBarLayout();

                // Build position map from explicit per-note playback anchors.
                const positionMap = [];
                let cumulativeBeats = 0;
                let playbackAnchorIndex = 0;

                const playbackAnchors = tabSvgs.flatMap((svg, sectionIndex) => {
                    return Array.from(svg.querySelectorAll('.playback-anchor'))
                        .map(elem => ({
                            xPosition: parseFloat(elem.getAttribute('data-x')),
                            sectionIndex: sectionIndex
                        }))
                        .filter(item => !isNaN(item.xPosition));
                });
                let playbackPositions = playbackAnchors;

                const nonPauseCount = rhythmSequence.filter(note => !note.isPause).length;

                // Fallback for robustness: if anchors are missing/mismatched, derive positions
                // from rendered rhythm stems/rests or note-content centers.
                if (playbackPositions.length !== nonPauseCount) {
                    const rhythmPositions = tabSvgs.flatMap((svg, sectionIndex) => {
                        return Array.from(svg.querySelectorAll('.rhythm-stem, .rhythm-rest'))
                            .map(elem => parseFloat(elem.getAttribute('data-x')))
                            .filter(x => !isNaN(x))
                            .map(x => ({ xPosition: x + 10, sectionIndex })); // convert stored left-x to visual center
                    });

                    const contentPositions = tabSvgs.flatMap((svg, sectionIndex) => {
                        return Array.from(svg.querySelectorAll('.tab-content[data-playback-note="1"]'))
                            .map(elem => parseFloat(elem.getAttribute('x')))
                            .filter(x => !isNaN(x))
                            .map(x => ({ xPosition: x, sectionIndex }));
                    });

                    if (rhythmPositions.length === nonPauseCount) {
                        playbackPositions = rhythmPositions;
                    } else if (contentPositions.length === nonPauseCount) {
                        playbackPositions = contentPositions;
                    } else if (rhythmPositions.length > 0) {
                        playbackPositions = rhythmPositions;
                    } else if (contentPositions.length > 0) {
                        playbackPositions = contentPositions;
                    }
                }

                rhythmSequence.forEach((note, index) => {
                    let xPosition = null;
                    let sectionIndex = null;

                    // Only map position for non-pause notes.
                    if (!note.isPause && playbackPositions.length > 0) {
                        if (typeof playbackPositions[playbackAnchorIndex] !== 'undefined') {
                            xPosition = playbackPositions[playbackAnchorIndex].xPosition;
                            sectionIndex = playbackPositions[playbackAnchorIndex].sectionIndex;
                            playbackAnchorIndex++;
                        }
                    }

                    // Add to position map (including pauses, they just won't have x position yet)
                    positionMap.push({
                        beatTime: cumulativeBeats,
                        xPosition: xPosition,
                        sectionIndex: sectionIndex,
                        duration: note.duration,
                        symbol: note.symbol,
                        isPause: note.isPause
                    });

                    cumulativeBeats += note.duration;
                });

                // Fill in missing positions for pauses by interpolating from surrounding notes
                for (let i = 0; i < positionMap.length; i++) {
                    if (positionMap[i].xPosition === null) {
                        // Find previous and next non-null positions
                        let prevPos = null, nextPos = null;

                        for (let j = i - 1; j >= 0; j--) {
                            if (positionMap[j].xPosition !== null) {
                                prevPos = positionMap[j];
                                break;
                            }
                        }

                        for (let j = i + 1; j < positionMap.length; j++) {
                            if (positionMap[j].xPosition !== null) {
                                nextPos = positionMap[j];
                                break;
                            }
                        }

                        // Interpolate position
                        if (prevPos && nextPos) {
                            if (prevPos.sectionIndex === nextPos.sectionIndex) {
                                const beatRange = nextPos.beatTime - prevPos.beatTime;
                                const beatOffset = positionMap[i].beatTime - prevPos.beatTime;
                                const progress = beatOffset / beatRange;
                                positionMap[i].xPosition = prevPos.xPosition + (nextPos.xPosition - prevPos.xPosition) * progress;
                                positionMap[i].sectionIndex = prevPos.sectionIndex;
                            } else {
                                // Crossing sections: hold the previous section and jump on the next note.
                                positionMap[i].xPosition = prevPos.xPosition;
                                positionMap[i].sectionIndex = prevPos.sectionIndex;
                            }
                        } else if (prevPos) {
                            positionMap[i].xPosition = prevPos.xPosition;
                            positionMap[i].sectionIndex = prevPos.sectionIndex;
                        } else if (nextPos) {
                            positionMap[i].xPosition = nextPos.xPosition;
                            positionMap[i].sectionIndex = nextPos.sectionIndex;
                        } else {
                            positionMap[i].xPosition = 70; // Fallback
                            positionMap[i].sectionIndex = 0;
                        }
                    }
                }

                // Precompute the visual hold position for each event.
                // During pauses we keep the bar on the latest previous note position.
                let lastNoteX = 0;
                let lastSectionIndex = 0;
                for (let i = 0; i < positionMap.length; i++) {
                    if (!positionMap[i].isPause) {
                        lastNoteX = positionMap[i].xPosition;
                        lastSectionIndex = positionMap[i].sectionIndex;
                    }
                    positionMap[i].displayX = positionMap[i].isPause ? lastNoteX : positionMap[i].xPosition;
                    positionMap[i].displaySectionIndex = positionMap[i].isPause ? lastSectionIndex : positionMap[i].sectionIndex;
                }

                const totalBeats = getTotalBeats(rhythmSequence);
                let positionCursor = 0;
                let lastNormalizedBeat = 0;

                // Animation loop to update progress bar position
                const updateProgressBar = () => {
                    if (!currentPlayback) {
                        hideAllProgressBars();
                        return;
                    }

                    const ctx = audioContext;
                    if (ctx && currentPlayback.startTime !== undefined) {
                        const currentTime = ctx.currentTime;
                        const elapsed = (currentTime - currentPlayback.startTime) + VISUAL_LEAD_SECONDS;

                        // Don't show progress until playback actually starts (during initial count-in)
                        if (elapsed < 0) {
                            hideAllProgressBars();
                            progressBarAnimationFrame = requestAnimationFrame(updateProgressBar);
                            return;
                        }

                        // Calculate current beat position
                        const secondsPerBeat = 60 / bpm;
                        const boundarySnapBeats = BOUNDARY_SNAP_SECONDS / secondsPerBeat;
                        const currentBeat = elapsed / secondsPerBeat;

                        // Account for count-in during loops (4 beats count-in)
                        const countInBeats = countIn ? beatsPerBar : 0;
                        const countInDuration = countInBeats * secondsPerBeat;
                        const rhythmDuration = totalBeats * secondsPerBeat;
                        const loopDuration = rhythmDuration + countInDuration;

                        // For non-looping playback, hide the bar once we've exceeded the duration
                        // This prevents the bar from jumping back to the first note due to modulo wrap-around
                        if (!loop && elapsed >= rhythmDuration) {
                            hideAllProgressBars();
                            progressBarAnimationFrame = requestAnimationFrame(updateProgressBar);
                            return;
                        }

                        // Check if we're in a count-in period during a loop
                        // The first iteration doesn't have a count-in in elapsed time (it was before startTime),
                        // but subsequent iterations do: [Rhythm1][CountIn2][Rhythm2][CountIn3]... (unless countInOnce is true)
                        let normalizedBeat;

                        if (loop && countIn && !countInOnce && elapsed >= rhythmDuration) {
                            // We're past the first iteration, and count-in happens before each loop
                            const elapsedAfterFirst = elapsed - rhythmDuration;
                            const positionInLoop = elapsedAfterFirst % loopDuration;
                            const numCompleteCycles = Math.floor(elapsedAfterFirst / loopDuration);

                            if (positionInLoop < countInDuration) {
                                // We're in a count-in period - hide the progress bar
                                hideAllProgressBars();
                                progressBarAnimationFrame = requestAnimationFrame(updateProgressBar);
                                return;
                            }

                            // Calculate beat position, excluding count-in beats from the total
                            // We've had (numCompleteCycles + 1) count-ins since the first rhythm ended
                            const countInBeatsElapsed = (numCompleteCycles + 1) * countInBeats;
                            const totalBeatsIncludingCountIns = elapsed / secondsPerBeat;
                            const adjustedBeat = totalBeatsIncludingCountIns - countInBeatsElapsed;
                            normalizedBeat = adjustedBeat % totalBeats;
                        } else {
                            // First iteration, no looping, or countInOnce mode (no count-ins between loops)
                            // In countInOnce mode: [Rhythm1][Rhythm2][Rhythm3]... (simple loop without count-ins)
                            normalizedBeat = currentBeat % totalBeats;
                        }

                        // Cursor-based lookup keeps frame work constant even at high BPM.
                        if (normalizedBeat < lastNormalizedBeat) {
                            // Loop wrap-around
                            positionCursor = 0;
                        }

                        while (
                            positionCursor < positionMap.length - 1 &&
                            (normalizedBeat + boundarySnapBeats) >= (positionMap[positionCursor].beatTime + positionMap[positionCursor].duration)
                        ) {
                            positionCursor++;
                        }

                        const xPosition = positionMap[positionCursor].displayX;
                        const sectionIndex = positionMap[positionCursor].displaySectionIndex || 0;
                        lastNormalizedBeat = normalizedBeat;

                        showProgressBarAt(sectionIndex, xPosition);
                    }

                    progressBarAnimationFrame = requestAnimationFrame(updateProgressBar);
                };
                updateProgressBar();
            }
        });

        // Stop button handler
        stopButton.addEventListener('click', () => {
            if (currentPlayback) {
                currentPlayback.stop();
            }
            if (progressBarAnimationFrame) {
                cancelAnimationFrame(progressBarAnimationFrame);
                progressBarAnimationFrame = null;
            }
            hideAllProgressBars();
            playButton.style.display = 'flex';
            stopButton.style.display = 'none';
            statusSpan.textContent = '';
            currentPlayback = null;
        });

        container.appendChild(controlsDiv);
    }

    /**
     * Initialize playback controls for all tablature elements on the page
     * This should be called after tablature rendering
     */
    function initializePlaybackControls() {
        // Find all tablature containers
        const tablatures = document.querySelectorAll('.tablature-container');

        tablatures.forEach(tabContainer => {
            // Check if controls already exist
            if (tabContainer.querySelector('.rhythm-playback-controls')) {
                return;
            }

            // Try to get rhythm data from the tablature
            // The data should be stored as a data attribute by tabulature.js
            const rhythmDataStr = tabContainer.getAttribute('data-rhythm-sequence');
            if (rhythmDataStr) {
                try {
                    const parsed = JSON.parse(rhythmDataStr);
                    const rhythmData = Array.isArray(parsed) ? parsed : (parsed.rhythms || []);
                    const tieData = Array.isArray(parsed) ? [] : (parsed.ties || []);
                    const parsedTimeSignature = Array.isArray(parsed)
                        ? DEFAULT_TIME_SIGNATURE
                        : (parsed.timeSignature || DEFAULT_TIME_SIGNATURE);

                    tabContainer._timeSignature = parsedTimeSignature;
                    createPlaybackControls(tabContainer, rhythmData, tieData);
                } catch (e) {
                    console.error('Failed to parse rhythm data:', e);
                }
            }
        });
    }

    // Export functions to global scope
    window.RhythmPlayback = {
        initializePlaybackControls,
        createPlaybackControls,
        playRhythmSequence,
        initAudioContext
    };

    /**
     * Standalone metronome for the navigation menu
     */
    let standaloneMetronome = null;

    function initStandaloneMetronome() {
        const startBtn = document.getElementById('metronome-start');
        const stopBtn = document.getElementById('metronome-stop');
        const bpmInput = document.getElementById('metronome-bpm');
        const timeSignatureSelect = document.getElementById('metronome-time-signature');

        if (!startBtn || !stopBtn || !bpmInput) return;

        // Sync with global values
        bpmInput.value = globalBPM;
        if (timeSignatureSelect) {
            timeSignatureSelect.value = globalTimeSignature.label || DEFAULT_TIME_SIGNATURE.label;
        }

        // Listen for BPM changes and sync
        bpmInput.addEventListener('input', (e) => {
            globalBPM = parseInt(e.target.value) || DEFAULT_BPM;
            document.querySelectorAll('.bpm-input').forEach(input => {
                input.value = globalBPM;
            });
        });

        if (timeSignatureSelect) {
            timeSignatureSelect.addEventListener('change', (e) => {
                globalTimeSignature = parseTimeSignature(e.target.value);
            });
        }

        startBtn.addEventListener('click', () => {
            const ctx = initAudioContext();
            if (!ctx) return;

            const bpm = parseInt(bpmInput.value) || DEFAULT_BPM;
            const secondsPerBeat = 60 / bpm;
            const beatsPerBar = getBeatsPerBar(globalTimeSignature);

            let isRunning = true;
            let beatCount = 0;
            let schedulerInterval = null;
            let nextBeatTime = ctx.currentTime + 0.1; // Start 100ms in future for immediate response
            let scheduledNodes = [];

            function scheduleMetronome() {
                if (!isRunning) return;

                const lookAhead = 0.5;
                while (nextBeatTime < ctx.currentTime + lookAhead) {
                    const isStrongBeat = (beatCount % beatsPerBar === 0);

                    // Schedule metronome click and track nodes
                    const clickTime = nextBeatTime;

                    // Create and schedule the click
                    const bufferSize = ctx.sampleRate * 0.03;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }

                    const noise = ctx.createBufferSource();
                    noise.buffer = buffer;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.value = isStrongBeat ? 2500 : 1500;
                    filter.Q.value = 1;
                    const gainNode = ctx.createGain();
                    const volume = isStrongBeat ? 0.7 : 0.2;
                    gainNode.gain.setValueAtTime(0, clickTime);
                    gainNode.gain.linearRampToValueAtTime(volume, clickTime + 0.001);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, clickTime + 0.03);
                    noise.connect(filter);
                    filter.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    noise.start(clickTime);
                    noise.stop(clickTime + 0.03);
                    scheduledNodes.push(noise);

                    // Add low frequency thump for strong beat
                    if (isStrongBeat) {
                        const lowOsc = ctx.createOscillator();
                        const lowGain = ctx.createGain();
                        lowOsc.frequency.value = 100;
                        lowOsc.type = 'sine';
                        lowGain.gain.setValueAtTime(0, clickTime);
                        lowGain.gain.linearRampToValueAtTime(0.3, clickTime + 0.002);
                        lowGain.gain.exponentialRampToValueAtTime(0.01, clickTime + 0.05);
                        lowOsc.connect(lowGain);
                        lowGain.connect(ctx.destination);
                        lowOsc.start(clickTime);
                        lowOsc.stop(clickTime + 0.05);
                        scheduledNodes.push(lowOsc);
                    }

                    nextBeatTime += secondsPerBeat;
                    beatCount++;
                }
            }

            schedulerInterval = setInterval(scheduleMetronome, 100);
            scheduleMetronome(); // Start immediately

            standaloneMetronome = {
                stop: () => {
                    isRunning = false;
                    if (schedulerInterval) {
                        clearInterval(schedulerInterval);
                    }
                    // Stop all scheduled nodes
                    scheduledNodes.forEach(node => {
                        try {
                            if (node.stop) node.stop();
                        } catch (e) {
                            // Node may have already finished
                        }
                    });
                    scheduledNodes.length = 0;
                }
            };

            startBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
        });

        stopBtn.addEventListener('click', () => {
            if (standaloneMetronome) {
                standaloneMetronome.stop();
                standaloneMetronome = null;
            }
            startBtn.style.display = 'flex';
            stopBtn.style.display = 'none';
        });

        // Tap Tempo functionality
        const tapBtn = document.getElementById('tap-tempo');
        if (tapBtn) {
            let tapTimes = [];
            let tapTimeout = null;
            const maxTaps = 4; // Use last 4 taps for averaging
            const resetDelay = 2000; // Reset after 2 seconds of no tapping

            tapBtn.addEventListener('click', () => {
                const now = Date.now();
                tapTimes.push(now);

                // Clear existing timeout
                if (tapTimeout) {
                    clearTimeout(tapTimeout);
                }

                // Reset taps after inactivity
                tapTimeout = setTimeout(() => {
                    tapTimes = [];
                    tapBtn.style.background = '#2196F3';
                }, resetDelay);

                // Keep only the last maxTaps
                if (tapTimes.length > maxTaps) {
                    tapTimes.shift();
                }

                // Calculate BPM if we have at least 2 taps
                if (tapTimes.length >= 2) {
                    // Calculate intervals between consecutive taps
                    const intervals = [];
                    for (let i = 1; i < tapTimes.length; i++) {
                        intervals.push(tapTimes[i] - tapTimes[i - 1]);
                    }

                    // Average the intervals
                    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

                    // Convert to BPM (60000 ms per minute)
                    const bpm = Math.round(60000 / avgInterval);

                    // Clamp to valid range
                    const clampedBPM = Math.max(40, Math.min(240, bpm));

                    // Update BPM input and sync
                    bpmInput.value = clampedBPM;
                    globalBPM = clampedBPM;
                    document.querySelectorAll('.bpm-input').forEach(input => {
                        input.value = clampedBPM;
                    });

                    // Visual feedback
                    tapBtn.style.background = '#1976D2';
                    setTimeout(() => {
                        tapBtn.style.background = '#2196F3';
                    }, 100);
                }
            });
        }
    }

    // Auto-initialize on page load and when content changes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializePlaybackControls();
            initStandaloneMetronome();
            initRootNoteSync();
        });
    } else {
        initializePlaybackControls();
        initStandaloneMetronome();
        initRootNoteSync();
    }

    /**
     * Sync root note selector with global key for playback
     */
    function initRootNoteSync() {
        const rootNoteSelect = document.getElementById('root-note-select');
        if (rootNoteSelect) {
            // Set initial key from root note selector
            const initialKey = ROOT_NOTE_TO_KEY[rootNoteSelect.value];
            if (initialKey) {
                globalKey = initialKey;
                currentNoteFrequency = KEY_FREQUENCIES[initialKey];
            }

            // Listen for changes
            rootNoteSelect.addEventListener('change', (e) => {
                const key = ROOT_NOTE_TO_KEY[e.target.value];
                if (key) {
                    globalKey = key;
                    currentNoteFrequency = KEY_FREQUENCIES[key];
                }
            });
        }
    }

    // Also watch for dynamic content changes (when markdown is loaded)
    // Debounced and filtered to avoid expensive rescans on unrelated DOM churn
    // (for example typing in the tab builder grid).
    let playbackInitDebounce = null;

    function schedulePlaybackInit() {
        if (playbackInitDebounce) {
            clearTimeout(playbackInitDebounce);
        }
        playbackInitDebounce = setTimeout(() => {
            initializePlaybackControls();
        }, 80);
    }

    function mutationNeedsPlaybackInit(mutations) {
        for (const mutation of mutations) {
            if (mutation.type !== 'childList') continue;

            const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
            for (const node of changedNodes) {
                if (!node || node.nodeType !== 1) continue;
                const el = node;

                // Ignore tab builder grid churn; it explicitly initializes playback for preview rebuilds.
                if (el.closest && el.closest('.tab-builder-view')) {
                    continue;
                }

                if (
                    (el.matches && el.matches('.tablature-container, .md-content, pre > code.language-tabulature')) ||
                    (el.querySelector && el.querySelector('.tablature-container, .md-content, pre > code.language-tabulature'))
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    const observer = new MutationObserver((mutations) => {
        if (!mutationNeedsPlaybackInit(mutations)) return;
        schedulePlaybackInit();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
