function setAttributes(elem, attrs) {
    for (var idx in attrs) {
        if ((idx === 'styles' || idx === 'style') && typeof attrs[idx] === 'object') {
            const styles = [];
            for (var prop in attrs[idx]) { styles.push(`${prop}: ${attrs[idx][prop]};`); }
            elem.setAttribute('style', styles.join(' '));
        } else if (idx === 'html') {
            elem.innerHTML = attrs[idx];
        } else {
            elem.setAttribute(idx, attrs[idx]);
        }
    }
}

function generateClassValue(elem, classes) {
    var classValues = elem.className.baseVal.split(" ");
    if ('type' in classes) {
        classValues[0] = classes.type;
    }
    if ('color' in classes) {
        classValues[1] = classes.color;
    }
    if ('visibility' in classes) {
        classValues[2] = classes.visibility;
    }
    return classValues.join(' ');
}

function createSvgElement(tag, attributes = null) {
    const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (typeof attributes === 'object') {
        setAttributes(elem, attributes);
    }
    return elem;
}


class Fretboard {
    constructor(opts) {
        this.svg = opts.svg;
        this.consts = {
            offsetX: 40,
            offsetY: 30,
            stringIntervals: [24, 19, 15, 10, 5, 0],
            markers: [3, 5, 7, 9, 12, 15, 17, 19, 21],
            fretWidth: 70,
            stringSpacing: 40,
            minStringSize: 0.2,
            circleRadius: 18,
            notes: [['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'],
                    ['E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb']],
            sign: ['♯', '♭'],
        };
        this.consts.numStrings = this.consts.stringIntervals.length;
        this.consts.fretHeight = (this.consts.numStrings - 1) * this.consts.stringSpacing;

        // Apply global scale from CSS variable --fretboard-scale (default 1)
        try {
            const raw = getComputedStyle(document.documentElement).getPropertyValue('--fretboard-scale');
            const scale = parseFloat(raw) || 1;
            if (scale !== 1) {
                this.consts.offsetX = Math.round(this.consts.offsetX * scale);
                this.consts.offsetY = Math.round(this.consts.offsetY * scale);
                this.consts.fretWidth = this.consts.fretWidth * scale;
                this.consts.stringSpacing = this.consts.stringSpacing * scale;
                this.consts.circleRadius = this.consts.circleRadius * scale;
                // recompute dependent fretHeight
                this.consts.fretHeight = (this.consts.numStrings - 1) * this.consts.stringSpacing;
            }
        } catch (e) {
            // ignore if getComputedStyle not available
        }

        this.state = {
            selected: null,
            visibility: 'transparent',
            startFret: 0,
            endFret: 12,
            enharmonic: 0
        };

        // Set start fret from options if provided (accept 0 values)
        if (typeof opts.startFret !== 'undefined' && opts.startFret !== null) {
            this.state.startFret = typeof opts.startFret === 'object' ? parseInt(opts.startFret.value) : parseInt(opts.startFret);
        }

        // Set end fret from options if provided, otherwise calculate based on viewport width
        if (typeof opts.endFret !== 'undefined' && opts.endFret !== null) {
            this.state.endFret = typeof opts.endFret === 'object' ? parseInt(opts.endFret.value) : parseInt(opts.endFret);
        } else {
            this.state.endFret = Math.min(Math.floor((window.innerWidth - 2 * this.consts.offsetX ) / this.consts.fretWidth), 12);
        }

        // Update the input element if it exists
        if (opts.endFret && typeof opts.endFret === 'object') {
            opts.endFret.value = this.state.endFret;
        }

        this.computeDependents();

        this.data = {};

        // register instance for global operations (e.g., label toggling)
        Fretboard.instances = Fretboard.instances || [];
        Fretboard.instances.push(this);
        if (typeof Fretboard.showLabels === 'undefined') {
            Fretboard.showLabels = false;
        }
        if (typeof Fretboard.showAllNotes === 'undefined') {
            Fretboard.showAllNotes = true; // default to showing all notes
        }
        if (typeof Fretboard.rootNoteOffset === 'undefined') {
            Fretboard.rootNoteOffset = 0; // default to A (no offset from A at index 5)
        }

        // Store original notes data and fret window before any offset is applied
        this.originalNotes = null;
        this.originalStartFret = this.state.startFret;
        this.originalEndFret = this.state.endFret;

        // Store transposable flag (default true for backward compatibility)
        this.transposable = (typeof opts.transposable !== 'undefined') ? !!opts.transposable : true;

        this.draw();

        // Initialize with notes if provided in options
        if (opts.notes && Array.isArray(opts.notes)) {
            this.setInitialNotes(opts.notes);
        }
    }

