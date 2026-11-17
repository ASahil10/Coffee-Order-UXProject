// voice.js

// Initialize Web Speech API for both recognition and synthesis
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;

let recognition = null;
let isSpeaking = false;
let isPaused = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        if (isPaused) {
            recognition.abort();
            return;
        }
        if (window.setAvatarState) window.setAvatarState('listening');
    };

    recognition.onresult = (event) => {
        if (isPaused) return;
        const transcript = event.results[0][0].transcript;
        
        // Hand off transcript to the interface so users can inspect/edit before sending
        if (window.receiveVoiceTranscript) {
            window.receiveVoiceTranscript(transcript);
        }
    };

    recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            if (window.showNotice) window.showNotice('Microphone access denied. Please allow microphone permissions in your browser settings.');
        } else if (event.error !== 'aborted') {
            if (window.showNotice) window.showNotice(`Microphone error: ${event.error}. Please try again.`);
        }
        if (window.setAvatarState) window.setAvatarState('waiting');
    };

    recognition.onend = () => {
        // Return to waiting state unless the bot is actively speaking or paused
        if (!isSpeaking && !isPaused && window.setAvatarState) {
            window.setAvatarState('waiting');
        }
    };
} else {
    // Graceful degradation for unsupported browsers
    if (window.showNotice) {
        window.showNotice('Speech recognition is not supported in this browser. Please use Chrome or Edge, or use text input.');
    }
}

// Exposed function for interface.js to trigger the microphone
window.startVoiceInput = function() {
    if (isPaused) return;
    
    // Prevent recording the avatar's own voice
    if (isSpeaking) {
        if (window.showNotice) window.showNotice('Please wait until Barista Bean finishes speaking.');
        return;
    }
    
    if (recognition) {
        try {
            recognition.start();
        } catch (e) {
            console.warn("Recognition is already running.", e);
        }
    }
};

// Exposed function for conversation.js to make the avatar speak
window.speak = function(text) {
    if (isPaused) return;
    
    // Ensure all spoken replies are visible in the chat log
    if (window.displayMessage) {
        window.displayMessage(text, 'avatar');
    }

    if (!synth) {
        if (window.showNotice) window.showNotice('Text-to-speech is not supported in this browser.');
        if (window.setAvatarState) window.setAvatarState('waiting');
        return;
    }

    // Abort active listening to prevent self-recording, and cancel any queued speech
    if (recognition) recognition.abort();
    synth.cancel(); 

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
        isSpeaking = true;
        if (window.setAvatarState) window.setAvatarState('speaking');
    };

    utterance.onend = () => {
        isSpeaking = false;
        if (!isPaused && window.setAvatarState) window.setAvatarState('waiting');
    };

    utterance.onerror = (event) => {
        isSpeaking = false;
        console.error('Speech synthesis error:', event);
        if (!isPaused && window.setAvatarState) window.setAvatarState('waiting');
    };

    synth.speak(utterance);
};

// Custom event listeners for pause and restart hooks
document.addEventListener('bean:pause', (event) => {
    isPaused = event.detail.paused;
    if (isPaused) {
        if (recognition) recognition.abort();
        if (synth) synth.cancel();
        isSpeaking = false;
    }
});

document.addEventListener('bean:restart', () => {
    if (recognition) recognition.abort();
    if (synth) synth.cancel();
    isSpeaking = false;
    isPaused = false;
});