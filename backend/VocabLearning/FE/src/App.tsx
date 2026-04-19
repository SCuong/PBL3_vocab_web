import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ChevronRight,
    Volume2,
    ArrowLeft,
    Shield,
    ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { authApi, type AuthenticatedUser } from './services/authApi';
import { learningProgressApi, type LearningProgressState } from './services/learningProgressApi';
import {
    EMPTY_CURRENT_USER_GAME_DATA
} from './constants/appConstants';
import { mockData, readingPassages } from './mocks/mockData';
import {
    loadCurrentUserGameData,
    saveCurrentUserGameData
} from './utils/gameDataStorage';
import { buildLearningTopicGroups } from './utils/learningTopicGroups';
import { playPronunciationAudio } from './utils/audio';
import { useToasts } from './hooks/useToasts';
import { useGameProgress } from './hooks/useGameProgress';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { Badge, Button, Toast } from './components/ui';
import { Footer, Navbar } from './components/layout';
import { StreakModal } from './components/streak';
import { AppRoutes } from './AppRoutes';

// --- COMPONENTS ---

const LearningTopics = ({ onStartStudy, currentUser, onNavigate, topicGroups }: any) => {
    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const isGuest = !currentUser;

    useEffect(() => {
        if (!expandedCat && topicGroups.length > 0) {
            setExpandedCat(topicGroups[0].id);
        }
    }, [expandedCat, topicGroups]);

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 relative">
            {/* Guest Banner */}
            {isGuest && (
                <div className="mb-12 p-4 bg-linear-to-r from-cyan/80 via-purple/80 to-pink/80 rounded-2xl flex items-center justify-between backdrop-blur-md border border-white/20 shadow-xl animate-fade-in">
                    <div className="flex items-center gap-4 text-white">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">✨</div>
                        <p className="font-bold">Bạn đang xem chế độ khách. Đăng ký để mở khóa toàn bộ 44 chủ đề!</p>
                    </div>
                    <Button variant="ghost" className="bg-white/20 border-white/40 text-white" onClick={() => onNavigate('auth')}>Đăng ký miễn phí →</Button>
                </div>
            )}

            {/* Greeting Header */}
            {!isGuest && (
                <header className="flex items-center justify-between mb-16 animate-slide-down">
                    <div>
                        <h1 className="text-5xl mb-2 font-display font-bold">Chào {currentUser.username}! 👋</h1>
                        <p className="text-text-secondary text-lg">Hôm nay bạn muốn học gì nào?</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="glass-card px-6 py-3 border-orange-500/20 bg-orange-500/5 flex items-center gap-3">
                            <span className="text-2xl">🔥</span>
                            <span className="font-bold text-orange-600">{currentUser.streak} ngày liên tiếp</span>
                        </div>
                    </div>
                </header>
            )}

            {/* Main Header for Guest */}
            {isGuest && (
                <header className="text-center mb-16">
                    <h1 className="text-5xl mb-4 font-display font-bold">Khám phá chủ đề học</h1>
                    <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                        Khám phá kho tàng kiến thức với 7 danh mục lớn và 44 chủ đề từ vựng đa dạng từ cơ bản đến nâng cao.
                    </p>
                </header>
            )}

            <div className="space-y-6">
                {topicGroups.map((cat: any, catIndex: number) => {
                    const isOpen = expandedCat === cat.id;
                    const isCategoryLocked = isGuest && catIndex > 0;

                    return (
                        <div key={cat.id} className={`glass-card overflow-hidden shadow-sm hover:shadow-md transition-all border-2 border-primary/5 ${isCategoryLocked ? 'opacity-50' : ''}`}>
                            {/* Accordion Header */}
                            <button
                                onClick={() => !isCategoryLocked && setExpandedCat(isOpen ? null : cat.id)}
                                className={`w-full p-6 flex items-center justify-between group transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-primary/5'} ${isCategoryLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                disabled={isCategoryLocked}
                            >
                                <div className="flex items-center gap-6">
                                    <div className="text-4xl group-hover:scale-110 transition-transform">📚</div>
                                    <div className="text-left">
                                        <h3 className={`text-2xl font-bold flex items-center gap-2 ${isOpen ? 'text-primary' : 'text-text-primary'}`}>
                                            {cat.title}
                                            {isCategoryLocked && <Shield size={20} className="text-text-muted" />}
                                        </h3>
                                        <p className="text-text-muted text-sm">{cat.topics.length} chủ đề từ vựng</p>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-full transform transition-transform duration-300 ${isOpen ? 'rotate-180 bg-primary/20 text-primary' : 'rotate-0 bg-bg-light text-text-muted'}`}>
                                    <ChevronLeft className="-rotate-90" />
                                </div>
                            </button>

                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden bg-white/30"
                                    >
                                        <div className="p-8 grid md:grid-cols-2 gap-6">
                                            {cat.topics.map((topic: any, idx: number) => {
                                                const isTopicLocked = isGuest && idx >= 3;
                                                const isLearnedOut = !isGuest && topic.stats.new === 0 && topic.stats.review === 0;
                                                const progressPercent = topic.stats.total > 0
                                                    ? Math.round((topic.stats.learned / topic.stats.total) * 100)
                                                    : 0;

                                                return (
                                                    <div
                                                        key={topic.id}
                                                        className={`glass-card p-6 border group transition-all relative ${isTopicLocked ? 'blur-[2px] opacity-70 pointer-events-none' : 'hover:border-primary/40 hover:-translate-y-1'}`}
                                                    >
                                                        {/* Locking Overlay */}
                                                        {isTopicLocked && (
                                                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/10 backdrop-blur-[1px] rounded-card">
                                                                <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-lg border-2 border-primary/20 text-text-muted">🔒</div>
                                                            </div>
                                                        )}

                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="text-4xl">{topic.icon}</div>
                                                            {isGuest && idx < 3 && <Badge variant="green" className="animate-pulse">Preview ✓</Badge>}
                                                            {!isGuest && (
                                                                <div className="flex gap-2">
                                                                    <Badge variant="cyan" className="text-[10px] px-1.5">🆕 {topic.stats.new}</Badge>
                                                                    <Badge variant="purple" className="text-[10px] px-1.5">🔔 {topic.stats.review}</Badge>
                                                                    <Badge variant="green" className="text-[10px] px-1.5 font-bold">✅ {topic.stats.learned}</Badge>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <h4 className="text-xl font-bold mb-2">{topic.title}</h4>
                                                        <p className="text-sm text-text-secondary line-clamp-2 mb-6">{topic.description}</p>

                                                        {!isGuest && (
                                                            <div className="mb-6">
                                                                <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden mb-1">
                                                                    <div className="h-full bg-linear-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                                                                </div>
                                                                <div className="text-[10px] text-text-muted text-right font-medium">Tiến độ: {progressPercent}%</div>
                                                            </div>
                                                        )}

                                                        <Button
                                                            variant={isLearnedOut ? 'ghost' : 'primary'}
                                                            className={`w-full group/btn ${isLearnedOut ? 'cursor-not-allowed opacity-40' : ''}`}
                                                            onClick={() => !isLearnedOut && onStartStudy(topic.id)}
                                                            disabled={isTopicLocked}
                                                            title={isLearnedOut ? 'Bạn đã học hết chủ đề này! Chờ ngày ôn tiếp theo.' : ''}
                                                        >
                                                            {isLearnedOut ? 'Đã hoàn thành' : 'Bắt đầu →'}
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Sticky Guest CTA */}
            {isGuest && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-6 flex justify-center pointer-events-none">
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="pointer-events-auto bg-white/90 backdrop-blur-xl border-2 border-primary/40 p-6 rounded-card shadow-2xl flex flex-col sm:flex-row items-center gap-8 max-w-4xl w-full"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-purple flex items-center justify-center text-white text-3xl shadow-lg ring-4 ring-primary/10">🎯</div>
                            <div>
                                <h4 className="font-bold text-xl mb-1 text-text-primary">Mở khóa 44 chủ đề đặc sắc</h4>
                                <p className="text-text-secondary">Theo dõi tiến trình học tập và nhận ngay 100 XP thưởng! 🔥</p>
                            </div>
                        </div>
                        <Button variant="primary" className="px-10 py-4 text-lg ml-auto" onClick={() => onNavigate('auth')}>Đăng ký miễn phí →</Button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

const MatchingGame = ({ words, type, onFinish }: any) => {
    const [leftItems, setLeftItems] = useState<any[]>([]);
    const [rightItems, setRightItems] = useState<any[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
    const [selectedRight, setSelectedRight] = useState<number | null>(null);
    const [matches, setMatches] = useState<Record<number, number>>({});
    const [wrongPairs, setWrongPairs] = useState<[number, number][]>([]);
    const [startTime] = useState(Date.now());

    useEffect(() => {
        const left = words.map((w: any) => ({ id: w.id, content: type === 'word' ? w.word : w.transcription }));
        const right = words.map((w: any) => ({ id: w.id, content: w.meaning }));
        setLeftItems([...left].sort(() => Math.random() - 0.5));
        setRightItems([...right].sort(() => Math.random() - 0.5));
    }, [words, type]);

    useEffect(() => {
        if (selectedLeft !== null && selectedRight !== null) {
            if (selectedLeft === selectedRight) {
                setMatches(prev => ({ ...prev, [selectedLeft]: selectedRight }));
                setSelectedLeft(null);
                setSelectedRight(null);
            } else {
                setWrongPairs([[selectedLeft, selectedRight]]);
                setTimeout(() => {
                    setWrongPairs([]);
                    setSelectedLeft(null);
                    setSelectedRight(null);
                }, 1000);
            }
        }
    }, [selectedLeft, selectedRight]);

    useEffect(() => {
        if (Object.keys(matches).length === words.length) {
            const duration = Math.round((Date.now() - startTime) / 1000);
            setTimeout(() => onFinish(words.length, words.length, duration), 500);
        }
    }, [matches, words.length, startTime, onFinish]);

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                    <h3 className="font-bold text-center mb-6 text-primary">{type === 'word' ? 'Từ vựng / IPA' : 'Phiên âm IPA'}</h3>
                    {leftItems.map((item) => (
                        <button
                            key={item.id}
                            disabled={matches[item.id] !== undefined}
                            onClick={() => setSelectedLeft(item.id)}
                            className={`w-full p-6 h-20 flex items-center justify-center rounded-2xl border-2 transition-all font-bold text-lg
                ${matches[item.id] !== undefined ? 'bg-accent/20 border-accent/40 text-text-muted opacity-50' :
                                    selectedLeft === item.id ? 'border-primary bg-primary/5 shadow-md scale-105' :
                                        wrongPairs.some(p => p[0] === item.id) ? 'border-red-400 bg-red-50 animate-shake' : 'bg-white border-primary/10 hover:border-primary/40'}
              `}
                        >
                            {item.content}
                        </button>
                    ))}
                </div>
                <div className="space-y-4">
                    <h3 className="font-bold text-center mb-6 text-secondary">Nghĩa tiếng Việt</h3>
                    {rightItems.map((item) => (
                        <button
                            key={item.id}
                            disabled={Object.values(matches).includes(item.id)}
                            onClick={() => setSelectedRight(item.id)}
                            className={`w-full p-6 h-20 flex items-center justify-center rounded-2xl border-2 transition-all font-bold text-lg
                ${Object.values(matches).includes(item.id) ? 'bg-accent/20 border-accent/40 text-text-muted opacity-50' :
                                    selectedRight === item.id ? 'border-secondary bg-secondary/5 shadow-md scale-105' :
                                        wrongPairs.some(p => p[1] === item.id) ? 'border-red-400 bg-red-50 animate-shake' : 'bg-white border-primary/10 hover:border-primary/40'}
              `}
                        >
                            {item.content}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Minitest = ({ topicId, learnedWords, onFinish }: any) => {
    const [fillAnswers, setFillAnswers] = useState<string[]>([]);
    const [readingAnswers, setReadingAnswers] = useState<(number | null)[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showingPart2, setShowingPart2] = useState(false);

    const fillQuestions = useMemo(() => {
        return (Array.isArray(learnedWords) ? learnedWords : [])
            .slice(0, 5)
            .map((w: any) => ({
                id: w.id,
                q: (w.example || '').replace(new RegExp(w.word, 'gi'), '________'),
                hint: w.word?.charAt(0)?.toLowerCase() || '',
                a: w.word || ''
            }));
    }, [learnedWords]);

    const passage = useMemo(() => {
        return readingPassages.find(p => p.topicId === topicId) || readingPassages[0];
    }, [topicId]);

    useEffect(() => {
        setFillAnswers(new Array(fillQuestions.length).fill(''));
        setReadingAnswers(new Array(passage.questions.length).fill(null));
        setIsSubmitted(false);
        setShowingPart2(false);
    }, [fillQuestions, passage]);

    const answeredCount = fillAnswers.filter(a => a !== '').length + readingAnswers.filter(a => a !== null).length;
    const totalQuestions = fillQuestions.length + passage.questions.length;

    const handleSubmit = () => {
        setIsSubmitted(true);
        let sFill = 0;
        let sReading = 0;

        fillAnswers.forEach((ans, i) => {
            if (ans.trim().toLowerCase() === fillQuestions[i].a.toLowerCase()) {
                sFill++;
            }
        });

        readingAnswers.forEach((ans, i) => {
            if (ans === passage.questions[i].correct) {
                sReading++;
            }
        });

        const bonus = sReading === passage.questions.length ? 50 : 0;

        if (bonus > 0) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }

        onFinish(sFill + sReading, totalQuestions, { fill: sFill, reading: sReading, bonus });
    };

    if (!passage) {
        return null;
    }

    return (
        <div className="max-w-5xl mx-auto pb-24 relative">
            <div className="sticky top-[80px] z-40 bg-white/90 backdrop-blur-md p-6 rounded-3xl border-2 border-primary/20 shadow-2xl flex items-center justify-between gap-12 mb-16">
                <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold text-text-muted mb-2 uppercase tracking-[0.2em]">
                        <span>Tiến độ bài làm</span>
                        <span>{answeredCount} / {totalQuestions} câu</span>
                    </div>
                    <div className="h-4 bg-purple/10 rounded-full overflow-hidden border border-primary/5">
                        <motion.div
                            animate={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                            className="h-full bg-linear-to-r from-cyan to-primary"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-24">
                <section id="part1">
                    <header className="flex items-center gap-6 mb-12">
                        <Badge variant="purple" className="py-3 px-6 text-base font-bold">Bài 1: Điền từ còn thiếu</Badge>
                        <div className="flex-1 h-px bg-purple/10" />
                    </header>
                    <div className="grid gap-10">
                        {fillQuestions.length === 0 && (
                            <div className="glass-card p-8 text-center text-text-secondary">
                                Bạn chưa có từ nào đã học trong chủ đề này để làm bài 1. Hãy học và hoàn thành phần luyện tập trước.
                            </div>
                        )}
                        {fillQuestions.map((q: any, i: number) => {
                            const isCorrect = isSubmitted && fillAnswers[i].trim().toLowerCase() === q.a.toLowerCase();

                            return (
                                <div key={q.id} className={`glass-card p-10 relative overflow-hidden transition-all duration-500 ${isSubmitted ? (isCorrect ? 'border-green-500 bg-green-50/50' : 'border-red-500 bg-red-50/50') : 'bg-white'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <span className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary">{i + 1}</span>
                                    </div>
                                    <div className="text-2xl font-medium mb-8 leading-relaxed italic text-text-primary">"{q.q}"</div>
                                    <div className="flex flex-col sm:flex-row gap-6 items-end sm:items-center">
                                        <div className="relative flex-1 group">
                                            <input
                                                type="text"
                                                placeholder="Gõ đáp án..."
                                                disabled={isSubmitted}
                                                value={fillAnswers[i]}
                                                onChange={(e) => {
                                                    const next = [...fillAnswers];
                                                    next[i] = e.target.value;
                                                    setFillAnswers(next);
                                                }}
                                                className={`w-full px-8 py-5 rounded-2xl border-2 transition-all text-xl font-bold bg-transparent outline-none
                                                ${isSubmitted ? (isCorrect ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700') : 'border-primary/10 hover:border-primary/30 focus:border-primary focus:bg-white'}`}
                                            />
                                            {!isSubmitted && <div className="mt-3 text-sm text-text-muted">💡 Bắt đầu bằng chữ "{q.hint}"</div>}
                                        </div>
                                        {isSubmitted && <div className={`mt-2 font-display font-bold text-xl ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{isCorrect ? '✓ Chính xác!' : `Đáp án: ${q.a}`}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {!isSubmitted && !showingPart2 && (
                        <div className="mt-12 flex justify-center">
                            <Button variant="accent" className="px-16 py-5 text-xl" onClick={() => setShowingPart2(true)}>
                                Sang bài 2 →
                            </Button>
                        </div>
                    )}
                </section>

                {(showingPart2 || isSubmitted) && (
                    <section id="part2">
                        <header className="flex items-center gap-6 mb-12">
                            <Badge variant="accent" className="py-3 px-6 text-base font-bold">Bài 2: Đọc hiểu</Badge>
                            <div className="flex-1 h-px bg-accent/20" />
                        </header>
                        <div className="glass-card mb-16 p-12 bg-linear-to-br from-bg-light to-white border-accent/20">
                            <h4 className="text-3xl font-display font-bold mb-10 text-center text-accent">{passage.title}</h4>
                            <div className="prose prose-purple max-w-none text-text-secondary leading-[2.2] text-xl whitespace-pre-wrap font-serif">{passage.content}</div>
                        </div>
                        <div className="grid gap-12">
                            {passage.questions.map((q: any, qi: number) => (
                                <div key={qi} className={`glass-card p-10 border-2 transition-all ${isSubmitted ? (readingAnswers[qi] === q.correct ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-transparent bg-white shadow-xl'}`}>
                                    <div className="font-bold text-2xl mb-12 leading-relaxed text-text-primary">{q.q}</div>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        {q.options.map((opt: string, oi: number) => (
                                            <label key={oi} className={`flex items-center gap-6 p-6 border-2 rounded-3xl cursor-pointer transition-all ${readingAnswers[qi] === oi ? 'border-primary bg-primary/5 shadow-inner' : 'border-primary/5 hover:border-primary/20 bg-white'} ${isSubmitted && oi === q.correct ? 'border-green-500 bg-green-100 text-green-900 font-bold scale-[1.02]' : ''} ${isSubmitted && readingAnswers[qi] === oi && oi !== q.correct ? 'border-red-500 bg-red-100 text-red-900' : ''}`}>
                                                <input
                                                    type="radio"
                                                    checked={readingAnswers[qi] === oi}
                                                    disabled={isSubmitted}
                                                    onChange={() => {
                                                        const next = [...readingAnswers];
                                                        next[qi] = oi;
                                                        setReadingAnswers(next);
                                                    }}
                                                    className="w-6 h-6 accent-primary"
                                                />
                                                <span className="text-xl">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {isSubmitted && (
                                        <div className="mt-12 pt-10 border-t border-primary/10">
                                            <p className="text-lg text-text-secondary italic leading-loose">💡 Giải thích: {q.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <footer className="mt-24 pt-24 border-t border-primary/10 text-center">
                {!isSubmitted ? (
                    <Button variant="primary" className="px-24 py-6 text-3xl shadow-2xl" onClick={handleSubmit}>
                        Nộp bài ngay 🚀
                    </Button>
                ) : (
                    <div className="flex flex-col items-center gap-8">
                        <Badge variant="green" className="py-4 px-12 text-2xl animate-bounce">KẾT QUẢ ĐÃ GHI NHẬN! 🏆</Badge>
                        <Button variant="primary" className="px-12 py-5 text-xl" onClick={() => onFinish(0, 0)}>
                            Hoàn thành chủ đề
                        </Button>
                    </div>
                )}
            </footer>
        </div>
    );
};

const StudySession = ({ topicId, studyWords, topicGroups, learningProgressState, onFinish, onAddXP, onStreakCheck, onAddToast, onWordsLearned }: any) => {
    const [tab, setTab] = useState<'flashcard' | 'learn' | 'minitest'>('flashcard');
    const [learnStep, setLearnStep] = useState<1 | 2 | 3>(1);
    const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
    const [matchType, setMatchType] = useState<'word' | 'ipa' | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const words = useMemo(
        () => (studyWords && studyWords.length > 0
            ? studyWords
            : mockData.vocabulary.filter(v => v.topicId === topicId)),
        [studyWords, topicId]);
    const currentTopicGroup = useMemo(
        () => topicGroups?.find((group: any) => group.topics?.some((topic: any) => topic.id === topicId)),
        [topicGroups, topicId]
    );
    const currentTopic = useMemo(
        () => currentTopicGroup?.topics?.find((topic: any) => topic.id === topicId),
        [currentTopicGroup, topicId]
    );
    const topic = mockData.topics.find(t => t.id === topicId);
    const category = mockData.categories.find(c => c.id === topic?.catId);
    const breadcrumbCategoryTitle = currentTopicGroup?.title ?? category?.title ?? 'Chủ đề';
    const breadcrumbTopicTitle = currentTopic?.title ?? topic?.title ?? 'Bài học';
    const topicTitle = currentTopic?.title ?? topic?.title ?? 'Học từ vựng';
    const topicStats = currentTopic?.stats ?? topic?.stats;

    const selectedWords = useMemo(() =>
        words.filter(w => selectedWordIds.includes(w.id)),
        [words, selectedWordIds]
    );
    const learnedWordsForMinitest = useMemo(() => {
        if (!topicId || !learningProgressState?.topics) {
            return [];
        }

        const topicProgress = learningProgressState.topics.find((t: any) => t.topicId === topicId);
        if (!topicProgress?.learnedWordIds?.length) {
            return [];
        }

        const learnedWordIdSet = new Set(topicProgress.learnedWordIds);
        return words.filter(w => learnedWordIdSet.has(w.id));
    }, [learningProgressState, topicId, words]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (tab === 'flashcard' || (tab === 'learn' && learnStep === 2)) {
                if (e.code === 'Space') { e.preventDefault(); setIsFlipped(f => !f); }
                if (e.code === 'ArrowRight') {
                    setCurrentIndex(prev => {
                        const max = (tab === 'flashcard' ? words : selectedWords).length - 1;
                        return prev < max ? prev + 1 : prev;
                    });
                    setIsFlipped(false);
                }
                if (e.code === 'ArrowLeft') { setCurrentIndex(prev => Math.max(0, prev - 1)); setIsFlipped(false); }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [tab, learnStep, words.length, selectedWords.length]);

    const handleFinishMatching = async (correct: number, total: number, time: number) => {
        if (topicId && selectedWordIds.length > 0) {
            await onWordsLearned(topicId, selectedWordIds);
        }

        onAddXP(correct * 5);
        onStreakCheck();
        onAddToast(`Hoàn thành Matching trong ${time}s! +${correct * 5} XP`, 'success');
        setMatchType(null);
        setLearnStep(1);
    };

    if (words.length === 0) return <div className="p-12 text-center text-text-muted">Không tìm thấy từ vựng cho chủ đề này.</div>;

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
                <button onClick={() => onFinish()} className="hover:text-primary transition-colors">Learning</button>
                <ChevronRight size={14} />
                <button onClick={() => onFinish()} className="hover:text-primary transition-colors">{breadcrumbCategoryTitle}</button>
                <ChevronRight size={14} />
                <span className="text-primary font-bold">{breadcrumbTopicTitle}</span>
            </nav>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => onFinish()} className="p-2 rounded-full min-h-0">
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-5xl mb-2 font-display font-extrabold text-text-primary">{topicTitle}</h1>               <div className="flex gap-2">
                            <Badge variant="cyan" className="text-xs">🆕 {topicStats?.new ?? 0}</Badge>
                            <Badge variant="purple" className="text-xs">🔔 {topicStats?.review ?? 0}</Badge>
                            <Badge variant="green" className="text-xs font-bold">✅ {topicStats?.learned ?? 0}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 p-1 bg-white/50 backdrop-blur-md rounded-pill border-2 border-primary/10">
                    {(['flashcard', 'learn', 'minitest'] as const).map(t => (
                        <button key={t} onClick={() => { setTab(t); setCurrentIndex(0); setIsFlipped(false); }} className={`px-8 py-3 rounded-pill font-bold transition-all flex items-center gap-2 ${tab === t ? 'bg-primary text-text-primary shadow-xl scale-105' : 'text-text-muted hover:text-primary'}`}>
                            {t === 'flashcard' && '📇 Flashcard'}
                            {t === 'learn' && '📖 Learn'}
                            {t === 'minitest' && '🧪 Minitest'}
                        </button>
                    ))}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {tab === 'flashcard' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} key="flashcard-tab" className="max-w-2xl mx-auto">
                        <div className="relative h-[480px] perspective-1000 mb-12">
                            <motion.div
                                onClick={() => setIsFlipped(!isFlipped)}
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.5, ease: 'easeInOut' }}
                                className="w-full h-full relative preserve-3d cursor-pointer"
                            >
                                <div className="absolute inset-0 backface-hidden glass-card flex flex-col items-center justify-center p-12 text-center h-full border-4 border-primary/20 bg-white">
                                    <Badge variant="purple" className="mb-12 scale-125">Vocabulary Card</Badge>
                                    <div className="text-7xl font-display font-extrabold mb-4 text-primary">{words[currentIndex].word}</div>
                                    <div className="text-2xl text-text-muted font-mono bg-purple/5 px-6 py-2 rounded-xl mb-12">{words[currentIndex].transcription}</div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            className="p-2 min-h-0 rounded-full"
                                            onClick={(e: any) => {
                                                e.stopPropagation();
                                                playPronunciationAudio(words[currentIndex].audioUrl, words[currentIndex].word);
                                            }}
                                        >
                                            <Volume2 size={18} />
                                        </Button>
                                        <Button variant="accent" className="px-10 py-4 text-lg">Xem nghĩa ▼</Button>
                                    </div>
                                </div>
                                <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card bg-linear-to-br from-accent/10 to-transparent border-4 border-accent flex flex-col items-center justify-center p-12 text-center h-full">
                                    <Badge variant="accent" className="mb-12 scale-125">Meaning</Badge>
                                    <div className="text-5xl font-bold mb-10 text-text-primary">{words[currentIndex].meaning}</div>
                                    <Button
                                        variant="ghost"
                                        className="p-2 min-h-0 rounded-full mb-4"
                                        onClick={(e: any) => {
                                            e.stopPropagation();
                                            playPronunciationAudio(words[currentIndex].exampleAudioUrl, words[currentIndex].example);
                                        }}
                                    >
                                        <Volume2 size={18} />
                                    </Button>
                                    <div className="bg-white/70 p-8 rounded-3xl italic border-2 border-accent/10 w-full shadow-inner font-serif text-xl leading-loose">
                                        "{words[currentIndex].example}"
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                        <div className="flex items-center justify-between gap-12">
                            <Button variant="ghost" className="px-10 py-4 flex-1" onClick={() => { setCurrentIndex(p => Math.max(0, p - 1)); setIsFlipped(false); }} disabled={currentIndex === 0}>← Trước</Button>
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex gap-2">
                                    {words.map((_, i) => (
                                        <div key={i} className={`h-3 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-primary' : 'w-3 bg-primary/10'}`} />
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-text-muted uppercase">{currentIndex + 1} / {words.length}</span>
                            </div>
                            <Button variant="primary" className="px-10 py-4 flex-1" onClick={() => { setCurrentIndex(p => Math.min(words.length - 1, p + 1)); setIsFlipped(false); }} disabled={currentIndex === words.length - 1}>Tiếp theo →</Button>
                        </div>
                    </motion.div>
                )}

                {tab === 'learn' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="learn-tab">
                        <div className="max-w-3xl mx-auto mb-16 relative">
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-primary/10 -translate-y-1/2 -z-10" />
                            <div className="flex justify-between">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className="flex flex-col items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 transition-all ${learnStep >= s ? 'bg-primary border-primary text-white' : 'bg-white border-primary/10 text-text-muted'}`}>
                                            {s}
                                        </div>
                                        <span className={`text-xs font-bold uppercase ${learnStep >= s ? 'text-primary' : 'text-text-muted'}`}>{s === 1 ? 'Chọn từ' : s === 2 ? 'Xem qua' : 'Luyện tập'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {learnStep === 1 && (
                            <div className="max-w-4xl mx-auto">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-bold">{selectedWordIds.length} từ đã chọn</h3>
                                    <div className="flex gap-3">
                                        <Button variant="ghost" onClick={() => setSelectedWordIds(words.map(w => w.id))}>Chọn tất cả</Button>
                                        <Button variant="ghost" onClick={() => setSelectedWordIds([])}>Bỏ chọn</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-16">
                                    {words.map(w => {
                                        const isSel = selectedWordIds.includes(w.id);
                                        return (
                                            <div key={w.id} onClick={() => setSelectedWordIds(p => isSel ? p.filter(id => id !== w.id) : [...p, w.id])} className={`glass-card p-6 cursor-pointer relative transition-all border-4 ${isSel ? 'border-green-500 bg-green-50 scale-105' : 'border-transparent hover:border-primary/20'}`}>
                                                <div className="text-2xl font-bold mb-1">{w.word}</div>
                                                <div className="text-xs text-text-muted font-mono">{w.transcription}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-center"><Button variant="primary" className="px-16 py-5 text-xl" disabled={selectedWordIds.length === 0} onClick={() => { setLearnStep(2); setCurrentIndex(0); }}>Bắt đầu học →</Button></div>
                            </div>
                        )}

                        {learnStep === 2 && (
                            <div className="max-w-2xl mx-auto">
                                <div className="relative h-[400px] perspective-1000 mb-12">
                                    <motion.div onClick={() => setIsFlipped(!isFlipped)} key={`step2-${currentIndex}`} initial={{ scale: 0.9 }} animate={{ rotateY: isFlipped ? 180 : 0, scale: 1 }} className="w-full h-full relative preserve-3d cursor-pointer">
                                        <div className="absolute inset-0 backface-hidden glass-card flex flex-col items-center justify-center p-8 text-center border-4 border-primary/10">
                                            <div className="text-6xl font-display font-bold text-primary mb-4">{selectedWords[currentIndex].word}</div>
                                            <p className="text-text-muted font-mono">{selectedWords[currentIndex].transcription}</p>
                                        </div>
                                        <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card bg-primary/5 flex flex-col items-center justify-center p-8 text-center border-4 border-primary">
                                            <div className="text-4xl font-bold mb-4">{selectedWords[currentIndex].meaning}</div>
                                            <p className="italic text-text-secondary">{selectedWords[currentIndex].example}</p>
                                        </div>
                                    </motion.div>
                                </div>
                                <div className="flex items-center justify-between mb-8">
                                    <Button variant="ghost" onClick={() => { setCurrentIndex(p => Math.max(0, p - 1)); setIsFlipped(false); }} disabled={currentIndex === 0}>← Trước</Button>
                                    <span className="font-bold">{currentIndex + 1} / {selectedWords.length}</span>
                                    {currentIndex < selectedWords.length - 1 ? (
                                        <Button variant="primary" onClick={() => { setCurrentIndex(p => p + 1); setIsFlipped(false); }}>Tiếp theo →</Button>
                                    ) : (
                                        <Button variant="accent" onClick={() => { setLearnStep(3); setMatchType(null); }}>Vào luyện tập →</Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {learnStep === 3 && (
                            <div className="max-w-4xl mx-auto text-center">
                                {!matchType ? (
                                    <div className="py-12">
                                        <h3 className="text-3xl font-bold mb-8">Chọn kiểu luyện tập</h3>
                                        <div className="flex justify-center gap-6">
                                            <Button variant="primary" className="px-10 py-5 text-lg" onClick={() => setMatchType('word')}>Từ ↔ Nghĩa</Button>
                                            <Button variant="secondary" className="px-10 py-5 text-lg" onClick={() => setMatchType('ipa')}>IPA ↔ Nghĩa</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <MatchingGame words={selectedWords} type={matchType} onFinish={handleFinishMatching} />
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {tab === 'minitest' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="minitest-tab">
                        <Minitest topicId={topicId} learnedWords={learnedWordsForMinitest} onFinish={onFinish} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- APP ---

export default function App() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [learningProgressState, setLearningProgressState] = useState<LearningProgressState | null>(null);
    const { toasts, addToast, removeToast } = useToasts();
    const { gameData, setGameData, xpFloats, addXP, triggerStreakCheck } = useGameProgress(addToast);

    const syncUserGameData = useCallback((user: AuthenticatedUser | null) => {
        setCurrentUser(user);
        setGameData(prev => ({
            ...prev,
            currentUser: user
                ? loadCurrentUserGameData(user.userId)
                : { ...EMPTY_CURRENT_USER_GAME_DATA }
        }));
    }, [setGameData]);

    const {
        isLoading,
        currentPage,
        setCurrentPage,
        selectedWord,
        vocabularyItems,
        topicFilters,
        isVocabularyLoading,
        studyTopicId,
        studyWords,
        testResult,
        handleStartStudy,
        handleSelectWord,
        handleFinishStudy
    } = useAppBootstrap({ addToast, syncUserGameData });

    const learningTopicGroups = useMemo(() => (
        buildLearningTopicGroups(topicFilters, vocabularyItems, learningProgressState)
    ), [topicFilters, vocabularyItems, learningProgressState]);

    const refreshLearningProgress = useCallback(async () => {
        if (!currentUser?.userId) {
            setLearningProgressState(null);
            return;
        }

        try {
            const nextState = await learningProgressApi.getState();
            setLearningProgressState(nextState);
        } catch {
            setLearningProgressState(null);
        }
    }, [currentUser?.userId]);

    const handleWordsLearned = useCallback(async (topicId: number, wordIds: number[]) => {
        if (!currentUser?.userId || topicId <= 0 || wordIds.length === 0) {
            return;
        }

        try {
            const nextState = await learningProgressApi.markWordsLearned(topicId, wordIds);
            setLearningProgressState(nextState);
        } catch {
            addToast('Không thể cập nhật tiến độ học lúc này.', 'info');
        }
    }, [currentUser?.userId, addToast]);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } finally {
            syncUserGameData(null);
            setCurrentPage('home');
            addToast('Đã đăng xuất.');
        }
    };

    useEffect(() => {
        if (!currentUser?.userId) {
            return;
        }

        saveCurrentUserGameData(currentUser.userId, gameData.currentUser);
    }, [currentUser?.userId, gameData.currentUser]);

    useEffect(() => {
        void refreshLearningProgress();
    }, [refreshLearningProgress]);

    return (
        <div className="min-h-screen bg-bg-light text-text-primary">
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-[#1A0A2E] flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1.1 }} transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse' }}>
                            <div className="text-8xl font-display font-extrabold text-white mb-6">VL</div>
                        </motion.div>
                        <div className="font-display font-bold text-2xl text-cyan tracking-wider">VocabLearning</div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Navbar
                activePage={currentPage}
                onNavigate={setCurrentPage}
                currentUser={currentUser}
                gameData={gameData.currentUser}
                onLogout={handleLogout}
                onStreakClick={() => setShowStreakModal(true)}
            />

            <main className="pb-24">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="w-full"
                    >
                        <AppRoutes
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            handleSelectWord={handleSelectWord}
                            vocabularyItems={vocabularyItems}
                            topicFilters={topicFilters}
                            isVocabularyLoading={isVocabularyLoading}
                            selectedWord={selectedWord}
                            syncUserGameData={syncUserGameData}
                            addToast={addToast}
                            handleStartStudy={handleStartStudy}
                            currentUser={currentUser}
                            gameData={gameData}
                            learningTopicGroups={learningTopicGroups}
                            learningProgressState={learningProgressState}
                            studyTopicId={studyTopicId}
                            studyWords={studyWords}
                            handleFinishStudy={handleFinishStudy}
                            addXP={addXP}
                            triggerStreakCheck={triggerStreakCheck}
                            handleWordsLearned={handleWordsLearned}
                            testResult={testResult}
                            handleLogout={handleLogout}
                            onOpenStreak={() => setShowStreakModal(true)}
                            LearningTopicsComponent={LearningTopics}
                            StudySessionComponent={StudySession}
                        />
                    </motion.div>
                </AnimatePresence>

                {!currentUser && currentPage === 'home' && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl bg-white/80 backdrop-blur-xl border-2 border-primary/30 p-6 rounded-card shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl shadow-lg">🎁</div>
                            <div>
                                <h4 className="font-bold text-xl mb-1 text-text-primary">Đăng ký để lưu tiến độ!</h4>
                                <p className="text-sm text-text-muted">Nhận ngay +100 XP thưởng và mở khóa Streak 🔥</p>
                            </div>
                        </div>
                        <Button variant="primary" className="px-8" onClick={() => setCurrentPage('auth')}>Tham gia Ngay <ChevronRight size={18} /></Button>
                    </motion.div>
                )}
            </main>

            <div className="toast-container fixed top-24 right-6 z-[500] pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
                    ))}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showStreakModal && <StreakModal isOpen={showStreakModal} onClose={() => setShowStreakModal(false)} gameData={gameData} />}
            </AnimatePresence>

            <AnimatePresence>
                {xpFloats.map(f => (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: -100 }} exit={{ opacity: 0 }} className="fixed left-1/2 -translate-x-1/2 z-[600] pointer-events-none font-display font-extrabold text-primary text-2xl drop-shadow-md">
                        +{f.amount} XP
                    </motion.div>
                ))}
            </AnimatePresence>

            <Footer />
        </div>
    );
}