    computeDependents() {
        this.state.numFrets = this.state.endFret - this.state.startFret;
        this.state.fretboardWidth = this.consts.fretWidth * this.state.numFrets;
    }

    applyRootOffset(notesArray) {
        /**
         * Apply root note offset to all fret positions.
         * The offset shifts all frets relative to the original root note (A at index 5).
         */
        if (Fretboard.rootNoteOffset === 0 || !notesArray) {
            return notesArray;
        }

        return notesArray.map(note => {
            const newNote = Object.assign({}, note);
            // Don't offset muted strings or open strings
            if (newNote.fret === 'X' || newNote.fret === 'x' || newNote.fret === -1) {
                return newNote;
            }
            // Apply offset to fretted notes
            if (typeof newNote.fret === 'number' && newNote.fret >= 0) {
                newNote.fret = newNote.fret + Fretboard.rootNoteOffset;
            }
            return newNote;
        });
    }

    setInitialNotes(notesArray) {
        /**
         * Sets initial notes on the fretboard. Each note in the array should be an object with:
         * - fret: fret number (-1 for open strings, 0+ for fretted notes, 'X' for muted strings)
         * - string: string number (0-5, where 0 is the highest string)
         * - color: optional color ('blue', 'green', 'red', 'black', 'white') - defaults to 'blue'
         *
         * Example: [
         *   { fret: -1, string: 0, color: 'blue' },  // open string
         *   { fret: 0, string: 1, color: 'red' },     // first fret
         *   { fret: 3, string: 1, color: 'red' },     // fourth fret
         *   { fret: 'X', string: 5, color: 'blue' }   // muted string
         * ]
         */
        // Store original notes if not already stored
        if (!this.originalNotes) {
            this.originalNotes = JSON.parse(JSON.stringify(notesArray));
        }

        // Apply root note offset to the notes
        const offsetNotes = this.applyRootOffset(notesArray);

        for (let noteInfo of offsetNotes) {
            const fret = noteInfo.fret;
            const string = noteInfo.string;
            const color = noteInfo.color || 'blue';

            // Validate inputs
            if (string < 0 || string >= this.consts.numStrings) {
                console.warn(`Invalid string number: ${string}`);
                continue;
            }

            // Handle muted strings (fret: 'X')
            if (fret === 'X' || fret === 'x') {
                // Draw muted string marker
                this.drawMutedNote(string, color, noteInfo.label);
                continue;
            }

            // Create note ID based on fret (-1 for open strings, 0+ for frets)
            let noteId;
            if (fret === -1) {
                noteId = `o-s${string}`;
            } else {
                noteId = `f${fret}-s${string}`;
            }

            // Find the note element within this fretboard's SVG and update it
            const noteElement = this.svg.querySelector(`#${noteId}`);
            // store provided label (if any) so we can toggle display later
            const label = ('label' in noteInfo) ? noteInfo.label : null;
            if (noteElement) {
                // store label (if provided) but avoid persisting a static noteText
                // so enharmonic toggles still update note names for non-labelled notes
                this.updateNote(noteElement, {
                    color: color,
                    visibility: 'visible',
                    label: label,
                });
                // If a label is provided and labels are currently shown, display it now
                if (label && Fretboard.showLabels) {
                    const txt = noteElement.lastChild;
                    if (txt) txt.innerHTML = label;
                }
            } else {
                console.warn(`Note element not found: ${noteId}`);
            }
        }
    }

