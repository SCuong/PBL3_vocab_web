import { useState } from 'react';
import { ArrowLeft, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { playPronunciationAudio } from '../utils/audio';
import { Badge, Button, typography } from '../components/ui';
import { apiFetch } from '../services/apiClient';

const VocabDetail = ({ word, onBack }: any) => {
    const [aiResponse, setAiResponse] = useState<{ summary: string; quickUsage: string } | null>(null);
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

            const response = await apiFetch('/api/AI/Explain', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            if (response.ok) {
                setAiResponse(await response.json() as { summary: string; quickUsage: string });
            } else {
                setAiResponse({ summary: 'Trợ lý AI chưa thể phân tích từ này.', quickUsage: 'Vui lòng thử lại sau.' });
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setAiResponse({ summary: 'Trợ lý AI phản hồi quá lâu.', quickUsage: 'Kiểm tra kết nối hoặc thử lại.' });
            } else {
                setAiResponse({ summary: 'Không thể kết nối với trợ lý AI.', quickUsage: 'Vui lòng thử lại sau.' });
            }
        } finally {
            clearTimeout(timeoutId);
            setIsLoadingAi(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <Button variant="ghost" className="mb-8" onClick={onBack}><ArrowLeft size={18} /> Quay lại</Button>
            <div className="bg-surface border border-primary/10 rounded-card shadow-[0_4px_20px_var(--shadow-color)] p-6 sm:p-8 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-12 relative z-10">
                    <div className="text-center md:text-left flex-1">
                        <Badge variant="cyan" className="mb-4">{word.cefr}</Badge>
                        <h1 className={`${typography.pageTitle} mb-2`}>{word.word}</h1>
                        <p className="text-lg sm:text-xl text-text-muted font-ipa mb-8">{word.transcription}</p>
                        <div className="flex flex-col gap-3">
                            <Button variant="primary" className="text-lg px-8 w-full md:w-auto" onClick={() => playPronunciationAudio(word.audioUrl, word.word)}><Volume2 size={24} /> Nghe phát âm</Button>
                            <Button variant="accent" className="text-lg px-8 w-full md:w-auto" onClick={handleAskAi} disabled={isLoadingAi}>
                                {isLoadingAi ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                                {isLoadingAi ? "Đang nhờ AI..." : "Hỏi AI ✨"}
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 bg-surface/50 p-8 rounded-card border-2 border-primary/10 shadow-sm w-full">
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
                                    <div className="text-base leading-relaxed text-text-primary">
                                        <p>{aiResponse?.summary}</p>
                                        {aiResponse?.quickUsage && (
                                            <p className="mt-3 text-text-secondary">{aiResponse.quickUsage}</p>
                                        )}
                                    </div>
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
