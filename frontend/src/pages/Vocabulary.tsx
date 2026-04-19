import { useMemo, useState } from 'react';
import { Search, Volume2 } from 'lucide-react';
import { CEFR_LEVELS } from '../constants/appConstants';
import { playPronunciationAudio } from '../utils/audio';
import { Badge, Button } from '../components/ui';

const Vocabulary = ({ onSelectWord, items, isLoading, topics }: any) => {
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
        </div>
    );
};

export default Vocabulary;
