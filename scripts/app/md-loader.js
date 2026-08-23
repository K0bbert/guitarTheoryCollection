// md-loader.js
// Responsible for loading markdown files referenced by elements with
// a `data-md` attribute and invoking per-page initializers.

(function () {
    'use strict';

    const inFlightLoads = new WeakMap();
    const BACKGROUND_LOAD_START_DELAY_MS = 1400;
    const MENU_OPEN_RETRY_DELAY_MS = 260;
    const INTERACTION_RETRY_DELAY_MS = 180;
    const INTERACTION_IDLE_WINDOW_MS = 650;
    let lastUserInteractionTs = Date.now();

    function getFileName(path) {
        if (!path) return '';
        const normalized = String(path).replace(/\\/g, '/');
        const idx = normalized.lastIndexOf('/');
        return idx >= 0 ? normalized.slice(idx + 1) : normalized;
    }

    function markInteraction() {
        lastUserInteractionTs = Date.now();
    }

    function ensureTabBuilderMounted(node, path) {
        const fileName = getFileName(path);
        if (fileName !== 'tab-builder.md' || typeof window.initTabBuilderView !== 'function') {
            return;
        }

        const mount = node.querySelector('#tab-builder-mount');
        const isReady = !!(mount && mount.dataset && mount.dataset.tabBuilderReady === '1');
        if (!isReady) {
            try { window.initTabBuilderView(node); } catch (e) { console.error(e); }
        }
    }

    function toHtml(text) {
        if (window.marked) return marked.parse(text);
        return '<p>' + text.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>') + '</p>';
    }

    async function loadMarkdownNode(node, path) {
        if (!node || !path) return false;
        if (node.dataset.mdLoaded === '1') return true;

        const existingPromise = inFlightLoads.get(node);
        if (existingPromise) {
            await existingPromise;
            return node.dataset.mdLoaded === '1';
        }

        const loadPromise = (async () => {
            try {
                const resp = await fetch(path);
                if (!resp.ok) return;
                const text = await resp.text();
                node.innerHTML = toHtml(text);
                node.dataset.mdLoaded = '1';
            } catch (e) {
                console.warn('Failed to load markdown', path, e);
            }
        })();

        inFlightLoads.set(node, loadPromise);
        await loadPromise;
        inFlightLoads.delete(node);
        return node.dataset.mdLoaded === '1';
    }

    function initializeMarkdownNode(node, path) {
        if (!node || node.dataset.mdInitialized === '1') return;
        const fileName = getFileName(path);

        if (window.initFretboardEmbeds) {
            try { window.initFretboardEmbeds(node); } catch (e) { console.error(e); }
        }
        if (window.initFretboardGrids) {
            try { window.initFretboardGrids(node); } catch (e) { console.error(e); }
        }

        if (window.ModeTransformer && fileName === 'modes.md') {
            try {
                setTimeout(() => {
                    const gridId = 'church-modes-grid-2';
                    const gridContainer = document.getElementById(gridId);
                    if (gridContainer && window.fretboardGridConfigs && window.fretboardGridConfigs[gridId]) {
                        window.ModeTransformer.addModeSelector(gridId, window.fretboardGridConfigs[gridId]);
                    }
                }, 100);
            } catch (e) { console.error('Mode transformer initialization failed:', e); }
        }

        if (window.HarmonicMinorModeTransformer && fileName === 'harmonic-minor-modes.md') {
            try {
                setTimeout(() => {
                    const gridId = 'harmonic-minor-modes-grid-2';
                    const gridContainer = document.getElementById(gridId);
                    if (gridContainer && window.fretboardGridConfigs && window.fretboardGridConfigs[gridId]) {
                        window.HarmonicMinorModeTransformer.addHarmonicMinorModeSelector(gridId, window.fretboardGridConfigs[gridId]);
                    }
                }, 100);
            } catch (e) { console.error('Harmonic minor mode transformer initialization failed:', e); }
        }

        if (window.initTabulatureEmbeds) {
            try { window.initTabulatureEmbeds(node); } catch (e) { console.error(e); }
        }
        if (window.initGlobalControls) {
            try { window.initGlobalControls(); } catch (e) { /* ignore */ }
        }
        if (window.initKeyChordMapView) {
            try { window.initKeyChordMapView(); } catch (e) { console.error(e); }
        }
        if (window.initTabBuilderView && fileName === 'tab-builder.md') {
            try { window.initTabBuilderView(node); } catch (e) { console.error(e); }
        }

        ensureTabBuilderMounted(node, path);

        node.dataset.mdInitialized = '1';
    }

    async function ensureNodeReady(node, path, initializeNow) {
        const loaded = await loadMarkdownNode(node, path);
        if (!loaded) return false;
        if (initializeNow) {
            initializeMarkdownNode(node, path);
        }
        return true;
    }

    function scheduleBackgroundLoads(entries) {
        let index = 0;

        function runNext() {
            if (index >= entries.length) return;

            const timeSinceInteraction = Date.now() - lastUserInteractionTs;
            if (timeSinceInteraction < INTERACTION_IDLE_WINDOW_MS) {
                setTimeout(() => {
                    scheduleIdle(runNext);
                }, INTERACTION_RETRY_DELAY_MS);
                return;
            }

            const burgerNav = document.getElementById('burger-nav');
            const burgerOverlay = document.getElementById('burger-overlay');
            if (
                (burgerNav && burgerNav.classList.contains('open')) ||
                (burgerOverlay && burgerOverlay.classList.contains('open'))
            ) {
                setTimeout(() => {
                    scheduleIdle(runNext);
                }, MENU_OPEN_RETRY_DELAY_MS);
                return;
            }

            const entry = entries[index++];
            // Initialize in idle time as well so pages are fully rendered when opened.
            ensureNodeReady(entry.node, entry.path, true).finally(() => {
                scheduleIdle(runNext);
            });
        }

        setTimeout(() => {
            scheduleIdle(runNext);
        }, BACKGROUND_LOAD_START_DELAY_MS);
    }

    function scheduleIdle(callback) {
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(callback, { timeout: 300 });
            return;
        }
        setTimeout(callback, 40);
    }

    document.addEventListener('md-content:show', async (event) => {
        const detail = event.detail || {};
        const node = detail.node;
        const path = detail.path;
        if (!node || !path) return;

        if (node.dataset.mdLoaded !== '1') {
            node.innerHTML = '<p>Loading...</p>';
        }

        const ok = await ensureNodeReady(node, path, true);
        ensureTabBuilderMounted(node, path);
        if (!ok && node.dataset.mdLoaded !== '1') {
            node.innerHTML = '<p>Failed to load content.</p>';
        }
    });

    document.addEventListener('DOMContentLoaded', async () => {
        window.addEventListener('pointerdown', markInteraction, { passive: true });
        window.addEventListener('touchstart', markInteraction, { passive: true });
        window.addEventListener('keydown', markInteraction, { passive: true });
        window.addEventListener('scroll', markInteraction, { passive: true });

        if (typeof fetch === 'undefined') return;
        const nodes = Array.from(document.querySelectorAll('[data-md]'));
        if (nodes.length === 0) return;

        const entries = nodes
            .map((node) => ({ node, path: node.getAttribute('data-md') }))
            .filter((entry) => !!entry.path);

        entries.forEach((entry) => {
            if (getFileName(entry.path) !== 'header.md') {
                entry.node.style.display = 'none';
            }
        });

        const homeEntry = entries.find((entry) => getFileName(entry.path) === 'header.md') || entries[0];
        homeEntry.node.style.display = 'block';

        await ensureNodeReady(homeEntry.node, homeEntry.path, true);

        const backgroundEntries = entries.filter((entry) => entry !== homeEntry);
        scheduleBackgroundLoads(backgroundEntries);
    });
})();
