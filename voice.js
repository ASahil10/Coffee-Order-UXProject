// voice.js

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;

let recognition = null;
let isSpeaking = false;
let isPaused = false;
let speakEnabled = true; 
let currentlyListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    // Enable interim results so Person 1's live transcript feature works!
    recognition.interimResults = true; 
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        if (isPaused) { recognition.abort(); return; }
        currentlyListening = true;
        if (window.setMicActive) window.setMicActive(true);
        if (window.setAvatarState) window.setAvatarState('listening');
    };

    recognition.onresult = (event) => {
        if (isPaused) return;
        
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        // Send final text to submit, or interim text to show what Bean is hearing
        if (finalTranscript && window.receiveVoiceTranscript) {
            window.receiveVoiceTranscript(finalTranscript);
        } else if (interimTranscript && window.showLiveTranscript) {
            window.showLiveTranscript(interimTranscript);
        }
    };

    recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            if (window.showNotice) window.showNotice('Microphone access denied. Please allow microphone permissions.');
        } else if (event.error !== 'aborted') {
            if (window.showNotice) window.showNotice(`Microphone error: ${event.error}. Please try again.`);
        }
        currentlyListening = false;
        if (window.setMicActive) window.setMicActive(false);
        if (window.setAvatarState) window.setAvatarState('waiting');
    };

    recognition.onend = () => {
        currentlyListening = false;
        if (window.setMicActive) window.setMicActive(false);
        if (!isSpeaking && !isPaused && window.setAvatarState) {
            window.setAvatarState('waiting');
        }
    };
} else {
    if (window.showNotice) {
        window.showNotice('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }
}

// --- NEW HOOKS FOR PERSON 1'S UPGRADED UI ---

window.isListening = function() {
    return currentlyListening;
};

window.startVoiceInput = function() {
    if (isPaused) return;
    if (isSpeaking) {
        if (window.showNotice) window.showNotice('Please wait until Barista Bean finishes speaking.');
        return;
    }
    if (recognition) {
        try { recognition.start(); } catch (e) { console.warn("Recognition already running."); }
    }
};

window.stopVoiceInput = function() {
    if (recognition) recognition.abort();
};

window.stopAllVoice = function() {
    if (recognition) recognition.abort();
    if (synth) synth.cancel();
};

window.setSpeakEnabled = function(enabled) {
    speakEnabled = enabled;
    if (!enabled && synth) synth.cancel(); // Instantly mute if currently talking
};

// --------------------------------------------

window.speak = function(text) {
    if (isPaused || !speakEnabled) return;
    
    if (!synth) {
        if (window.showNotice) window.showNotice('Text-to-speech is not supported in this browser.');
        if (window.setAvatarState) window.setAvatarState('waiting');
        return;
    }

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
        if (!isPaused && window.setAvatarState) window.setAvatarState('waiting');
    };

    synth.speak(utterance);
};

document.addEventListener('bean:pause', (event) => {
    isPaused = event.detail.paused;
    if (isPaused) {
        if (recognition) recognition.abort();
        if (synth) synth.cancel();
        isSpeaking = false;
        currentlyListening = false;
    }
});

document.addEventListener('bean:restart', () => {
    if (recognition) recognition.abort();
    if (synth) synth.cancel();
    isSpeaking = false;
    isPaused = false;
    currentlyListening = false;
});