    toggleEnharmonic() {
        const untoggledEnharmonic = this.state.enharmonic;
        this.state.enharmonic = (untoggledEnharmonic + 1) % 2;
        this.erase();
        this.draw();
        return this.consts.sign[untoggledEnharmonic];
    }

    setFretWindow(fretWindow) {
        const start = 'start' in fretWindow ? fretWindow.start : this.state.startFret;
        const end = 'end' in fretWindow ? fretWindow.end : this.state.endFret;
        this.erase();
        if (start < 0 || start > 22 || end < 1 || end > 22) {
            this.drawError("Invalid fret value(s)!");
            return;
        }
        if (end <= start) {
            this.drawError("End fret must not be smaller than start fret!");
            this.state.startFret = start;
            this.state.endFret = end;
            return;
        }
        if (end - start > 16) {
            this.drawError("Maximal number of displayable frets is 16, <br/> e.g., 1st to 16th or 4th to 19th!");
            this.state.startFret = start;
            this.state.endFret = end;
            return;
        }

        this.state.startFret = start;
        this.state.endFret = end;

        this.computeDependents();
        this.draw();
    }

    drawError(message) {
        const text = createSvgElement('text', {
            x: 400,
            y: 140,
            class: 'error',
        });
        text.innerHTML = message;
        this.svg.appendChild(text);
        setAttributes(this.svg, {
            width: 800,
        });
    }

    draw() {
        this.drawFrets();
        this.drawMarkers();
        this.drawStrings();
        this.drawNotes();
        //this.addEditableDiv();

        // adjust diagram width to number of selected frets
        setAttributes(this.svg, {
            width: this.state.fretboardWidth + 2 * this.consts.offsetX,
        })

//        this.svg.addEventListener('click', () => {
//            if (this.state.selected) {
//                this.updateNote(this.state.selected, {
//                    visibility: 'visible',
//                });
//                this.state.selected = null;
//            }
//        });
//
//        document.addEventListener('keydown', (event) => {
//            if (!this.state.selected || !event.code) {
//                return;
//            }
//            const selected = this.state.selected;
//            switch (event.code) {
//                case 'Backspace':
//                case 'Delete':
//                    this.deleteNote()
//                    break;
//                case 'KeyB':
//                    this.updateNote(selected, { color: "blue" });
//                    break;
//                case 'KeyD':
//                    this.updateNote(selected, { color: "black" });
//                    break;
//                case 'KeyG':
//                    this.updateNote(selected, { color: "green" });
//                    break;
//                case "KeyW":
//                    this.updateNote(selected, { color: "white" });
//                    break;
//                case "KeyR":
//                    this.updateNote(selected, { color: "red" });
//                    break;
//            }
//        })
    }

//    deleteNote() {
//        // reset text
//        const selected = this.state.selected;
//        const text = selected.lastChild;
//        if (text) {
//            text.innerHTML = text.getAttribute('data-note');
//        }
//        this.updateNote(selected, {
//            color: "white", visibility: this.state.visibility
//        });
//        this.state.selected = null;
//    }

    updateColor(event) {
        this.updateNote(this.state.selected, {
            color: event.currentTarget.getAttribute("title")
        });
    }

    drawFrets() {
        var pathSegments = ["M " + this.consts.offsetX + " " + this.consts.offsetY];
        for (let i = this.state.startFret; i < (this.state.endFret + 1); i++) {
            let factor = (i - this.state.startFret) % 2 == 0 ? 1 : -1;
            pathSegments.push("v " + (factor) * this.consts.fretHeight);
            pathSegments.push("m " + this.consts.fretWidth + " " + 0);
        }
        const path = pathSegments.join(" ");


        const frets = createSvgElement('path', {
            'class': 'frets',
            'd': path,
        });
        this.svg.appendChild(frets);
    }

    drawMarkers() {
        const markers = createSvgElement('g', {
            class: 'markers'
        });
        const filteredMarkers = this.consts.markers
            .filter(i => i > this.state.startFret && i <= this.state.endFret);
        for (let i of filteredMarkers) {
            const marker = createSvgElement('text', {
                class: 'marker',
                x: this.consts.offsetX + (i - 1 - this.state.startFret) * this.consts.fretWidth + (this.consts.fretWidth / 2),
                y: this.consts.offsetY + this.consts.fretHeight + this.consts.stringSpacing,
            });
            marker.innerHTML = i;
            markers.appendChild(marker);
        }
        this.svg.appendChild(markers);
    }

