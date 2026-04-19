import { ArrowLeft, Volume2 } from 'lucide-react';
import { playPronunciationAudio } from '../utils/audio';
import { Badge, Button } from '../components/ui';

const VocabDetail = ({ word, onBack }: any) => {
    if (!word) return null;

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <Button variant="ghost" className="mb-8" onClick={onBack}><ArrowLeft size={18} /> Quay lại</Button>
            <div className="glass-card p-12 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <div className="text-center md:text-left">
                        <Badge variant="cyan" className="mb-4">{word.cefr}</Badge>
                        <h1 className="text-6xl mb-2">{word.word}</h1>
                        <p className="text-2xl text-text-muted font-mono mb-8">{word.transcription}</p>
                        <Button variant="primary" className="text-lg px-8" onClick={() => playPronunciationAudio(word.audioUrl, word.word)}><Volume2 size={24} /> Nghe phát âm</Button>
                    </div>
                    <div className="flex-1 bg-white/50 p-8 rounded-card border-2 border-primary/10 shadow-sm">
                        <h3 className="text-xl font-bold mb-4 text-primary">Ý nghĩa</h3>
                        <p className="text-xl mb-8 leading-relaxed">{word.meaning}</p>
                        <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-xl font-bold text-purple">Ví dụ</h3>
                            <Button variant="ghost" className="p-2 min-h-0 rounded-full" onClick={() => playPronunciationAudio(word.exampleAudioUrl, word.example)}><Volume2 size={16} /></Button>
                        </div>
                        <p className="text-lg italic text-text-secondary leading-relaxed font-serif">"{word.example}"</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VocabDetail;
