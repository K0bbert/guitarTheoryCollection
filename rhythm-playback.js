/* rhythm-playback.js
   Provides rhythm playback functionality with metronome for guitar tablature.
   Uses Web Audio API to generate beeps/clicks for both metronome and note playback.
*/
(function () {
    'use strict';

    // Audio context (initialized on first user interaction)
    let audioContext = null;

    // Default BPM
    const DEFAULT_BPM = 120;

    // Audio frequencies
    const FREQUENCIES = {
        metronomeStrong: 1200,  // First beat of bar (Hz)
        metronomeWeak: 800,     // Other beats (Hz)
        note: 600,              // Note playback (Hz)
        rest: 400               // Rest (optional, lower tone)
    };

    // Audio durations (in seconds)
    const DURATIONS = {
        metronomeClick: 0.05,   // Short click
        noteBeep: 0.1           // Slightly longer beep for notes
    };

    /**
     * Initialize the Audio Context (must be called after user interaction)
     */
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    /**
     * Play a metronome click sound using noise for a realistic click
     * @param {boolean} isStrong - Whether this is a strong beat (first of bar)
     * @param {number} time - When to play (in audioContext time)
     */
    function playMetronomeClick(isStrong, time) {
        if (!audioContext) return;

        // Create noise buffer for click sound
        const bufferSize = audioContext.sampleRate * 0.03; // 30ms of noise
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Fill with white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // Create buffer source
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;

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

    /**
     * Parse rhythm sequence from a tablature's rhythm data
     * Expected format: array of {symbol, isPause} objects
     */
    function parseRhythmSequence(rhythmData) {
        if (!rhythmData || !Array.isArray(rhythmData)) return [];

        return rhythmData.map(item => ({
            symbol: item.symbol,
            duration: getRhythmDuration(item.symbol),
            isPause: item.isPause || false
        }));
    }

    /**
     * Calculate total duration of rhythm sequence in beats
     */
    function getTotalBeats(rhythmSequence) {
        return rhythmSequence.reduce((sum, item) => sum + item.duration, 0);
    }

    /**
     * Play rhythm sequence with metronome
     * @param {Array} rhythmSequence - Array of {symbol, duration, isPause}
     * @param {number} bpm - Beats per minute
     * @param {Function} onStop - Callback when playback finishes
     * @param {Function} onBeat - Callback for each beat (for visual feedback)
     */
    function playRhythmSequence(rhythmSequence, bpm, onStop, onBeat) {
        const ctx = initAudioContext();
        if (!ctx) {
            console.error('Failed to initialize audio context');
            return null;
        }

        const beatsPerSecond = bpm / 60;
        const secondsPerBeat = 60 / bpm;

        let currentTime = ctx.currentTime + 0.1; // Small delay before starting
        let currentBeat = 0;

        const totalBeats = getTotalBeats(rhythmSequence);
        const totalDuration = totalBeats * secondsPerBeat;

        // Schedule metronome clicks for each quarter note beat
        const numMetronomeBeats = Math.ceil(totalBeats);
        for (let beat = 0; beat < numMetronomeBeats; beat++) {
            const beatTime = currentTime + (beat * secondsPerBeat);
            const isStrongBeat = (beat % 4 === 0); // First beat of each 4/4 bar

            playMetronomeClick(isStrongBeat, beatTime);
        }

        // Schedule note beeps based on rhythm
        rhythmSequence.forEach((item, index) => {
            const noteTime = currentTime + (currentBeat * secondsPerBeat);

            // Callback for visual feedback
            if (onBeat) {
                const delay = (noteTime - ctx.currentTime) * 1000;
                setTimeout(() => onBeat(index), delay);
            }

            // Play note beep (unless it's a rest/pause)
            if (!item.isPause) {
                playBeep(FREQUENCIES.note, DURATIONS.noteBeep, noteTime, 0.5);
            }

            currentBeat += item.duration;
        });

        // Schedule stop callback
        if (onStop) {
            const stopDelay = (totalDuration + 0.5) * 1000; // Add small buffer
            setTimeout(onStop, stopDelay);
        }

        return {
            stop: () => {
                // Can't really stop Web Audio scheduled sounds, but we can call the callback
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
    function createPlaybackControls(container, rhythmData) {
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

        // BPM Control
        const bpmLabel = document.createElement('label');
        bpmLabel.style.cssText = 'display: flex; align-items: center; gap: 5px;';
        bpmLabel.innerHTML = `
            <span style="font-weight: 600;">BPM:</span>
            <input type="number" class="bpm-input" value="${DEFAULT_BPM}" min="40" max="240" step="1"
                   style="width: 60px; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
        `;

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
        `;
        stopButton.onmouseover = () => stopButton.style.background = '#da190b';
        stopButton.onmouseout = () => stopButton.style.background = '#f44336';

        // Status display
        const statusSpan = document.createElement('span');
        statusSpan.className = 'playback-status';
        statusSpan.style.cssText = 'color: #666; font-style: italic;';

        controlsDiv.appendChild(bpmLabel);
        controlsDiv.appendChild(playButton);
        controlsDiv.appendChild(stopButton);
        controlsDiv.appendChild(statusSpan);

        let currentPlayback = null;

        // Play button handler
        playButton.addEventListener('click', () => {
            const bpmInput = bpmLabel.querySelector('.bpm-input');
            const bpm = parseInt(bpmInput.value) || DEFAULT_BPM;

            // Parse rhythm sequence
            const rhythmSequence = parseRhythmSequence(rhythmData);

            if (rhythmSequence.length === 0) {
                statusSpan.textContent = 'No rhythm data to play';
                return;
            }

            // Show stop button, hide play button
            playButton.style.display = 'none';
            stopButton.style.display = 'inline-block';
            statusSpan.textContent = 'Playing...';

            // Start playback
            currentPlayback = playRhythmSequence(
                rhythmSequence,
                bpm,
                () => {
                    // On stop
                    playButton.style.display = 'inline-block';
                    stopButton.style.display = 'none';
                    statusSpan.textContent = '';
                    currentPlayback = null;
                },
                (index) => {
                    // On each beat (for future visual feedback)
                    statusSpan.textContent = `Playing note ${index + 1} of ${rhythmSequence.length}...`;
                }
            );
        });

        // Stop button handler
        stopButton.addEventListener('click', () => {
            if (currentPlayback) {
                currentPlayback.stop();
            }
            playButton.style.display = 'inline-block';
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
                    const rhythmData = JSON.parse(rhythmDataStr);
                    createPlaybackControls(tabContainer, rhythmData);
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

    // Auto-initialize on page load and when content changes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePlaybackControls);
    } else {
        initializePlaybackControls();
    }

    // Also watch for dynamic content changes (when markdown is loaded)
    const observer = new MutationObserver(() => {
        initializePlaybackControls();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