    drawStrings() {
        this.strings = createSvgElement('g', {
            'class': 'strings',
        })
        this.svg.appendChild(this.strings);
        for (let i = 0; i < this.consts.numStrings; i++) {
            let path = "M " + this.consts.offsetX + " " + (this.consts.offsetY + i * this.consts.stringSpacing) + " h " + this.state.fretboardWidth;
            const string = createSvgElement('path', {
                'class': 'string',
                'd': path,
                'styles': {
                    'stroke-width': this.consts.minStringSize * (i + 1),
                }
            });
            this.strings.appendChild(string);
        }
    }

    drawMutedNote(string, color, label) {
        // Draw an 'X' symbol at the open string position for muted strings
        const x = this.consts.offsetX / 2;
        const y = this.consts.offsetY + this.consts.stringSpacing * string;
        const noteId = `muted-s${string}`;

        const note = createSvgElement('g', {
            'id': noteId,
            'transform': "translate(" + x + "," + y + ")",
            'data-x': x,
            'data-y': y,
        });
        this.notes.appendChild(note);

        // Draw X using two lines
        const size = this.consts.circleRadius * 0.5;
        const line1 = createSvgElement('line', {
            'x1': -size,
            'y1': -size,
            'x2': size,
            'y2': size,
            'stroke': color === 'white' ? 'black' : color,
            'stroke-width': 3,
            'stroke-linecap': 'round'
        });
        const line2 = createSvgElement('line', {
            'x1': -size,
            'y1': size,
            'x2': size,
            'y2': -size,
            'stroke': color === 'white' ? 'black' : color,
            'stroke-width': 3,
            'stroke-linecap': 'round'
        });
        note.appendChild(line1);
        note.appendChild(line2);

        // Add optional label
        if (label !== undefined && label !== null && label !== '') {
            const text = createSvgElement('text', {
                'x': 0,
                'y': this.consts.circleRadius + 12,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'fill': 'black',
                'font-size': '12px'
            });
            text.textContent = label;
            note.appendChild(text);
        }

        // Store in data
        this.data[noteId] = {
            type: 'muted',
            color: color,
            visibility: 'visible',
            label: label
        };
    }

    drawNote(noteId, x, y, noteName, isOpen) {
        //console.log(`Creating note: ${noteId} at fret position`);
        const note = createSvgElement('g', {
            'id': noteId,
            'transform': "translate(" + x + "," + y + ")",
            'data-x': x,
            'data-y': y,
        });
        this.notes.appendChild(note);
        //note.addEventListener("click", (event) => this.noteClickHandler(event));
        //note.addEventListener("dblclick", (event) => this.noteDoubleClickHandler(event));

        const circle = createSvgElement('circle', {
            'r': this.consts.circleRadius,
        });
        if (isOpen) {
            setAttributes(circle, {
                // don't show circle around open notes
                'stroke': 'none',
            })
        }
        note.appendChild(circle);

        // compute name of note; place at (0,0) within the note group and
        // use baseline/middle anchoring so it centers reliably across browsers
        const text = createSvgElement('text', {
            'data-note': noteName,
            'x': 0,
            'y': 2,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle'
        });
        text.textContent = noteName;

        note.appendChild(text);

        // Get or create the stored data for this note
        const storedData = (noteId in this.data) ? this.data[noteId] : { type: 'note', color: 'white', visibility: this.state.visibility };

        // Apply the stored data to the note (this also stores it in this.data)
        this.updateNote(note, storedData);

        // Now apply visibility override based on showAllNotes setting (without storing it)
        if (!Fretboard.showAllNotes) {
            // Only show notes that are explicitly colored (not white) OR explicitly set to visible
            const isExplicitNote = (storedData.color && storedData.color !== 'white') || storedData.visibility === 'visible';
            if (!isExplicitNote) {
                // Apply visibility to the element class without storing it
                const classValue = generateClassValue(note, { visibility: 'hidden' });
                note.setAttribute('class', classValue);
            }
        }
    }

