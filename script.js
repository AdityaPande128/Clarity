const startButton = document.getElementById('startButton');
const callContainer = document.getElementById('call-container');
const transcriptLog = document.getElementById('transcript-log');
const alertsLog = document.getElementById('alerts-log');

const pressureRegex = /(act now|limited time|only one left|don't wait|offer expires|final notice|your account is suspended|immediate payment|must verify|bank details)/i;
let detectedPhrases = new Set();

let isCallActive = false;
let recognition;
let interim_transcript = '';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function setupSpeechRecognition() {
    if (!SpeechRecognition) {
        transcriptLog.innerHTML = '<p class="log-entry system error">Error: Speech Recognition is not supported by this browser. Please use Chrome, Edge, or Safari.</p>';
        startButton.disabled = true;
        startButton.textContent = 'Speech Recognition Not Supported';
        return false;
    }
    
    recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
        let final_transcript = '';
        interim_transcript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript_part = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                final_transcript += transcript_part.trim() + ' ';
            } else {
                interim_transcript += transcript_part;
            }
        }
        
        if (final_transcript) {
            addTranscript(final_transcript);
        }
        
        updateInterimTranscript(interim_transcript);
    };

    recognition.onend = () => {
        if (isCallActive) {
            try {
                recognition.start();
            } catch(e) {
                console.error("Error restarting recognition:", e);
            }
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            errorMessage = 'Error: Microphone permission was denied. Please allow access and try again.';
        } else if (event.error === 'network') {
            errorMessage = 'Error: A network error occurred. Please check your connection.';
        } else if (event.error === 'audio-capture') {
            errorMessage = 'Error: No audio was detected. Please check your microphone.';
        } else if (event.error === 'aborted') {
            errorMessage = 'Speech recognition was aborted.';
        } else if (event.error === 'no-speech') {
            console.warn('Speech recognition: no-speech error.');
            return;
        } else {
            errorMessage = `An unexpected error occurred: "${event.error}". Please try again.`;
        }
        
        transcriptLog.innerHTML = `<p class="log-entry system error">${errorMessage}</p>`;
    };
    
    return true;
}

function toggleCall() {
    isCallActive = !isCallActive;

    if (isCallActive) {
        startButton.textContent = 'Stop Call Analysis';
        callContainer.style.display = 'grid';

        transcriptLog.innerHTML = '<p class="log-entry system">Connecting...</p>';
        alertsLog.innerHTML = '<p class="log-entry system">Alerts will appear here.</p>';

        detectedPhrases.clear();
        
        if (!recognition) {
            if (!setupSpeechRecognition()) {
                isCallActive = false;
                startButton.textContent = 'Start Call Analysis';
                callContainer.style.display = 'none';
                return;
            }
        }
        
        startCall();

    } else {
        startButton.textContent = 'Start Call Analysis';
        callContainer.style.display = 'none';

        stopCall();
    }
}

async function startCall() {
    try {
        
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        transcriptLog.innerHTML = '<p class="log-entry system">Connected. Start speaking...</p>';
        recognition.start();

    } catch (error) {
        console.error('Error accessing microphone:', error);
        transcriptLog.innerHTML = '<p class="log-entry system error">Error: Could not access microphone. Please grant permission and try again.</p>';
    }
}

function stopCall() {
    if (recognition) {
        recognition.stop();
    }
    
    if (transcriptLog.innerHTML.includes('...')) {
        transcriptLog.innerHTML = '<p class="log-entry system">Call ended.</p>';
    } else {
        transcriptLog.innerHTML += '<p class="log-entry system">Call ended.</p>';
    }
}

function addTranscript(text) {
    const firstEntry = transcriptLog.querySelector('.system');
    if (firstEntry) {
        transcriptLog.innerHTML = '';
    }

    const lastInterim = transcriptLog.querySelector('.interim');
    if (lastInterim) {
        lastInterim.remove();
    }

    const p = document.createElement('p');
    p.className = 'log-entry transcript';
    p.textContent = text;
    
    transcriptLog.appendChild(p);
    transcriptLog.scrollTop = transcriptLog.scrollHeight;

    checkTranscriptForPressure(text);
}

function updateInterimTranscript(text) {
    if (!text) {
        return;
    }
    
    const firstEntry = transcriptLog.querySelector('.system');
    if (firstEntry) {
        transcriptLog.innerHTML = '';
    }
    
    let interimEl = transcriptLog.querySelector('.interim');
    
    if (interimEl) {
        interimEl.textContent = text;
    } else {
        interimEl = document.createElement('p');
        interimEl.className = 'log-entry system interim';
        interimEl.textContent = text;
        transcriptLog.appendChild(interimEl);
    }
    
    transcriptLog.scrollTop = transcriptLog.scrollHeight;
}

function checkTranscriptForPressure(text) {
    const match = text.match(pressureRegex);
    if (match) {
        const matchedPhrase = match[0].toLowerCase();
        
        if (!detectedPhrases.has(matchedPhrase)) {
            detectedPhrases.add(matchedPhrase);
            addAlert('yellow', 'Pressure Tactic Detected', `The phrase "${matchedPhrase}" was detected. Analyzing context...`);
        }
    }
}

function addAlert(type, title, message) {
    const firstEntry = alertsLog.querySelector('.system');
    if (firstEntry) {
        alertsLog.innerHTML = '';
    }

    const alertCard = document.createElement('div');
    alertCard.className = `alert-card ${type}`;

    let iconSvg = '';
    if (type === 'yellow') {
        iconSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon ${type}">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        `;
    }
    
    alertCard.innerHTML = `
        ${iconSvg}
        <div class="alert-content">
            <p class="alert-title">${title}</p>
            <p class="alert-message">${message}</p>
        </div>
    `;
    
    alertsLog.appendChild(alertCard);
    alertsLog.scrollTop = alertsLog.scrollHeight;
}

if (startButton) {
    startButton.addEventListener('click', toggleCall);
} else {
    console.error('Fatal Error: startButton not found.');
}