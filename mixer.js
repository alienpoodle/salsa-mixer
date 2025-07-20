// Ensure Tone.js is loaded before proceeding
if (typeof Tone === 'undefined') {
    console.error('Tone.js is not loaded. Please check the CDN link.');
}

// Initialize Tone.js context on user interaction
// This is a fallback and good practice, but the main start will now be in togglePlayPause
document.documentElement.addEventListener('mousedown', () => {
    if (Tone.context.state !== 'running') {
        Tone.start();
        console.log('AudioContext started via document mousedown');
    }
});

// Instrument definitions with local WAV file paths
// IMPORTANT: Ensure these paths are correct relative to where your HTML file is served from.
// For example, if your WAV files are in a folder named 'audio' next to your HTML,
// you would use 'audio/clave.wav', 'audio/conga.wav', etc.
const instruments = [
    { name: 'Clave', url: 'clave.wav' },
    { name: 'Conga', url: 'conga.wav' },
    { name: 'Bass', url: 'bass.wav' },
    { name: 'Piano', url: 'piano.wav' },
    { name: 'Maracas', url: 'maracas.wav' },
    { name: 'Guiro', url: 'guiro.wav' },
    { name: 'Trumpet', url: 'trumpet.wav' },
    { name: 'Trombone', url: 'trombone.wav' },
    { name: 'Vocals', url: 'vocals.wav' }
];

const players = {}; // Stores Tone.Player instances for each instrument
const instrumentButtons = {}; // Stores references to instrument UI buttons
const instrumentStates = {}; // Tracks active/muted state for each instrument (true = audible, false = muted)
let currentBeat = 0;
const totalBeats = 8; // Basic salsa rhythm usually cycles on 8 beats
let beatLoop; // Tone.Loop instance for the beat counter

// Get references to DOM elements
const instrumentControlsDiv = document.getElementById('instrument-controls');
const playPauseBtn = document.getElementById('play-pause-btn');
const playPauseText = document.getElementById('play-pause-text');
const volumeSlider = document.getElementById('volume-slider');
const beatDisplayDiv = document.getElementById('beat-display');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const messageBoxOkBtn = document.getElementById('message-box-ok-btn'); // This line gets the element

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 */
function showMessageBox(message) {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
}

/**
 * Hides the custom message box.
 */
function hideMessageBox() {
    messageBox.classList.add('hidden');
}

// Event listener for the message box OK button - MOVED TO window.onload
// messageBoxOkBtn.addEventListener('click', hideMessageBox);


/**
 * Initializes the audio players for each instrument.
 * Sets up the master volume control.
 */