    computeNoteName(fret, string) {
        const interval = this.consts.stringIntervals[string] + fret + 1;
        return this.consts.notes[this.state.enharmonic][interval % 12];
    }

    drawNotes() {
        // Remove old notes group if it exists
        if (this.notes) {
            this.notes.remove();
        }

        this.notes = createSvgElement('g', {
            'class': 'notes',
        })
        this.svg.appendChild(this.notes);

        // Debug: log the fret range
        // console.log(`Drawing notes from fret ${this.state.startFret} to ${this.state.endFret}`);

        // Draw muted notes (always shown regardless of startFret)
        for (let j = 0; j < this.consts.numStrings; j++) {
            const mutedId = `muted-s${j}`;
            if (mutedId in this.data && this.data[mutedId].type === 'muted') {
                const mutedData = this.data[mutedId];
                this.drawMutedNote(j, mutedData.color, mutedData.label);
            }
        }

        // open notes (fret: -1) - only draw if startFret is 0 or less
        if (this.state.startFret <= 0) {
            for (let j = 0; j < this.consts.numStrings; j++) {
                const noteId = `o-s${j}`;
                const x = this.consts.offsetX / 2;
                const y = this.consts.offsetY + this.consts.stringSpacing * j;
                const noteName = this.computeNoteName(-1, j);
                this.drawNote(noteId, x, y, noteName, true);
            }
        }
        // notes on fretboard
        for (let i = this.state.startFret; i < this.state.endFret; i++) {
            for (let j = 0; j < this.consts.numStrings; j++) {
                const noteId = `f${i}-s${j}`;
                const x = this.consts.offsetX + (this.consts.fretWidth / 2) + this.consts.fretWidth * (i - this.state.startFret);
                const y = this.consts.offsetY + this.consts.stringSpacing * j;
                const noteName = this.computeNoteName(i, j);
                this.drawNote(noteId, x, y, noteName, false);
            }
        }
    }

//    noteClickHandler(event) {
//        event.stopPropagation();
//        const note = event.currentTarget;
//        note.focus();
//        if (this.state.selected) {
//            this.updateNote(this.state.selected, {
//                visibility: 'visible',
//            });
//        }
//        this.updateNote(note, {
//            visibility: 'selected',
//        });
//        this.state.selected = note;
//
//        if (event.ctrlKey) {
//            this.editSelectedLabel();
//        }
//    }
//
//    noteDoubleClickHandler(event) {
//        event.stopPropagation();
//        const note = event.currentTarget;
//        if (this.state.selected) {
//            this.updateNote(this.state.selected, {
//                visibility: 'visible',
//            });
//        }
//        this.updateNote(note, {
//            visibility: 'selected',
//        });
//        this.state.selected = note;
//        this.editSelectedLabel();
//    }

//    editSelectedLabel() {
//        const selected = this.state.selected;
//        const x = selected.getAttribute('data-x');
//        const y = selected.getAttribute('data-y');
//        setAttributes(this.editableText, {
//            x: x - this.consts.circleRadius,
//            y: y - this.consts.circleRadius + 4,
//            height: 2 * this.consts.circleRadius,
//            width: 2 * this.consts.circleRadius,
//            class: 'visible',
//            styles: {
//                display: 'block',
//            }
//        });
//
//        const selectedText = this.state.selected.lastChild;
//        setAttributes(selectedText, {
//            styles: {
//                display: 'none',
//            }
//        });
//
//        this.editableText.children[0].innerHTML = selectedText.innerHTML;
//        this.editableText.children[0].focus();
//        // select all text in editable div
//        document.execCommand('selectAll', false, null);
//    }
//
//    addEditableDiv() {
//        this.editableText = createSvgElement('foreignObject', {
//            class: 'hidden',
//        });
//        this.editableText.addEventListener('click', (event) => {
//            event.stopPropagation();
//        });
//        const div = document.createElement('div');
//        div.setAttribute('contentEditable', 'true');
//        div.setAttribute('id', 'editable-div')
//        div.addEventListener('keydown', (event) => {
//            event.stopPropagation();
//            if (event.code === 'Enter') {
//                event.target.blur();
//            }
//        });
//        div.addEventListener('blur', (event) => {
//            if (!this.state.selected) {
//                return;
//            }
//            const selectedText = this.state.selected.lastChild;
//
//            var newText = this.editableText.children[0].innerText;
//            // don't allow empty labels
//            if (newText.trim()) {
//                this.updateNote(this.state.selected, {
//                    noteText: newText,
//                });
//            }
//
//            this.editableText.children[0].innerHTML = '';
//            setAttributes(selectedText, {
//                styles: {
//                    display: 'block',
//                }
//            });
//            setAttributes(this.editableText, {
//                styles: {
//                    display: 'none',
//                }
//            });
//        })
//        this.editableText.appendChild(div);
//        this.svg.appendChild(this.editableText);
//    }

