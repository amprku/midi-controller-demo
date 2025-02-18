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
        this.chordMemory = new Array(8).fill(null);
        
        this.setupKeyboard();
        this.setupControls();
        this.updateKeyboardVisuals();
        
        // Add touch event handling for mobile
        this.setupTouchHandling();

        // Handle window resizing
        window.addEventListener('resize', () => {
            this.rebuildKeyboard();
        });

        // Initialize theme
        this.setupThemeToggle();
    }

    setupKeyboard() {
        const keyboard = document.getElementById('keyboard');
        // Determine number of octaves based on screen width
        const octaves = window.innerWidth <= 768 ? 1 : 2;
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const whiteNotes = notes.filter(note => !note.includes('#'));
        const blackNotes = notes.filter(note => note.includes('#'));
        
        // First create all white keys
        for (let octave = 0; octave < octaves; octave++) {
            whiteNotes.forEach(note => {
                const key = document.createElement('div');
                key.className = 'key white';
                key.dataset.note = `${note}${octave}`;
                keyboard.appendChild(key);

                // Add mousedown handler with scale check
                key.addEventListener('mousedown', () => {
                    if (this.isNotePlayable(note) || this.tempOverride) {
                        this.playChord(note, this.baseOctave + octave);
                    }
                });
                key.addEventListener('mouseup', () => this.stopChord());

                // Add touch handlers for white keys
                key.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (this.isNotePlayable(note) || this.tempOverride) {
                        key.classList.add('active');
                        this.playChord(note, this.baseOctave + octave);
                    }
                }, { passive: false });

                key.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    key.classList.remove('active');
                    this.stopChord();
                }, { passive: false });
            });
        }

        // Then create and position black keys
        let whiteKeyWidth = 100 / (whiteNotes.length * octaves); // percentage width of each white key
        let blackKeyIndex = 0;
        
        for (let octave = 0; octave < octaves; octave++) {
            const octaveOffset = (octave) * whiteNotes.length * whiteKeyWidth;
            
            // C#
            this.createBlackKey(keyboard, 'C#', octave, octaveOffset + whiteKeyWidth * 1);
            // D#
            this.createBlackKey(keyboard, 'D#', octave, octaveOffset + whiteKeyWidth * 2);
            // F#
            this.createBlackKey(keyboard, 'F#', octave, octaveOffset + whiteKeyWidth * 4);
            // G#
            this.createBlackKey(keyboard, 'G#', octave, octaveOffset + whiteKeyWidth * 5);
            // A#
            this.createBlackKey(keyboard, 'A#', octave, octaveOffset + whiteKeyWidth * 6);
        }

        // Add keyboard event listeners
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Prevent key repeat from retriggering
            const key = keyboard.querySelector(`[data-note="${e.key.toUpperCase()}4"]`);
            if (key) {
                key.classList.add('active');
                this.playChord(e.key.toUpperCase(), 4);
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = keyboard.querySelector(`[data-note="${e.key.toUpperCase()}4"]`);
            if (key) {
                key.classList.remove('active');
                this.stopChord();
            }
        });
    }

    createBlackKey(keyboard, note, octave, leftPosition) {
        const key = document.createElement('div');
        key.className = 'key black';
        key.dataset.note = `${note}${octave}`;
        key.style.left = `${leftPosition}%`;
        keyboard.appendChild(key);

        // Mouse events
        key.addEventListener('mousedown', () => {
            if (this.isNotePlayable(note) || this.tempOverride) {
                key.classList.add('active');
                this.playChord(note, this.baseOctave + octave);
            }
        });

        key.addEventListener('mouseup', () => {
            key.classList.remove('active');
            this.stopChord();
        });

        key.addEventListener('mouseleave', () => {
            if (key.classList.contains('active')) {
                key.classList.remove('active');
                this.stopChord();
            }
        });

        // Touch events
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.isNotePlayable(note) || this.tempOverride) {
                key.classList.add('active');
                this.playChord(note, this.baseOctave + octave);
            }
        }, { passive: false });

        key.addEventListener('touchend', (e) => {
            e.preventDefault();
            key.classList.remove('active');
            this.stopChord();
        }, { passive: false });

        key.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            key.classList.remove('active');
            this.stopChord();
        }, { passive: false });
    }

    setupControls() {
        // Scale & Mode controls
        document.getElementById('key-select').addEventListener('change', (e) => {
            this.currentKey = e.target.value;
            this.updateKeyboardVisuals();
        });

        document.getElementById('mode-select').addEventListener('change', (e) => {
            this.currentMode = e.target.value;
            this.updateKeyboardVisuals();
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
            if (this.baseOctave > 2) {  // Limit lower octave
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
        // Generate and play the chord
        const notes = this.getChordNotes(note, octave);
        
        // Only play if we have notes
        if (notes.length > 0) {
            // First remove any existing playing highlights
            document.querySelectorAll('.key.playing').forEach(key => {
                key.classList.remove('playing');
            });

            // Add playing class to all keys in the chord
            notes.forEach(noteWithOctave => {
                const [noteName, noteOctave] = noteWithOctave.split(/(\d+)/);
                const relativeOctave = noteOctave - this.baseOctave;
                const key = document.querySelector(`.key[data-note="${noteName}${relativeOctave}"]`);
                if (key) {
                    key.classList.add('playing');
                }
            });

            this.synth.releaseAll();
            this.synth.triggerAttack(notes);
        }

        // Clear temporary selections after playing
        this.clearTemporarySelections();

        // Add to memory (now storing both scale and override chords)
        this.addToMemory(note, octave, notes);
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
        this.clearTemporarySelections();
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
        const notes = this.getChordNotes(memory.baseNote, memory.octave);
        
        if (notes.length > 0) {
            // Clear existing playing highlights
            document.querySelectorAll('.key.playing').forEach(key => {
                key.classList.remove('playing');
            });

            // Add playing class to all keys in the chord
            notes.forEach(noteWithOctave => {
                const [noteName, noteOctave] = noteWithOctave.split(/(\d+)/);
                const relativeOctave = noteOctave - this.baseOctave;
                const key = document.querySelector(`.key[data-note="${noteName}${relativeOctave}"]`);
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
            existing.baseNote === memory.baseNote &&
            existing.octave === memory.octave &&
            existing.override === memory.override &&
            existing.extension === memory.extension &&
            existing.inversion === memory.inversion &&
            existing.voicing === memory.voicing
        );

        // Only add if it's not a duplicate
        if (!isDuplicate) {
            this.chordMemory.unshift(memory);
            this.chordMemory = this.chordMemory.slice(0, 8);
            this.updateMemorySlots();
        }
    }

    updateMemorySlots() {
        document.querySelectorAll('.memory-slot').forEach((slot, index) => {
            const memory = this.chordMemory[index];
            if (memory) {
                const chordName = memory.override ? memory.override : 'Scale';
                const inversionNames = ['Root', '1st', '2nd', '3rd', '4th'];
                const details = [
                    `${memory.baseNote} ${chordName}`,
                    memory.override ? '' : memory.extension,
                    `${memory.voicing} voicing`,
                    `${inversionNames[memory.inversion]} inv`,
                    `oct ${memory.octave}`
                ].filter(line => line !== '').join('\n');
                
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
}

// Initialize after the page loads
window.addEventListener('load', () => {
    new ChordGenerator();
}); 