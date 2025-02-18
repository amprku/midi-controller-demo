class ChordGenerator {
    constructor() {
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
        this.currentKey = 'C';
        this.currentMode = 'major';
        this.currentQuality = 'natural';
        this.currentExtension = 'triad';
        this.currentInversion = 0;
        this.baseOctave = 4;
        this.currentVoicing = 'close';
        this.tempVoicing = null;
        
        // Temporary overrides
        this.tempOverride = null;  // For override chords
        this.tempInversion = null;
        
        this.memoryLocked = false;
        this.chordMemory = new Array(16).fill(null);
        
        this.overridePage = 0; // 0 for first 8 overrides, 1 for second 8
        
        // Add state tracking for memory keys
        this.activeMemoryKey = null;
        this.memoryPage = 0; // 0 for first 8 slots, 1 for second 8
        
        this.setupKeyboard();
        this.setupControls();
        this.updateKeyboardVisuals();
        this.updateScaleKeyboard();
        this.setupOctaveKeyboardShortcuts();
        
        // Add touch event handling for mobile
        this.setupTouchHandling();

        // Handle window resizing
        window.addEventListener('resize', () => {
            this.rebuildKeyboard();
        });

        // Initialize theme
        this.setupThemeToggle();

        // Add this to setupControls() after creating override buttons
        document.querySelectorAll('#chord-type-buttons button').forEach((button, index) => {
            const pageNum = Math.floor(index / 8);
            const shortcutNum = (index % 8) + 1;
            button.setAttribute('data-shortcut', shortcutNum);
        });

        // Call this at the end of constructor
        this.updateOverrideButtonsVisibility();
        this.updateMemoryButtonsVisibility();

        // Add state tracking for all keyboard shortcuts
        this.activeKeys = new Set();
        this.activeOverrideKey = null;
        this.activeMemoryKey = null;
        
        // Add single keyboard event listener for all shortcuts
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    setupKeyboard() {
        const keyboard = document.getElementById('keyboard');
        const octaves = 6;
        const lowestOctave = 1;
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const whiteNotes = notes.filter(note => !note.includes('#'));
        const blackNotes = notes.filter(note => note.includes('#'));
        
        // First create all white keys
        for (let octave = lowestOctave; octave < octaves + lowestOctave; octave++) {
            whiteNotes.forEach(note => {
                const key = document.createElement('div');
                key.className = 'key white';
                key.dataset.note = `${note}${octave}`;
                keyboard.appendChild(key);

                // Add mousedown handler with scale check
                // key.addEventListener('mousedown', () => {
                //     if (this.isNotePlayable(note) || this.tempOverride) {
                //         key.classList.add('active');
                //         this.playChord(note, octave);
                //     }
                // });
                // key.addEventListener('mouseup', () => {
                //     key.classList.remove('active');
                //     this.stopChord();
                // });

                // // Add touch handlers
                // key.addEventListener('touchstart', (e) => {
                //     e.preventDefault();
                //     if (this.isNotePlayable(note) || this.tempOverride) {
                //         key.classList.add('active');
                //         this.playChord(note, octave);
                //     }
                // }, { passive: false });

                // key.addEventListener('touchend', (e) => {
                //     e.preventDefault();
                //     key.classList.remove('active');
                //     this.stopChord();
                // }, { passive: false });
            });
        }

        // Create black keys with fixed octaves
        for (let octave = lowestOctave; octave < octaves + lowestOctave; octave++) {
            blackNotes.forEach(note => {
                const key = document.createElement('div');
                key.className = 'key black';
                key.dataset.note = `${note}${octave}`;
                keyboard.appendChild(key);

                // Mouse events
                // key.addEventListener('mousedown', () => {
                //     if (this.isNotePlayable(note) || this.tempOverride) {
                //         key.classList.add('active');
                //         this.playChord(note, octave);
                //     }
                // });

                // key.addEventListener('mouseup', () => {
                //     key.classList.remove('active');
                //     this.stopChord();
                // });

                // // Touch events
                // key.addEventListener('touchstart', (e) => {
                //     e.preventDefault();
                //     if (this.isNotePlayable(note) || this.tempOverride) {
                //         key.classList.add('active');
                //         this.playChord(note, octave);
                //     }
                // }, { passive: false });

                // key.addEventListener('touchend', (e) => {
                //     e.preventDefault();
                //     key.classList.remove('active');
                //     this.stopChord();
                // }, { passive: false });
            });
        }



    }

    setupControls() {
        // Scale & Mode controls
        document.getElementById('key-select').addEventListener('change', (e) => {
            this.currentKey = e.target.value;
            this.updateKeyboardVisuals();
            this.updateScaleKeyboard();
        });

        document.getElementById('mode-select').addEventListener('change', (e) => {
            this.currentMode = e.target.value;
            this.updateKeyboardVisuals();
            this.updateScaleKeyboard();
        });

        // Quality buttons
        document.querySelectorAll('#chord-quality-buttons button').forEach(button => {
            button.addEventListener('click', (e) => {
                if (e.detail === 2) {
                    document.querySelectorAll('#chord-quality-buttons button').forEach(b => 
                        b.classList.remove('selected'));
                    button.classList.add('selected');
                    this.currentQuality = button.dataset.value;
                }
            });
        });

        // Extension buttons
        document.querySelectorAll('#chord-extension-buttons button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('#chord-extension-buttons button').forEach(b => 
                    b.classList.remove('selected'));
                button.classList.add('selected');
                this.currentExtension = button.dataset.value;
            });
        });

        // Override chord buttons
        document.querySelectorAll('#chord-type-buttons button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('#chord-type-buttons button').forEach(b => 
                    b.classList.remove('selected'));
                button.classList.add('selected');
                this.tempOverride = button.dataset.value;
                // Add override class to keyboard when override is active
                document.getElementById('keyboard').classList.add('override-active');
            });
        });

        // Inversion buttons
        document.querySelectorAll('#inversion-buttons button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('#inversion-buttons button').forEach(b => 
                    b.classList.remove('selected'));
                button.classList.add('selected');
                this.currentInversion = parseInt(button.dataset.value);
            });
        });

        // Voicing buttons
        document.querySelectorAll('#voicing-buttons button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('#voicing-buttons button').forEach(b => 
                    b.classList.remove('selected'));
                button.classList.add('selected');
                this.currentVoicing = button.dataset.value;
            });
        });

        // Octave controls
        const octaveDisplay = document.getElementById('octave-display');
        
        document.getElementById('octave-up').addEventListener('click', () => {
            if (this.baseOctave < 6) {  // Limit upper octave
                this.baseOctave++;
                octaveDisplay.textContent = this.baseOctave;
                this.updateKeyboardVisuals();
            }
        });
        
        document.getElementById('octave-down').addEventListener('click', () => {
            if (this.baseOctave > 1) {  // Limit lower octave
                this.baseOctave--;
                octaveDisplay.textContent = this.baseOctave;
                this.updateKeyboardVisuals();
            }
        });

        // Memory lock button
        document.getElementById('memory-lock').addEventListener('click', () => {
            this.memoryLocked = !this.memoryLocked;
            const lockButton = document.getElementById('memory-lock');
            lockButton.querySelector('.lock-icon').textContent = this.memoryLocked ? '🔒' : '🔓';
            lockButton.classList.toggle('locked', this.memoryLocked);
        });

        // Memory slot buttons
        document.querySelectorAll('.memory-slot').forEach(button => {
            // Mouse events
            button.addEventListener('mousedown', () => {
                const memory = this.chordMemory[button.dataset.slot];
                if (memory) {
                    button.classList.add('active');
                    this.playMemoryChord(memory);
                }
            });

            button.addEventListener('mouseup', () => {
                button.classList.remove('active');
                this.stopChord();
            });

            // Handle mouse leaving while pressed
            button.addEventListener('mouseleave', () => {
                if (button.classList.contains('active')) {
                    button.classList.remove('active');
                    this.stopChord();
                }
            });

            // Touch events
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const memory = this.chordMemory[button.dataset.slot];
                if (memory) {
                    button.classList.add('active');
                    this.playMemoryChord(memory);
                }
            });

            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                button.classList.remove('active');
                this.stopChord();
            });
        });

        // Add clear all functionality
        document.getElementById('clear-memory').addEventListener('click', () => {
            if (confirm('Clear all memory slots?')) {
                this.chordMemory = new Array(16).fill(null);
                this.updateMemorySlots();
            }
        });

        // Setup drag and drop for memory slots
        this.setupMemoryDragDrop();

        // Update override keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;

            // Switch override pages with 9 and 0 keys
            if (e.key === '9') {
                this.overridePage = 0;
                this.updateOverrideButtonsVisibility();
                return;
            }
            if (e.key === '0') {
                this.overridePage = 1;
                this.updateOverrideButtonsVisibility();
                return;
            }

            // Handle number keys 1-8 for override chords
            const num = parseInt(e.key);
            if (num >= 1 && num <= 8) {
                this.activeOverrideKey = e.key;
                const index = (this.overridePage * 8) + (num - 1);
                const button = document.querySelectorAll('#chord-type-buttons button')[index];
                if (button) {
                    // Clear previous selection
                    document.querySelectorAll('#chord-type-buttons button').forEach(b => 
                        b.classList.remove('selected'));
                    
                    // Select and activate the override
                    button.classList.add('selected');
                    this.tempOverride = button.dataset.value;
                    document.getElementById('keyboard').classList.add('override-active');

                    // If a scale key is currently active, replay it with the new override
                    const activeScaleKey = document.querySelector('.scale-key.active');
                    if (activeScaleKey) {
                        const note = activeScaleKey.textContent;
                        this.playChord(note, this.baseOctave);
                    }
                }
            }
        });

        // Update keyup handler to only clear override when both keys are released
        window.addEventListener('keyup', (e) => {
            const num = parseInt(e.key);
            if (num >= 1 && num <= 8 && e.key === this.activeOverrideKey) {
                // Only clear if no scale key is active
                if (!document.querySelector('.scale-key.active')) {
                    document.querySelectorAll('#chord-type-buttons button').forEach(b => 
                        b.classList.remove('selected'));
                    this.tempOverride = null;
                    document.getElementById('keyboard').classList.remove('override-active');
                }
                this.activeOverrideKey = null;
            }
        });

        // Add keyboard shortcuts for memory slots
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;

            // Switch memory pages with O and P keys
            if (e.key.toLowerCase() === 'o') {
                this.memoryPage = 0;
                this.updateMemoryButtonsVisibility();
                return;
            }
            if (e.key.toLowerCase() === 'p') {
                this.memoryPage = 1;
                this.updateMemoryButtonsVisibility();
                return;
            }

            // Map Q-I keys to memory slots
            const memoryKeyMap = {
                'q': 0, 'w': 1, 'e': 2, 'r': 3,
                't': 4, 'y': 5, 'u': 6, 'i': 7
            };

            const index = memoryKeyMap[e.key.toLowerCase()];
            if (index !== undefined) {
                this.activeMemoryKey = e.key;
                const slotIndex = (this.memoryPage * 8) + index;
                const memory = this.chordMemory[slotIndex];
                
                if (memory) {
                    const slot = document.querySelector(`.memory-slot[data-slot="${slotIndex}"]`);
                    slot.classList.add('active');
                    this.playMemoryChord(memory);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            const memoryKeyMap = {
                'q': 0, 'w': 1, 'e': 2, 'r': 3,
                't': 4, 'y': 5, 'u': 6, 'i': 7
            };

            const index = memoryKeyMap[e.key.toLowerCase()];
            if (index !== undefined && e.key.toLowerCase() === this.activeMemoryKey?.toLowerCase()) {
                const slotIndex = (this.memoryPage * 8) + index;
                const slot = document.querySelector(`.memory-slot[data-slot="${slotIndex}"]`);
                if (slot) {
                    slot.classList.remove('active');
                    this.stopChord();
                }
                this.activeMemoryKey = null;
            }
        });
    }

    setupMemoryDragDrop() {
        const memorySlots = document.querySelectorAll('.memory-slot');
        const trashZone = document.getElementById('memory-trash');

        memorySlots.forEach(slot => {
            slot.addEventListener('dragstart', (e) => {
                if (this.memoryLocked || slot.classList.contains('empty')) {
                    e.preventDefault();
                    return;
                }
                e.dataTransfer.setData('text/plain', slot.dataset.slot);
                slot.classList.add('dragging');
            });

            slot.addEventListener('dragend', () => {
                slot.classList.remove('dragging');
            });

            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!slot.classList.contains('dragging')) {
                    slot.classList.add('drag-over');
                }
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const targetIndex = parseInt(slot.dataset.slot);
                
                if (sourceIndex !== targetIndex) {
                    // Swap memory slots
                    [this.chordMemory[sourceIndex], this.chordMemory[targetIndex]] = 
                    [this.chordMemory[targetIndex], this.chordMemory[sourceIndex]];
                    this.updateMemorySlots();
                }
            });
        });

        // Trash zone handling
        trashZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            trashZone.classList.add('drag-over');
        });

        trashZone.addEventListener('dragleave', () => {
            trashZone.classList.remove('drag-over');
        });

        trashZone.addEventListener('drop', (e) => {
            e.preventDefault();
            trashZone.classList.remove('drag-over');
            const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
            this.chordMemory[sourceIndex] = null;
            this.updateMemorySlots();
        });
    }

    updateKeyboardVisuals() {
        const modeIntervals = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            phrygian: [0, 1, 3, 5, 7, 8, 10],
            lydian: [0, 2, 4, 6, 7, 9, 11],
            mixolydian: [0, 2, 4, 5, 7, 9, 10],
            locrian: [0, 1, 3, 5, 6, 8, 10]
        };

        const noteToNumber = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };

        const keyOffset = noteToNumber[this.currentKey];
        const currentScale = modeIntervals[this.currentMode];

        // Reset all keys
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('in-scale');
        });

        // Mark keys that are in the scale
        document.querySelectorAll('.key').forEach(key => {
            const note = key.dataset.note.slice(0, -1); // Remove octave number
            const noteNum = (noteToNumber[note] - keyOffset + 12) % 12;
            if (currentScale.includes(noteNum)) {
                key.classList.add('in-scale');
            }
        });
    }

    getChordNotes(baseNote, octave) {
        // Get base notes
        let notes = this.tempOverride ? 
            this.getSimpleChordNotes(baseNote, octave) : 
            this.getScaleBasedChordNotes(baseNote, octave);

        // Apply inversions
        if (notes.length > 0) {
            const inversion = this.tempInversion !== null ? this.tempInversion : this.currentInversion;
            if (inversion > 0) {
                // Move notes up an octave based on inversion
                for (let i = 0; i < inversion; i++) {
                    const note = notes[i];
                    const [noteName, noteOctave] = note.split(/(\d+)/);
                    notes[i] = `${noteName}${parseInt(noteOctave) + 1}`;
                }
                
                // Sort the notes by pitch for consistent voicing
                const noteToNumber = {
                    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
                    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
                };
                
                notes.sort((a, b) => {
                    const [aNote, aOct] = a.split(/(\d+)/);
                    const [bNote, bOct] = b.split(/(\d+)/);
                    const aValue = parseInt(aOct) * 12 + noteToNumber[aNote];
                    const bValue = parseInt(bOct) * 12 + noteToNumber[bNote];
                    return aValue - bValue;
                });
            }
        }

        // Apply voicing
        return this.applyVoicing(notes);
    }

    getSimpleChordNotes(baseNote, octave) {
        const chordIntervals = {
            major: [0, 4, 7],
            minor: [0, 3, 7],
            diminished: [0, 3, 6],
            augmented: [0, 4, 8],
            major7: [0, 4, 7, 11],
            minor7: [0, 3, 7, 10],
            dominant7: [0, 4, 7, 10],
            diminished7: [0, 3, 6, 9],
            major9: [0, 4, 7, 11, 14],
            minor9: [0, 3, 7, 10, 14],
            dominant9: [0, 4, 7, 10, 14],
            sus2: [0, 2, 7],
            sus4: [0, 5, 7],
            major6: [0, 4, 7, 9],
            minor6: [0, 3, 7, 9],
            add9: [0, 4, 7, 14]
        };

        const noteToNumber = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };

        const numberToNote = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const intervals = chordIntervals[this.tempOverride];
        
        return intervals.map(interval => {
            const noteNum = (noteToNumber[baseNote] + interval) % 12;
            const octaveOffset = Math.floor((noteToNumber[baseNote] + interval) / 12);
            return `${numberToNote[noteNum]}${octave + octaveOffset}`;
        });
    }

    getScaleBasedChordNotes(baseNote, octave) {
        const modeIntervals = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            phrygian: [0, 1, 3, 5, 7, 8, 10],
            lydian: [0, 2, 4, 6, 7, 9, 11],
            mixolydian: [0, 2, 4, 5, 7, 9, 10],
            locrian: [0, 1, 3, 5, 6, 8, 10]
        };

        const chordExtensions = {
            triad: [0, 2, 4],         // 1-3-5
            seventh: [0, 2, 4, 6],    // 1-3-5-7
            ninth: [0, 2, 4, 6, 8],   // 1-3-5-7-9
            add9: [0, 2, 4, 8]        // 1-3-5-9
        };

        const qualityIntervals = {
            major: {
                third: 4,
                fifth: 7,
                seventh: 11,
                ninth: 14
            },
            minor: {
                third: 3,
                fifth: 7,
                seventh: 10,
                ninth: 14
            },
            diminished: {
                third: 3,
                fifth: 6,
                seventh: 9,
                ninth: 13
            }
        };

        const noteToNumber = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };

        const numberToNote = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // Get the base note relative to the current key
        const baseNoteNum = (noteToNumber[baseNote] - noteToNumber[this.currentKey] + 12) % 12;
        
        // Get the scale degrees for the current mode
        const currentScale = modeIntervals[this.currentMode];

        // Get the chord structure
        const chordStructure = chordExtensions[this.currentExtension];
        
        // Build the chord
        let intervals;
        if (this.currentQuality === 'natural') {
            // If using natural quality, check if the note is in the scale
            if (!currentScale.includes(baseNoteNum)) {
                return [];
            }
            
            const scaleDegree = currentScale.indexOf(baseNoteNum);
            intervals = chordStructure.map(step => {
                const targetDegree = (scaleDegree + step) % 7;
                return (currentScale[targetDegree] - currentScale[scaleDegree] + 12) % 12;
            });
        } else {
            // Use forced quality intervals
            intervals = chordStructure.map(step => {
                switch(step) {
                    case 0: return 0;  // root
                    case 2: return qualityIntervals[this.currentQuality].third;  // third
                    case 4: return qualityIntervals[this.currentQuality].fifth;  // fifth
                    case 6: return qualityIntervals[this.currentQuality].seventh;  // seventh
                    case 8: return qualityIntervals[this.currentQuality].ninth;  // ninth
                    default: return 0;
                }
            });
        }

        // Generate the notes
        return intervals.map(interval => {
            const noteNum = (noteToNumber[baseNote] + interval) % 12;
            const octaveOffset = Math.floor((noteToNumber[baseNote] + interval) / 12);
            return `${numberToNote[noteNum]}${octave + octaveOffset}`;
        });
    }

    playChord(note, octave) {
        const notes = this.getChordNotes(note, octave);
        
        if (notes.length > 0) {
            // Remove existing playing highlights
            document.querySelectorAll('.key.playing').forEach(key => {
                key.classList.remove('playing');
            });

            // Add playing class to all keys in the chord
            notes.forEach(noteWithOctave => {
                const [noteName, noteOctave] = noteWithOctave.split(/(\d+)/);
                const key = document.querySelector(`.key[data-note="${noteName}${noteOctave}"]`);
                if (key) {
                    key.classList.add('playing');
                }
            });

            // Play the sound
            this.synth.releaseAll();
            this.synth.triggerAttack(notes);

            // Add to memory
            this.addToMemory(note, octave, notes);
        }

        this.clearTemporarySelections();
    }

    clearTemporarySelections() {
        this.tempOverride = null;
        document.querySelectorAll('#chord-type-buttons button').forEach(button => 
            button.classList.remove('selected'));
        // Remove override class when clearing temporary selections
        document.getElementById('keyboard').classList.remove('override-active');
    }

    stopChord() {
        this.synth.releaseAll();
        // Remove playing class from all keys
        document.querySelectorAll('.key.playing').forEach(key => {
            key.classList.remove('playing');
        });
        
        // Only clear override if no keys are being held
        if (!document.querySelector('.scale-key.active') && !this.activeOverrideKey) {
            this.clearTemporarySelections();
        }
    }

    updateInversionAvailability() {
        const maxInversion = {
            'triad': 2,
            'seventh': 3,
            'ninth': 4
        }[this.currentExtension];

        document.querySelectorAll('#inversion-buttons button').forEach((button, index) => {
            button.disabled = index > maxInversion;
            if (button.disabled && button.classList.contains('selected')) {
                // Reset to root position if current selection becomes invalid
                document.querySelector('#inversion-buttons button[data-value="0"]').classList.add('selected');
                button.classList.remove('selected');
                this.currentInversion = 0;
            }
        });
    }

    applyVoicing(notes) {
        if (notes.length < 3) return notes;

        const voicing = this.tempVoicing || this.currentVoicing;
        const noteToNumber = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };

        // Convert notes to numbers for easier manipulation
        let parsed = notes.map(note => {
            const [noteName, octave] = note.split(/(\d+)/);
            return {
                note: noteName,
                octave: parseInt(octave),
                value: noteToNumber[noteName] + (parseInt(octave) * 12)
            };
        });

        switch (voicing) {
            case 'close':
                // Already in close position, just return
                return notes;

            case 'open':
                // Spread the notes out by octaves
                for (let i = 1; i < parsed.length; i++) {
                    parsed[i].octave++;
                }
                break;

            case 'drop2':
                if (parsed.length >= 4) {
                    // Drop the second highest note down an octave
                    parsed[parsed.length - 2].octave--;
                }
                break;

            case 'drop3':
                if (parsed.length >= 4) {
                    // Drop the third highest note down an octave
                    parsed[parsed.length - 3].octave--;
                }
                break;

            case 'shell':
                // Keep only root, third, and seventh (if present)
                if (parsed.length >= 4) {
                    parsed = [parsed[0], parsed[1], parsed[3]]; // Root, 3rd, 7th
                }
                break;
        }

        // Sort by pitch
        parsed.sort((a, b) => a.value - b.value);

        // Convert back to note strings
        return parsed.map(p => `${p.note}${p.octave}`);
    }

    playMemoryChord(memory) {
        // Restore the chord state
        this.tempOverride = memory.override;
        this.currentExtension = memory.extension;
        this.currentInversion = memory.inversion;
        this.currentVoicing = memory.voicing;

        // Force override mode to bypass scale restrictions
        document.getElementById('keyboard').classList.add('override-active');

        // Generate and play the chord without adding to memory
        const notes = memory.notes;
        
        if (notes.length > 0) {
            // Clear existing playing highlights
            document.querySelectorAll('.key.playing').forEach(key => {
                key.classList.remove('playing');
            });

            // Add playing class to all keys in the chord
            notes.forEach(noteWithOctave => {
                const [noteName, noteOctave] = noteWithOctave.split(/(\d+)/);
                const key = document.querySelector(`.key[data-note="${noteName}${noteOctave}"]`);
                if (key) {
                    key.classList.add('playing');
                }
            });

            this.synth.releaseAll();
            this.synth.triggerAttack(notes);
        }
    }

    addToMemory(baseNote, octave, notes) {
        if (this.memoryLocked) return;

        // Create memory object
        const memory = {
            baseNote,
            octave,
            override: this.tempOverride,
            extension: this.currentExtension,
            inversion: this.currentInversion,
            voicing: this.currentVoicing,
            notes: notes
        };

        // Check if this exact chord configuration already exists in memory
        const isDuplicate = this.chordMemory.some(existing => 
            existing && 
            existing.notes.every((note, index) => note === memory.notes[index])
        );

        // Only add if it's not a duplicate
        if (!isDuplicate) {
            this.chordMemory.unshift(memory);
            this.chordMemory = this.chordMemory.slice(0, 16);
            this.updateMemorySlots();
        }
    }

    updateMemorySlots() {
        document.querySelectorAll('.memory-slot').forEach((slot, index) => {
            const memory = this.chordMemory[index];
            if (memory) {
                let chordType = memory.override;
                if (!chordType) {
                    chordType = this.getChordType(memory.notes, memory);
                }
                
                // Add shortcut hint
                const shortcutKeys = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I'];
                const shortcut = shortcutKeys[index % 8];
                
                const details = `<span class="shortcut">${shortcut}</span><span class="root">${memory.baseNote}</span>${chordType ? ' ' + chordType : ''}\n<span class="octave">oct ${memory.octave} - inv ${memory.inversion}</span>`;
                
                slot.innerHTML = details;
                slot.classList.remove('empty');
            } else {
                slot.textContent = '-';
                slot.classList.add('empty');
            }
        });
    }

    // Add this new method to check if a note is in the current scale
    isNotePlayable(note) {
        const modeIntervals = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            phrygian: [0, 1, 3, 5, 7, 8, 10],
            lydian: [0, 2, 4, 6, 7, 9, 11],
            mixolydian: [0, 2, 4, 5, 7, 9, 10],
            locrian: [0, 1, 3, 5, 6, 8, 10]
        };

        const noteToNumber = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };

        const keyOffset = noteToNumber[this.currentKey];
        const noteNum = (noteToNumber[note] - keyOffset + 12) % 12;
        return modeIntervals[this.currentMode].includes(noteNum);
    }

    // Add this new method
    setupTouchHandling() {
        const keyboard = document.getElementById('keyboard');
        
        // Only prevent default touch behaviors on the keyboard
        keyboard.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('key')) {
                e.preventDefault();
            }
        }, { passive: false });

        keyboard.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        keyboard.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('key')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Remove the global touch prevention
        // document.addEventListener('touchmove'...)
        // document.addEventListener('dblclick'...)
    }

    // Add new method to rebuild keyboard
    rebuildKeyboard() {
        const keyboard = document.getElementById('keyboard');
        keyboard.innerHTML = ''; // Clear existing keyboard
        this.setupKeyboard();
        this.updateKeyboardVisuals();
    }

    // Add new method
    setupThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Set initial theme based on user preference
        if (prefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            toggle.querySelector('.theme-toggle-icon').textContent = '🌜';
        }

        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            toggle.querySelector('.theme-toggle-icon').textContent = newTheme === 'dark' ? '🌜' : '🌞';
        });
    }

    updateScaleKeyboard() {
        const scaleKeyboard = document.getElementById('scale-keyboard');
        scaleKeyboard.innerHTML = '';

        const modeIntervals = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            phrygian: [0, 1, 3, 5, 7, 8, 10],
            lydian: [0, 2, 4, 6, 7, 9, 11],
            mixolydian: [0, 2, 4, 5, 7, 9, 10],
            locrian: [0, 1, 3, 5, 6, 8, 10]
        };

        const noteToNumber = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };

        const numberToNote = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const keyOffset = noteToNumber[this.currentKey];
        const currentScale = modeIntervals[this.currentMode];

        // Create scale keys
        const scaleKeys = [];
        const shortcuts = ['A', 'S', 'D', 'F', 'G', 'H', 'J'];
        
        currentScale.forEach((interval, index) => {
            const noteNum = (keyOffset + interval) % 12;
            const note = numberToNote[noteNum];
            
            const key = document.createElement('div');
            key.className = 'scale-key';
            key.textContent = note;
            key.setAttribute('data-shortcut', shortcuts[index]);
            
            // Store reference to scale key and note
            scaleKeys[index] = { element: key, note };
            
            // Mouse events only
            key.addEventListener('mousedown', () => {
                key.classList.add('active');
                this.playChord(note, this.baseOctave);
            });

            key.addEventListener('mouseup', () => {
                key.classList.remove('active');
                this.stopChord();
            });

            // Touch events
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                key.classList.add('active');
                this.playChord(note, this.baseOctave);
            }, { passive: false });

            key.addEventListener('touchend', (e) => {
                e.preventDefault();
                key.classList.remove('active');
                this.stopChord();
            }, { passive: false });

            scaleKeyboard.appendChild(key);
        });
    }

    setupOctaveKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Prevent key repeat

            if (e.key.toLowerCase() === 'z') {
                if (this.baseOctave > 2) {  // Limit lower octave
                    this.baseOctave--;
                    document.getElementById('octave-display').textContent = this.baseOctave;
                    this.updateKeyboardVisuals();
                }
            } else if (e.key.toLowerCase() === 'x') {
                if (this.baseOctave < 6) {  // Limit upper octave
                    this.baseOctave++;
                    document.getElementById('octave-display').textContent = this.baseOctave;
                    this.updateKeyboardVisuals();
                }
            }
        });
    }

    updateOverrideButtonsVisibility() {
        const buttons = document.querySelectorAll('#chord-type-buttons button');
        buttons.forEach((button, index) => {
            if (index >= this.overridePage * 8 && index < (this.overridePage + 1) * 8) {
                button.style.display = 'block';
            } else {
                button.style.display = 'none';
            }
        });
    }

    getChordType(notes, memory) {
        if (!notes || notes.length < 3) return '';

        const noteToNumber = {
            'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
            'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
        };

        // First un-invert the chord if needed
        let normalizedNotes = [...notes];
        if (memory && memory.inversion > 0) {
            // Extract octaves and note names
            let parsed = notes.map(note => {
                const [noteName, octave] = note.split(/(\d+)/);
                return {
                    note: noteName,
                    octave: parseInt(octave),
                    value: noteToNumber[noteName] + (parseInt(octave) * 12)
                };
            });

            // Move inverted notes down an octave
            for (let i = 0; i < memory.inversion; i++) {
                parsed[i].octave--;
            }

            // Sort by pitch
            parsed.sort((a, b) => a.value - b.value);

            // Convert back to note strings
            normalizedNotes = parsed.map(p => `${p.note}${p.octave}`);
        }

        // Extract just the note names and normalize to same octave
        const baseNotes = normalizedNotes.map(note => {
            const [noteName] = note.split(/(\d+)/);
            return noteName;
        });

        // Get root note number
        const rootNum = noteToNumber[baseNotes[0]];
        
        // Calculate intervals relative to root
        const intervals = baseNotes.map(note => {
            const num = noteToNumber[note];
            return (num - rootNum + 12) % 12;
        }).sort((a, b) => a - b);

        // Convert to interval string for pattern matching
        const intervalPattern = intervals.join(',');

        // Define common chord patterns
        const chordPatterns = {
            '0,4,7': 'maj',
            '0,3,7': 'min',
            '0,3,6': 'dim',
            '0,4,8': 'aug',
            '0,4,7,10': 'dom7',
            '0,4,7,11': 'maj7',
            '0,3,7,10': 'min7',
            '0,3,6,9': 'dim7',
            '0,4,7,10,14': 'dom9',
            '0,4,7,11,14': 'maj9',
            '0,3,7,10,14': 'min9',
            '0,2,7': 'sus2',
            '0,5,7': 'sus4',
            '0,4,7,9': 'maj6',
            '0,3,7,9': 'min6',
            '0,4,7,14': 'add9'
        };

        return chordPatterns[intervalPattern] || 'Custom';
    }

    updateMemoryButtonsVisibility() {
        const slots = document.querySelectorAll('.memory-slot');
        slots.forEach((slot, index) => {
            // Instead of hiding, just update opacity via class
            if (index >= this.memoryPage * 8 && index < (this.memoryPage + 1) * 8) {
                slot.classList.add('active-page');
            } else {
                slot.classList.remove('active-page');
            }
        });
    }

    handleKeyDown(e) {
        if (e.repeat) return;
        
        const key = e.key.toLowerCase();
        if (this.activeKeys.has(key)) return;
        this.activeKeys.add(key);

        // Scale keyboard shortcuts (A-J)
        const scaleKeyMap = {
            'a': 0, 's': 1, 'd': 2, 'f': 3,
            'g': 4, 'h': 5, 'j': 6
        };
        
        // Memory shortcuts (Q-I)
        const memoryKeyMap = {
            'q': 0, 'w': 1, 'e': 2, 'r': 3,
            't': 4, 'y': 5, 'u': 6, 'i': 7
        };

        // Handle override page switching
        if (key === '9') {
            this.overridePage = 0;
            this.updateOverrideButtonsVisibility();
            return;
        }
        if (key === '0') {
            this.overridePage = 1;
            this.updateOverrideButtonsVisibility();
            return;
        }

        // Handle memory page switching
        if (key === 'o') {
            this.memoryPage = 0;
            this.updateMemoryButtonsVisibility();
            return;
        }
        if (key === 'p') {
            this.memoryPage = 1;
            this.updateMemoryButtonsVisibility();
            return;
        }

        // Handle scale keys
        if (scaleKeyMap.hasOwnProperty(key)) {
            const index = scaleKeyMap[key];
            const scaleKey = document.querySelectorAll('.scale-key')[index];
            if (scaleKey) {
                scaleKey.classList.add('active');
                this.playChord(scaleKey.textContent, this.baseOctave);
            }
            return;
        }

        // Handle memory keys
        if (memoryKeyMap.hasOwnProperty(key)) {
            this.activeMemoryKey = key;
            const index = memoryKeyMap[key];
            const slotIndex = (this.memoryPage * 8) + index;
            const memory = this.chordMemory[slotIndex];
            
            if (memory) {
                const slot = document.querySelector(`.memory-slot[data-slot="${slotIndex}"]`);
                slot.classList.add('active');
                this.playMemoryChord(memory);
            }
            return;
        }

        // Handle override number keys (1-8)
        const num = parseInt(key);
        if (num >= 1 && num <= 8) {
            this.activeOverrideKey = key;
            const index = (this.overridePage * 8) + (num - 1);
            const button = document.querySelectorAll('#chord-type-buttons button')[index];
            if (button) {
                document.querySelectorAll('#chord-type-buttons button').forEach(b => 
                    b.classList.remove('selected'));
                button.classList.add('selected');
                this.tempOverride = button.dataset.value;
                document.getElementById('keyboard').classList.add('override-active');

                // If a scale key is currently active, replay it with the new override
                const activeScaleKey = document.querySelector('.scale-key.active');
                if (activeScaleKey) {
                    const note = activeScaleKey.textContent;
                    this.playChord(note, this.baseOctave);
                }
            }
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        this.activeKeys.delete(key);

        // Scale keyboard shortcuts
        const scaleKeyMap = {
            'a': 0, 's': 1, 'd': 2, 'f': 3,
            'g': 4, 'h': 5, 'j': 6
        };

        // Memory shortcuts
        const memoryKeyMap = {
            'q': 0, 'w': 1, 'e': 2, 'r': 3,
            't': 4, 'y': 5, 'u': 6, 'i': 7
        };

        // Handle scale keys
        if (scaleKeyMap.hasOwnProperty(key)) {
            const index = scaleKeyMap[key];
            const scaleKey = document.querySelectorAll('.scale-key')[index];
            if (scaleKey) {
                scaleKey.classList.remove('active');
                this.stopChord();
            }
        }

        // Handle memory keys
        if (key === this.activeMemoryKey) {
            const index = memoryKeyMap[key];
            const slotIndex = (this.memoryPage * 8) + index;
            const slot = document.querySelector(`.memory-slot[data-slot="${slotIndex}"]`);
            if (slot) {
                slot.classList.remove('active');
                this.stopChord();
            }
            this.activeMemoryKey = null;
        }

        // Handle override number keys
        if (key === this.activeOverrideKey) {
            if (!document.querySelector('.scale-key.active')) {
                document.querySelectorAll('#chord-type-buttons button').forEach(b => 
                    b.classList.remove('selected'));
                this.tempOverride = null;
                document.getElementById('keyboard').classList.remove('override-active');
            }
            this.activeOverrideKey = null;
        }
    }
}

// Initialize after the page loads
window.addEventListener('load', () => {
    new ChordGenerator();
}); 