    updateNote(elem, update) {
        if (!(elem.id in this.data)) {
            this.data[elem.id] = {};
        }
        const classValue = generateClassValue(elem, update);
        elem.setAttribute('class', classValue);

        if ('noteText' in update) {
            elem.lastChild.innerHTML = update.noteText;
        }

        const noteData = this.data[elem.id];
        for (let [key, value] of Object.entries(update)) {
            noteData[key] = value;
        }
    }

    refreshNoteTexts() {
        if (!this.notes) return;
        for (let note of this.notes.children) {
            const id = note.id;
            const noteElem = note.lastChild;
            const baseNote = noteElem ? noteElem.getAttribute('data-note') : '';
            const stored = this.data[id] || {};
            const label = stored.label || null;
            const customText = (stored.noteText !== undefined) ? stored.noteText : null;

            let text;
            if (customText) {
                text = customText;
            } else if (!Fretboard.showAllNotes) {
                // When showAllNotes is disabled, only show labels (if showLabels is enabled)
                text = (Fretboard.showLabels && label) ? label : '';
            } else {
                // Normal behavior: show labels if enabled, otherwise show note names
                text = (Fretboard.showLabels && label) ? label : baseNote;
            }

            if (noteElem) noteElem.innerHTML = text;
        }
    }

    static toggleShowLabels() {
        Fretboard.showLabels = !Fretboard.showLabels;
        Fretboard.instances = Fretboard.instances || [];
        for (let inst of Fretboard.instances) {
            inst.refreshNoteTexts();
        }
        return Fretboard.showLabels;
    }

    static setShowLabels(enable) {
        Fretboard.showLabels = !!enable;
        Fretboard.instances = Fretboard.instances || [];
        for (let inst of Fretboard.instances) {
            inst.refreshNoteTexts();
        }
    }

    static toggleEnharmonicAll() {
        Fretboard.instances = Fretboard.instances || [];
        if (Fretboard.instances.length === 0) return '';
        // Toggle the first instance and use its new state for all others
        const sign = Fretboard.instances[0].toggleEnharmonic();
        const newState = Fretboard.instances[0].state.enharmonic;
        for (let i = 1; i < Fretboard.instances.length; i++) {
            const inst = Fretboard.instances[i];
            inst.state.enharmonic = newState;
            inst.erase();
            inst.draw();
        }
        return sign;
    }

    static toggleShowAllNotes() {
        Fretboard.showAllNotes = !Fretboard.showAllNotes;
        Fretboard.instances = Fretboard.instances || [];
        for (let inst of Fretboard.instances) {
            inst.erase();
            inst.draw();
            inst.refreshNoteTexts();
        }
        return Fretboard.showAllNotes;
    }

    static setShowAllNotes(enable) {
        Fretboard.showAllNotes = !!enable;
        Fretboard.instances = Fretboard.instances || [];
        for (let inst of Fretboard.instances) {
            inst.erase();
            inst.draw();
            inst.refreshNoteTexts();
        }
    }

