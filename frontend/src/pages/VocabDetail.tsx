import { useState } from 'react';
import { ArrowLeft, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { playPronunciationAudio } from '../utils/audio';
import { Badge, Button } from '../components/ui';

const VocabDetail = ({ word, onBack }: any) => {
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    if (!word) return null;

    const handleAskAi = async () => {
        setIsLoadingAi(true);
        setAiResponse(null);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
            const formData = new FormData();
            formData.append('word', word.word);
            formData.append('context', word.meaning);

            const response = await fetch('/api/AI/Explain', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            if (response.ok) {
                const htmlContent = await response.text();
                setAiResponse(htmlContent);
            } else {
                setAiResponse(`<div class='text-red-500'>Lỗi ${response.status}: Không thể gọi AI. Vui lòng thử lại.</div>`);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setAiResponse("<div class='text-red-500'>Hết thời gian chờ (30s). Kiểm tra kết nối hoặc thử lại.</div>");
            } else {
                setAiResponse(`<div class='text-red-500'>Lỗi kết nối: ${error.message}</div>`);
            }
        } finally {
            clearTimeout(timeoutId);
            setIsLoadingAi(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <Button variant="ghost" className="mb-8" onClick={onBack}><ArrowLeft size={18} /> Quay lại</Button>
            <div className="glass-card p-12 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                    <div className="text-center md:text-left flex-1">
                        <Badge variant="cyan" className="mb-4">{word.cefr}</Badge>
                        <h1 className="text-6xl mb-2">{word.word}</h1>
                        <p className="text-2xl text-text-muted font-mono mb-8">{word.transcription}</p>
                        <div className="flex flex-col gap-3">
                            <Button variant="primary" className="text-lg px-8 w-full md:w-auto" onClick={() => playPronunciationAudio(word.audioUrl, word.word)}><Volume2 size={24} /> Nghe phát âm</Button>
                            <Button variant="accent" className="text-lg px-8 w-full md:w-auto" onClick={handleAskAi} disabled={isLoadingAi}>
                                {isLoadingAi ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                                {isLoadingAi ? "Đang nhờ AI..." : "Hỏi AI ✨"}
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 bg-white/50 p-8 rounded-card border-2 border-primary/10 shadow-sm w-full">
                        <h3 className="text-xl font-bold mb-4 text-primary">Ý nghĩa</h3>
                        <p className="text-xl mb-8 leading-relaxed">{word.meaning}</p>
                        <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-xl font-bold text-purple">Ví dụ</h3>
                            {word.example && (
                                <Button variant="ghost" className="p-2 min-h-0 rounded-full" onClick={() => playPronunciationAudio(word.exampleAudioUrl, word.example)}><Volume2 size={16} /></Button>
                            )}
                        </div>
                        {word.example && (
                            <p className="text-lg italic text-text-secondary leading-relaxed font-serif">"{word.example}"</p>
                        )}
                        
                        {(isLoadingAi || aiResponse) && (
                            <div className="mt-8 pt-6 border-t-2 border-primary/10">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-600">
                                    <Sparkles size={20} /> Trợ lý AI 🤖
                                </h3>
                                {isLoadingAi ? (
                                    <div className="flex items-center justify-center p-6 text-cyan-600">
                                        <Loader2 size={32} className="animate-spin" />
                                    </div>
                                ) : (
                                    <div 
                                        className="text-base leading-relaxed text-text-primary prose prose-cyan" 
                                        dangerouslySetInnerHTML={{ __html: aiResponse || '' }} 
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VocabDetail;