async function initializeAudio() {
    // Create a master volume control
    const masterVolume = new Tone.Volume(volumeSlider.value).toDestination();

    // Load each instrument's audio
    for (const instrument of instruments) {
        try {
            const player = new Tone.Player({
                url: instrument.url,
                loop: true, // Set to true for continuous looping
                autostart: false, // We will manually start/pause with the transport
                volume: 0 // Default volume, will be set to -Infinity if muted
            }).connect(masterVolume);

            // Wait for the buffer to load
            await player.loaded; // This ensures the audio data is fetched and decoded
            players[instrument.name] = player;
            instrumentStates[instrument.name] = true; // All active (audible) by default initially
            console.log(`Loaded ${instrument.name} from ${instrument.url}`);
        } catch (e) {
            console.error(`Error loading ${instrument.name} from ${instrument.url}:`, e);
            showMessageBox(`Failed to load audio for ${instrument.name}. Please ensure '${instrument.url}' is in the correct folder and accessible.`);
            // Set instrument state to false if loading fails
            instrumentStates[instrument.name] = false;
            // Optionally disable the button for this instrument
            if (instrumentButtons[instrument.name]) {
                instrumentButtons[instrument.name].disabled = true;
                instrumentButtons[instrument.name].classList.remove('active');
                instrumentButtons[instrument.name].classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }

    // Set initial master volume
    masterVolume.volume.value = parseFloat(volumeSlider.value);
    volumeSlider.addEventListener('input', (e) => {
        masterVolume.volume.value = parseFloat(e.target.value);
    });

    // Set the global transport BPM
    Tone.Transport.bpm.value = 180; // Example BPM for salsa (adjust as needed)
    Tone.Transport.loop = true; // Loop the entire transport
    // Set loopEnd based on a common musical phrase, e.g., 2 measures (8 eighth notes)
    Tone.Transport.loopEnd = '2m';

    let beatCounter = 0; // Internal counter for 8th notes (0-7)
    // Create the main loop for the salsa rhythm beat counter (for visual display)
    beatLoop = new Tone.Loop(time => {
        // currentBeat is 1-indexed for display
        currentBeat = (beatCounter % totalBeats) + 1;
        updateBeatDisplay(currentBeat);
        beatCounter = (beatCounter + 1) % totalBeats; // Increment beat counter
    }, "8n").start(0); // "8n" means trigger every eighth note
}

/**
 * Creates the UI buttons for each instrument.
 */
function createInstrumentButtons() {
    instruments.forEach(instrument => {
        const button = document.createElement('button');
        button.id = `btn-${instrument.name.toLowerCase()}`;
        button.textContent = instrument.name;
        button.classList.add(
            'instrument-button',
            'px-6', 'py-3', 'rounded-xl', 'text-lg', 'font-semibold',
            'shadow-md', 'hover:shadow-lg', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-300',
            'active' // Start active (unmuted) by default
        );
        button.dataset.instrument = instrument.name;
        button.addEventListener('click', () => toggleInstrument(instrument.name));
        instrumentControlsDiv.appendChild(button);
        instrumentButtons[instrument.name] = button;
    });
}

/**
 * Creates the visual beat indicators.
 */
function createBeatIndicators() {
    for (let i = 1; i <= totalBeats; i++) {
        const beatSpan = document.createElement('span');
        beatSpan.id = `beat-${i}`;
        beatSpan.textContent = i;
        beatSpan.classList.add('beat-indicator');
        beatDisplayDiv.appendChild(beatSpan);
    }
}

/**
 * Toggles the mute state (volume) of an instrument.
 * @param {string} instrumentName - The name of the instrument.
 */
function toggleInstrument(instrumentName) {
    const player = players[instrumentName];
    const button = instrumentButtons[instrumentName];

    // Only toggle if the instrument was successfully loaded and is not disabled
    if (player && !button.disabled) {
        instrumentStates[instrumentName] = !instrumentStates[instrumentName]; // Toggle state

        if (instrumentStates[instrumentName]) {
            player.volume.value = 0; // Set to audible volume
            button.classList.add('active');
        } else {
            player.volume.value = -Infinity; // Mute (effectively silent)
            button.classList.remove('active');
        }
    }
}

/**
 * Updates the visual display of the current beat.
 * @param {number} beat - The current beat number.
 */
function updateBeatDisplay(beat) {
    document.querySelectorAll('.beat-indicator').forEach(indicator => {
        indicator.classList.remove('current');
    });
    const currentBeatElement = document.getElementById(`beat-${beat}`);
    if (currentBeatElement) {
        currentBeatElement.classList.add('current');
    }
}

/**
 * Toggles the main play/pause state of the song.
 * Made async to allow awaiting Tone.start()
 */
async function togglePlayPause() {
    if (Tone.Transport.state === 'started') {
        Tone.Transport.pause(); // Pause the global transport
        playPauseText.textContent = 'Play';
        // Pause all individual players that are currently playing
        Object.values(players).forEach(player => {
            if (player.isPlaying) {
                player.pause();
            }
        });
    } else {
        // Crucial: Ensure AudioContext is running before starting transport and players
        if (Tone.context.state !== 'running') {
            await Tone.start(); // Wait for AudioContext to resume/start
            console.log('AudioContext resumed from togglePlayPause');
        }

        Tone.Transport.start(); // Start the global transport
        playPauseText.textContent = 'Pause';
        // Start all individual players (if they are not already playing)
        // This ensures they start in sync with the transport
        Object.values(players).forEach(player => {
            // Only start if not playing AND is active (not muted)
            if (!player.isPlaying && instrumentStates[player.name]) {
                player.start();
            }
        });
    }
}

// Event listener for the main play/pause button
playPauseBtn.addEventListener('click', togglePlayPause);

// Initialize the app when the window loads
window.onload = async () => {
    createInstrumentButtons();
    createBeatIndicators();
    await initializeAudio(); // Wait for audio to be initialized

    // Set initial state for instrument buttons (all active/unmuted by default)
    instruments.forEach(instrument => {
        const button = instrumentButtons[instrument.name];
        if (button) {
            // Check if the instrument was successfully loaded before setting active
            if (instrumentStates[instrument.name]) {
                button.classList.add('active');
                // Ensure the player's volume is audible if it's active
                if (players[instrument.name]) {
                    players[instrument.name].volume.value = 0;
                }
            } else {
                button.classList.remove('active');
                button.disabled = true; // Disable button if audio failed to load
                button.classList.add('opacity-50', 'cursor-not-allowed');
                // Ensure the player's volume is muted if it failed to load
                if (players[instrument.name]) {
                    players[instrument.name].volume.value = -Infinity;
                }
            }
        }
    });
    updateBeatDisplay(1); // Highlight the first beat initially

    // Attach message box OK button listener here, after the DOM is ready
    messageBoxOkBtn.addEventListener('click', hideMessageBox);
};