    static setRootNote(noteIndex) {
        /**
         * Set the root note by its index in the notes array.
         * A is at index 5 (the default), so offset = noteIndex - 5
         */
        const aIndex = 5; // A is at index 5 in the notes array
        Fretboard.rootNoteOffset = noteIndex - aIndex;

        Fretboard.instances = Fretboard.instances || [];
        for (let inst of Fretboard.instances) {
            // Skip instances that are not transposable
            if (!inst.transposable) {
                continue;
            }

            // Apply offset to fret window
            inst.state.startFret = inst.originalStartFret + Fretboard.rootNoteOffset;
            inst.state.endFret = inst.originalEndFret + Fretboard.rootNoteOffset;
            inst.computeDependents();

            // Clear current data to force re-initialization with new offset
            inst.data = {};
            inst.erase();
            inst.draw();

            // Re-apply original notes with new offset
            if (inst.originalNotes && inst.originalNotes.length > 0) {
                inst.setInitialNotes(inst.originalNotes);
            }
        }
    }

    toggleVisibility() {
        this.state.visibility = this.state.visibility === 'hidden' ? 'transparent' : 'hidden';
        for (let note of this.notes.children) {
            if (note.className.baseVal.endsWith('visible') || note.className.baseVal.endsWith('selected')) {
                continue;
            }
            this.updateNote(note, {
                visibility: this.state.visibility,
            })
        }

        for (let [_key, value] of Object.entries(this.data)) {
            if (value['visibility'] === 'visible' || value['visibility'] === 'selected') {
                continue;
            }
            value['visibility'] = this.state.visibility;
        }
    }

    clearSelection() {
        if (this.state.selected) {
            this.updateNote(this.state.selected, {
                visibility: 'visible',
            });
            this.state.selected = null;
        }
    }

    erase() {
        this.clearSelection();
        this.svg.innerHTML = "";
    }

    reset() {
        this.data = {};
        for (let note of this.notes.children) {
            // reset text
            const text = note.lastChild;
            if (text) {
                text.innerHTML = text.getAttribute('data-note');
            }
            this.updateNote(note,
                { type: "note", color: "white", visibility: this.state.visibility });
            this.state.selected = null;
        }
    }
}

/* Main */

/* Initialize diagram - only if on the main fretboard.html page */

const svg = document.getElementById('fretboard');
const endFret = document.getElementById('end-fret');
const startFretInput = document.getElementById('start-fret');
const notesInput = document.getElementById('notes');

// parse optional notes JSON from a hidden input (if present)
let parsedNotes = null;
if (notesInput && notesInput.value) {
    try {
        parsedNotes = JSON.parse(notesInput.value);
    } catch (e) {
        // invalid JSON -> ignore and leave parsedNotes as null
        parsedNotes = null;
        console.warn('Could not parse #notes value as JSON:', e);
    }
}

// read start-fret (user-facing inputs are 1-based; convert to 0-based internal)
let startFretValue = undefined;
if (startFretInput && startFretInput.value) {
    const v = parseInt(startFretInput.value);
    if (!isNaN(v)) startFretValue = v - 1;
}

// If the single-fretboard page is present, create and store the instance
if (svg && endFret) {
    // Debug: show raw input values for troubleshooting
    console.log('single-fretboard inputs (raw):', {
        startFretRaw: startFretInput ? startFretInput.value : undefined,
        endFretRaw: endFret ? endFret.value : undefined,
        notesRaw: notesInput ? notesInput.value : undefined,
        parsedNotes: parsedNotes
    });

    // Convert user-supplied notes from 1-based to internal indexing:
    // - user fret 0 -> internal -1 (open string)
    // - user fret N>0 -> internal N-1
    // - user fret 'X' -> keep as 'X' (muted string)
    // - user string 1 -> internal 0, etc.
    function convertUserNotes(notesArr) {
        return notesArr.map(n => {
            const out = Object.assign({}, n);
            if (out.hasOwnProperty('fret')) {
                // Check if it's 'X' for muted strings
                if (out.fret === 'X' || out.fret === 'x') {
                    out.fret = 'X'; // normalize to uppercase
                } else {
                    const fv = parseInt(out.fret);
                    if (!isNaN(fv)) {
                        out.fret = (fv === 0) ? -1 : (fv - 1);
                    }
                }
            }
            if (out.hasOwnProperty('string')) {
                const sv = parseInt(out.string);
                if (!isNaN(sv)) {
                    out.string = Math.max(0, sv - 1);
                }
            }
            return out;
        });
    }

    const notesToPass = Array.isArray(parsedNotes) ? convertUserNotes(parsedNotes) : parsedNotes;
    if (Array.isArray(parsedNotes)) console.log('single-fretboard: converted notes (internal):', notesToPass);
    window.fretboardMain = new Fretboard({
        svg: svg,
        startFret: (typeof startFretValue !== 'undefined') ? startFretValue : undefined,
        endFret: endFret,
        notes: notesToPass
    });
}

