import { getDefaultAudioSpeed } from './learningPreferences';

let activeAudio: HTMLAudioElement | null = null;
let activeCleanup: (() => void) | null = null;

export const stopPronunciationAudio = () => {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio.src = '';
        activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    const prevCleanup = activeCleanup;
    activeCleanup = null;
    prevCleanup?.();
};

const NEURAL_CLIP_MAP: Record<string, string> = {
    'itinerary': '/audio/word-itinerary.mp3',
    'boarding pass': '/audio/word-boarding-pass.mp3',
    'destination': '/audio/word-destination.mp3',
    'departure': '/audio/word-departure.mp3',
    'luggage': '/audio/word-luggage.mp3',
};

export const speakText = (text: string, onEnd?: () => void, playbackRate: number = 1) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('Speech Synthesis API not supported in this browser');
        onEnd?.();
        return;
    }

    try {
        const clampedRate = Math.min(1.5, Math.max(0.5, playbackRate));
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = Number((0.92 * clampedRate).toFixed(2));
        utterance.pitch = 1;
        utterance.volume = 1;

        const voices = window.speechSynthesis.getVoices();
        const preferred =
            voices.find(v => /Natural|Online|Google US English|Ava|Aria|Jenny|Emma/i.test(v.name) && v.lang.startsWith('en')) ||
            voices.find(v => v.lang === 'en-US');
        if (preferred) utterance.voice = preferred;

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            window.clearTimeout(fallbackTimer);
            if (activeCleanup === finish) activeCleanup = null;
            onEnd?.();
        };

        const fallbackTimer = window.setTimeout(
            finish,
            Math.min(10000, Math.max(1800, Math.round((text.length * 115) / clampedRate))),
        );
        utterance.onend = finish;
        utterance.onerror = finish;

        activeCleanup = finish;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Error with speech synthesis:', error);
        onEnd?.();
    }
};

export const playPronunciationAudio = (
    audioUrl?: string,
    fallbackText?: string,
    onEnd?: () => void,
    playbackRate?: number,
) => {
    stopPronunciationAudio();
    const resolvedRate = playbackRate ?? getDefaultAudioSpeed();
    const clampedRate = Math.min(1.5, Math.max(0.5, resolvedRate));

    const trimmedUrl = audioUrl?.trim();
    const mappedNeuralUrl = !trimmedUrl && fallbackText ? NEURAL_CLIP_MAP[fallbackText.trim().toLowerCase()] : undefined;
    const resolvedUrl = trimmedUrl || mappedNeuralUrl;

    if (resolvedUrl) {
        const audio = new Audio(resolvedUrl);
        audio.playbackRate = clampedRate;
        activeAudio = audio;

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            if (activeAudio === audio) activeAudio = null;
            if (activeCleanup === finish) activeCleanup = null;
            onEnd?.();
        };

        const fallback = () => {
            if (finished) return;
            if (activeAudio === audio) activeAudio = null;
            if (fallbackText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                speakText(fallbackText, finish, clampedRate);
            } else {
                finish();
            }
        };

        activeCleanup = finish;
        audio.onended = finish;
        audio.onerror = () => {
            console.error(`Failed to load audio from: ${audioUrl}`);
            fallback();
        };

        void audio.play().catch((error) => {
            console.error(`Failed to play audio from ${audioUrl}:`, error);
            fallback();
        });
        return;
    }

    if (fallbackText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speakText(fallbackText, onEnd, clampedRate);
    } else {
        if (!fallbackText) {
            console.warn('No audio URL or fallback text provided');
        }
        onEnd?.();
    }
};
