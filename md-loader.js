// md-loader.js
// Responsible for loading markdown files referenced by elements with
// a `data-md` attribute and invoking the fretboard embed initializer.

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof fetch === 'undefined') return;
    const nodes = document.querySelectorAll('[data-md]');
    if (!nodes || nodes.length === 0) return;

    for (const node of nodes) {
        const path = node.getAttribute('data-md');
        if (!path) continue;
        try {
            const resp = await fetch(path);
            if (!resp.ok) continue;
            const text = await resp.text();
            let html = '';
            if (window.marked) html = marked.parse(text);
            else html = '<p>' + text.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>') + '</p>';
            node.innerHTML = html;
            node.style.display = '';
            // initialize any embedded fretboards within this node
            if (window.initFretboardEmbeds) {
                try { window.initFretboardEmbeds(node); } catch (e) { console.error(e); }
            }
            // initialize any fretboard grids that may have been injected
            if (window.initFretboardGrids) {
                try { window.initFretboardGrids(node); } catch (e) { console.error(e); }
            }
            // initialize any tabulature blocks that may have been injected
            if (window.initTabulatureEmbeds) {
                try { window.initTabulatureEmbeds(node); } catch (e) { console.error(e); }
            }
            // wire global controls after injecting markdown (safe no-op if already bound)
            if (window.initGlobalControls) {
                try { window.initGlobalControls(); } catch (e) { /* ignore */ }
            }
        } catch (e) {
            console.warn('Failed to load markdown', path, e);
        }
    }
});