/* Utility to inline computed CSS for export */
const PROPERTIES = ["fill", "stroke", "stroke-width", "text-anchor", "dominant-baseline"]

function inlineCSS(svgEl) {
    if (!svgEl) return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svgElements = document.querySelectorAll("#fretboard *");
    const clonedSVG = svgEl.cloneNode(true);
    const clonedElements = clonedSVG.querySelectorAll("*");
    for (let i = 0; i < svgElements.length; i++) {
        const computedStyle = getComputedStyle(svgElements[i]);
        const opacity = computedStyle.getPropertyValue('opacity');
        if (opacity === '0') {
            if (clonedElements[i]) clonedElements[i].remove();
            continue;
        }
        const styles = { opacity: opacity }
        for (let attr of PROPERTIES) {
            let value = computedStyle.getPropertyValue(attr);
            if (value) {
                styles[attr] = value;
            }
        }
        if (clonedElements[i]) setAttributes(clonedElements[i], { 'styles': styles });
    }
    return clonedSVG;
}

/* Optional UI elements: only wire them when present */

const togglebutton = document.getElementById('visibility');
if (togglebutton) {
    togglebutton.addEventListener('click', (event) => {
        if (window.fretboardMain) window.fretboardMain.toggleVisibility();
    });
}

var svgButton = document.getElementById('save-svg');
const svgLink = document.getElementById('svg-link');
if (svgButton && svgLink) {
    svgButton.addEventListener('click', () => {
        if (!window.fretboardMain) return;
        window.fretboardMain.clearSelection();
        const svgCopy = inlineCSS(svg);
        var svgData = svgCopy.outerHTML;
        var svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        var svgUrl = URL.createObjectURL(svgBlob);
        svgLink.href = svgUrl;
        svgLink.click();
    });
}

/* Reset button */
const resetButton = document.getElementById('reset');
if (resetButton) {
    resetButton.addEventListener('click', (event) => {
        const doReset = window.confirm("Do you really want to reset your diagram?");
        if (doReset && window.fretboardMain) {
            window.fretboardMain.reset();
        }
    });
}

/* Fret window inputs */
const startFret = document.getElementById('start-fret');
if (startFret) {
    startFret.addEventListener('input', (event) => {
        if (window.fretboardMain) window.fretboardMain.setFretWindow({ start: event.target.value - 1 });
    });
}

if (endFret) {
    endFret.addEventListener('input', (event) => {
        if (window.fretboardMain) window.fretboardMain.setFretWindow({ end: parseInt(event.target.value) });
    });
}

/* Color selector */
const colorButtons = document.querySelectorAll("button.color");
if (colorButtons && colorButtons.length) {
    for (let button of colorButtons) {
        button.addEventListener('click', (event) => {
            if (window.fretboardMain) window.fretboardMain.updateColor(event);
        });
    }
}

const deleteNoteButton = document.getElementById("delete-note");
if (deleteNoteButton) {
    deleteNoteButton.addEventListener('click', () => {
        if (window.fretboardMain && typeof window.fretboardMain.deleteNote === 'function') window.fretboardMain.deleteNote();
    });
}

const enharmonicToggle = document.getElementById("enharmonic");
if (enharmonicToggle) {
    enharmonicToggle.addEventListener('click', () => {
        if (window.fretboardMain) {
            const sign = window.fretboardMain.toggleEnharmonic();
            enharmonicToggle.innerHTML = sign;
        }
    });
}