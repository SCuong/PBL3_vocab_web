export const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
        console.warn('Speech Synthesis API not supported in this browser');
        return;
    }

    try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Error with speech synthesis:', error);
    }
};

export const playPronunciationAudio = (audioUrl?: string, fallbackText?: string) => {
    if (audioUrl && audioUrl.trim()) {
        const audio = new Audio(audioUrl);

        audio.onerror = () => {
            console.error(`Failed to load audio from: ${audioUrl}`);
            if (fallbackText && 'speechSynthesis' in window) {
                speakText(fallbackText);
            }
        };

        void audio.play().catch((error) => {
            console.error(`Failed to play audio from ${audioUrl}:`, error);
            if (fallbackText && 'speechSynthesis' in window) {
                speakText(fallbackText);
            }
        });
        return;
    }

    if (fallbackText && 'speechSynthesis' in window) {
        speakText(fallbackText);
    } else if (!fallbackText) {
        console.warn('No audio URL or fallback text provided');
    }
};
