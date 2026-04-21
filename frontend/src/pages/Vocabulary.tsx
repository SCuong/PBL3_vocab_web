import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Volume2, X } from 'lucide-react';
import { CEFR_LEVELS } from '../constants/appConstants';
import { playPronunciationAudio } from '../utils/audio';
import { Badge, Button } from '../components/ui';

const Vocabulary = ({ onSelectWord, onCloseWordDetail, selectedWord, items, isLoading, topics }: any) => {
    const [search, setSearch] = useState('');
    const [selectedCefr, setSelectedCefr] = useState('ALL');
    const [selectedTopic, setSelectedTopic] = useState('ALL');

    const topicOptions = useMemo(() => {
        return topics
            .map((topic: any) => ({ value: String(topic.topicId), label: topic.name }))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [topics]);

    const filtered = items.filter((v: any) => {
        const matchText = v.word.toLowerCase().includes(search.toLowerCase())
            || v.meaning.toLowerCase().includes(search.toLowerCase());
        const matchCefr = selectedCefr === 'ALL' || v.cefr === selectedCefr;
        const itemTopic = String(v.topicId ?? 'NONE');
        const matchTopic = selectedTopic === 'ALL' || itemTopic === selectedTopic;

        return matchText && matchCefr && matchTopic;
    });

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <h1 className="text-4xl">Từ vựng</h1>
                <div className="w-full md:w-[640px] grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm từ vựng..."
                            className="w-full pl-12 pr-4 py-3 bg-white/50 border-2 border-primary/10 rounded-pill outline-none focus:border-primary transition-all shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        value={selectedCefr}
                        onChange={(e) => setSelectedCefr(e.target.value)}
                        className="px-4 py-3 bg-white/50 border-2 border-primary/10 rounded-pill outline-none focus:border-primary transition-all shadow-sm"
                    >
                        <option value="ALL">Tất cả cấp độ</option>
                        {CEFR_LEVELS.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                    <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="px-4 py-3 bg-white/50 border-2 border-primary/10 rounded-pill outline-none focus:border-primary transition-all shadow-sm md:col-span-3"
                    >
                        <option value="ALL">Tất cả chủ đề</option>
                        {topicOptions.map(topic => (
                            <option key={topic.value} value={topic.value}>{topic.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            {isLoading && (
                <div className="text-text-muted mb-6">Đang tải danh sách từ vựng...</div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((v: any) => (
                    <div key={v.id} className="glass-card p-6 cursor-pointer group" onClick={() => onSelectWord(v)}>
                        <div className="flex justify-between items-start mb-4">
                            <Badge variant="purple">{v.cefr}</Badge>
                            <Button
                                variant="ghost"
                                className="p-2 min-h-0 rounded-full"
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    playPronunciationAudio(v.audioUrl, v.word);
                                }}
                            >
                                <Volume2 size={16} />
                            </Button>
                        </div>
                        <h3 className="text-2xl mb-1 group-hover:text-primary transition-colors">{v.word}</h3>
                        <p className="text-text-muted font-mono text-sm mb-4">{v.transcription}</p>
                        <p className="text-text-secondary line-clamp-2">{v.meaning}</p>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {selectedWord && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[700] bg-black/35 backdrop-blur-sm p-4 md:p-6 flex items-center justify-center"
                        onClick={onCloseWordDetail}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 20 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="glass-card bg-white/90 w-full max-w-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div>
                                    <Badge variant="cyan" className="mb-3">{selectedWord.cefr}</Badge>
                                    <h2 className="text-4xl mb-1">{selectedWord.word}</h2>
                                    <p className="text-text-muted font-mono">{selectedWord.transcription}</p>
                                </div>
                                <button
                                    type="button"
                                    className="w-9 h-9 rounded-full hover:bg-primary/10 flex items-center justify-center"
                                    onClick={onCloseWordDetail}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-3 mb-6">
                                <Button
                                    variant="primary"
                                    className="px-6"
                                    onClick={() => playPronunciationAudio(selectedWord.audioUrl, selectedWord.word)}
                                >
                                    <Volume2 size={18} /> Nghe phát âm
                                </Button>
                                {selectedWord.example && (
                                    <Button
                                        variant="ghost"
                                        className="px-6"
                                        onClick={() => playPronunciationAudio(selectedWord.exampleAudioUrl, selectedWord.example)}
                                    >
                                        <Volume2 size={18} /> Nghe ví dụ
                                    </Button>
                                )}
                            </div>

                            <div className="bg-white/60 p-5 rounded-card border border-primary/10">
                                <h3 className="text-lg font-bold text-primary mb-2">Ý nghĩa</h3>
                                <p className="text-lg mb-4">{selectedWord.meaning}</p>
                                {selectedWord.example && (
                                    <>
                                        <h3 className="text-lg font-bold text-purple mb-2">Ví dụ</h3>
                                        <p className="italic text-text-secondary leading-relaxed">"{selectedWord.example}"</p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Vocabulary;
