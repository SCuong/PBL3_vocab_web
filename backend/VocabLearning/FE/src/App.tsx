import React, { useState, useEffect, useMemo } from 'react';
import {
    BookOpen,
    Flame,
    Award,
    ChevronRight,
    Search,
    Filter,
    Volume2,
    Clock,
    Check,
    X,
    User,
    LogOut,
    LayoutDashboard,
    Edit2,
    Trash2,
    Plus,
    Star,
    Sparkles,
    Calendar,
    ArrowLeft,
    Settings,
    Shield,
    MessageSquare,
    Repeat,
    Brain,
    BarChart3,
    Moon,
    Sun,
    XCircle,
    PlusCircle,
    Users,
    UserPlus,
    Snowflake,
    ExternalLink,
    ChevronLeft,
    Trophy,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { authApi } from './services/authApi';
import {
    vocabularyApi,
    type VocabularyDetailItem,
    type VocabularyLearningItem,
    type VocabularyListItem,
    type VocabularyTopicItem
} from './services/vocabularyApi';

// --- CONSTANTS & MOCK DATA ---

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const XP_RULES = {
    LEARN_WORD: 10,
    MATCHING_CORRECT: 5,
    TEST_CORRECT: 20,
    STREAK_BONUS: (days: number) => days * 5,
    GROUP_BONUS: 50
};

const EMPTY_CURRENT_USER_GAME_DATA = {
    learnedWords: 0,
    streak: 0,
    xp: 0,
    streakFreezes: 0,
    lastStudyDate: '',
    studyHistory: [] as string[],
    rank: 0
};

const mapVocabularyToUiModel = (item: VocabularyListItem | VocabularyDetailItem) => ({
    id: item.id,
    word: item.word,
    transcription: item.ipa,
    meaning: item.meaning,
    cefr: item.cefr,
    topicId: item.topicId,
    topicName: item.topicName,
    example: 'examples' in item ? (item.examples[0]?.exampleEn || '') : '',
    exampleAudioUrl: 'examples' in item ? (item.examples[0]?.audioUrl?.trim() || '') : '',
    audioUrl: item.audioUrl?.trim() || ''
});

const mapLearningVocabularyToUiModel = (item: VocabularyLearningItem) => ({
    id: item.id,
    word: item.word,
    transcription: item.ipa,
    meaning: item.meaning,
    cefr: item.cefr,
    topicId: item.topicId,
    topicName: item.topicName,
    example: item.example || '',
    exampleAudioUrl: item.exampleAudioUrl?.trim() || '',
    audioUrl: item.audioUrl?.trim() || ''
});

const playPronunciationAudio = (audioUrl?: string, fallbackText?: string) => {
    // Try to play audio file if URL is provided and valid
    if (audioUrl && audioUrl.trim()) {
        const audio = new Audio(audioUrl);

        audio.onerror = () => {
            console.error(`Failed to load audio from: ${audioUrl}`);
            // If audio URL fails to load, fallback to text-to-speech
            if (fallbackText && 'speechSynthesis' in window) {
                useSpeechSynthesis(fallbackText);
            }
        };

        void audio.play().catch((error) => {
            console.error(`Failed to play audio from ${audioUrl}:`, error);
            // If audio fails to play, use text-to-speech
            if (fallbackText && 'speechSynthesis' in window) {
                useSpeechSynthesis(fallbackText);
            }
        });
        return;
    }

    // Fallback to text-to-speech if no audio URL
    if (fallbackText && 'speechSynthesis' in window) {
        useSpeechSynthesis(fallbackText);
    } else if (!fallbackText) {
        console.warn('No audio URL or fallback text provided');
    }
};

const useSpeechSynthesis = (text: string) => {
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

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Error with speech synthesis:', error);
    }
};

const mockData = {
    categories: [
        { id: 'comm', title: 'Daily Communication', icon: '💬', topicsCount: 10 },
        { id: 'work', title: 'Work & Education', icon: '💼', topicsCount: 9 },
        { id: 'health', title: 'Health', icon: '💪', topicsCount: 5 },
        { id: 'travel', title: 'Entertainment & Travel', icon: '✈️', topicsCount: 4 },
        { id: 'life', title: 'Daily Life', icon: '🏠', topicsCount: 10 },
        { id: 'emotions', title: 'Emotions & Opinions', icon: '💭', topicsCount: 3 },
        { id: 'science', title: 'Culture & Science', icon: '🌍', topicsCount: 3 },
    ],
    vocabulary: [
        { id: 1, word: 'Eloquent', transcription: '/ˈel.ə.kwənt/', meaning: 'Hùng hồn, có khả năng hùng biện', topicId: 1, cefr: 'C1', example: 'His eloquent speech moved the audience.' },
        { id: 2, word: 'Pragmatic', transcription: '/præɡˈmæt.ɪk/', meaning: 'Thực dụng, thực tế', topicId: 1, cefr: 'B2', example: 'We need a pragmatic approach to this problem.' },
        { id: 3, word: 'Resilient', transcription: '/rɪˈzɪl.jənt/', meaning: 'Kiên cường, mau phục hồi', topicId: 1, cefr: 'B2', example: 'She is a resilient woman who overcomes many obstacles.' },
        { id: 4, word: 'Meticulous', transcription: '/məˈtɪk.jə.ləs/', meaning: 'Tỉ mỉ, kỹ càng', topicId: 2, cefr: 'C1', example: 'He is meticulous about his appearance.' },
        { id: 5, word: 'Enigmatic', transcription: '/ˌen.ɪɡˈmæt.ɪk/', meaning: 'Bí ẩn, khó hiểu', topicId: 2, cefr: 'C2', example: 'The painting has an enigmatic smile.' },
        { id: 6, word: 'Innovation', transcription: '/ˌɪn.əˈveɪ.ʃən/', meaning: 'Sự đổi mới, sáng kiến', topicId: 11, cefr: 'B2', example: 'Innovation is the key to success.' },
        { id: 7, word: 'Strategy', transcription: '/ˈstræt.ə.dʒi/', meaning: 'Chiến lược', topicId: 11, cefr: 'B1', example: 'We need a new marketing strategy.' },
        { id: 8, word: 'Collaborate', transcription: '/kəˈlæb.ə.reɪt/', meaning: 'Cộng tác', topicId: 11, cefr: 'B2', example: 'We should collaborate on this project.' },
        { id: 9, word: 'Productive', transcription: '/prəˈdʌk.tɪv/', meaning: 'Năng suất', topicId: 3, cefr: 'B1', example: 'I had a very productive day.' },
        { id: 10, word: 'Deadline', transcription: '/ˈded.laɪn/', meaning: 'Hạn chót', topicId: 3, cefr: 'A2', example: 'The deadline for the project is tomorrow.' },
        { id: 11, word: 'Optimistic', transcription: '/ˌɒp.tɪˈmɪs.tɪk/', meaning: 'Lạc quan', topicId: 39, cefr: 'B2', example: 'She is optimistic about the future.' },
        { id: 12, word: 'Frustrated', transcription: '/frʌsˈtreɪ.tɪd/', meaning: 'Thất vọng, nản lòng', topicId: 39, cefr: 'B1', example: 'I feel frustrated when I can\'t solve a problem.' },
        { id: 13, word: 'Symptom', transcription: '/ˈsɪmp.təm/', meaning: 'Triệu chứng', topicId: 21, cefr: 'B2', example: 'Fever is a common symptom of the flu.' },
        { id: 14, word: 'Treatment', transcription: '/ˈtriːt.mənt/', meaning: 'Điều trị', topicId: 21, cefr: 'B1', example: 'The doctor suggested a new treatment.' },
        { id: 15, word: 'Adventure', transcription: '/ədˈven.tʃər/', meaning: 'Phiêu lưu', topicId: 26, cefr: 'A2', example: 'They went on an adventure in the mountains.' },
        { id: 16, word: 'Destination', transcription: '/ˌdes.tɪˈneɪ.ʃən/', meaning: 'Điểm đến', topicId: 26, cefr: 'B1', example: 'Paris is a popular travel destination.' },
        { id: 17, word: 'Recipe', transcription: '/ˈres.ɪ.pi/', meaning: 'Công thức nấu ăn', topicId: 36, cefr: 'A2', example: 'I found a great recipe for chocolate cake.' },
        { id: 18, word: 'Ingredient', transcription: '/ɪnˈɡriː.di.ənt/', meaning: 'Thành phần', topicId: 36, cefr: 'B1', example: 'Fresh ingredients are key to a good meal.' },
        { id: 19, word: 'Ecosystem', transcription: '/ˈiː.kəʊˌsɪs.təm/', meaning: 'Hệ sinh thái', topicId: 42, cefr: 'C1', example: 'The rainforest has a unique ecosystem.' },
        { id: 20, word: 'Sustainable', transcription: '/səˈsteɪ.nə.bəl/', meaning: 'Bền vững', topicId: 42, cefr: 'C1', example: 'We need to find more sustainable energy sources.' },
    ],
    topics: [
        // Daily Communication (1-10)
        { id: 1, catId: 'comm', title: 'Greetings and Introductions', description: 'Chào hỏi và giới thiệu bản thân cơ bản.', icon: '👋', stats: { new: 5, review: 2, learned: 8 } },
        { id: 2, catId: 'comm', title: 'Family', description: 'Từ vựng về các thành viên trong gia đình.', icon: '👨‍👩-👧‍👦', stats: { new: 8, review: 0, learned: 0 } },
        { id: 3, catId: 'comm', title: 'Friends and Relationships', description: 'Mối quan hệ bạn bè và xã hội.', icon: '🤝', stats: { new: 10, review: 5, learned: 0 } },
        { id: 4, catId: 'comm', title: 'Weather', description: 'Các hiện tượng thời tiết thường gặp.', icon: '☀️', stats: { new: 7, review: 0, learned: 0 } },
        { id: 5, catId: 'comm', title: 'Numbers and Dates', description: 'Số đếm, ngày tháng và thời gian.', icon: '📅', stats: { new: 12, review: 0, learned: 0 } },
        { id: 6, catId: 'comm', title: 'Colors', description: 'Màu sắc và cách mô tả.', icon: '🎨', stats: { new: 10, review: 0, learned: 0 } },
        { id: 7, catId: 'comm', title: 'Household Items', description: 'Đồ dùng trong gia đình.', icon: '🏠', stats: { new: 15, review: 0, learned: 0 } },
        { id: 8, catId: 'comm', title: 'Asking for and Giving Directions', description: 'Hỏi và chỉ đường.', icon: '📍', stats: { new: 8, review: 0, learned: 0 } },
        { id: 9, catId: 'comm', title: 'Shopping', description: 'Mua sắm và mặc cả.', icon: '🛍️', stats: { new: 10, review: 0, learned: 0 } },
        { id: 10, catId: 'comm', title: 'Ordering Food', description: 'Gọi món và hội thoại tại nhà hàng.', icon: '🍽️', stats: { new: 9, review: 0, learned: 0 } },

        // Work & Education (11-19)
        { id: 11, catId: 'work', title: 'Jobs and Occupations', description: 'Các ngành nghề và công việc.', icon: '👨‍💼', stats: { new: 12, review: 0, learned: 0 } },
        { id: 12, catId: 'work', title: 'Office', description: 'Môi trường văn phòng.', icon: '🏢', stats: { new: 10, review: 0, learned: 0 } },
        { id: 13, catId: 'work', title: 'School and Education', description: 'Trường học và giáo dục.', icon: '🎓', stats: { new: 15, review: 0, learned: 0 } },
        { id: 14, catId: 'work', title: 'Basic Email Communication', description: 'Giao tiếp qua email cơ bản.', icon: '📧', stats: { new: 8, review: 0, learned: 0 } },
        { id: 15, catId: 'work', title: 'Daily Tasks at Work', description: 'Công việc hàng ngày tại công sở.', icon: '📝', stats: { new: 10, review: 0, learned: 0 } },
        { id: 16, catId: 'work', title: 'Team Meetings', description: 'Họp nhóm và thảo luận.', icon: '👥', stats: { new: 7, review: 0, learned: 0 } },
        { id: 17, catId: 'work', title: 'Schedules and Time', description: 'Lịch trình và quản lý thời gian.', icon: '⏰', stats: { new: 9, review: 0, learned: 0 } },
        { id: 18, catId: 'work', title: 'Office Equipment', description: 'Thiết bị văn phòng.', icon: '🖨️', stats: { new: 6, review: 0, learned: 0 } },
        { id: 19, catId: 'work', title: 'Colleagues', description: 'Đồng nghiệp và quan hệ công sở.', icon: '🤝', stats: { new: 8, review: 0, learned: 0 } },

        // Health (20-24)
        { id: 20, catId: 'health', title: 'Body Parts', description: 'Các bộ phận trên cơ thể.', icon: '🦶', stats: { new: 20, review: 0, learned: 0 } },
        { id: 21, catId: 'health', title: 'Illnesses and Health', description: 'Bệnh tật và sức khỏe.', icon: '🤒', stats: { new: 12, review: 0, learned: 0 } },
        { id: 22, catId: 'health', title: 'Exercise and Sports', description: 'Tập luyện và thể thao.', icon: '🏃', stats: { new: 10, review: 0, learned: 0 } },
        { id: 23, catId: 'health', title: 'Healthy Habits', description: 'Thói quen lành mạnh.', icon: '🥗', stats: { new: 8, review: 0, learned: 0 } },
        { id: 24, catId: 'health', title: 'Diet and Nutrition', description: 'Chế độ ăn uống và dinh dưỡng.', icon: '🍎', stats: { new: 10, review: 0, learned: 0 } },

        // Entertainment & Travel (25-28)
        { id: 25, catId: 'travel', title: 'Movies and Music', description: 'Điện ảnh và âm nhạc.', icon: '🎬', stats: { new: 15, review: 0, learned: 0 } },
        { id: 26, catId: 'travel', title: 'Travel and Exploration', description: 'Du lịch và khám phá.', icon: '🌍', stats: { new: 12, review: 0, learned: 0 } },
        { id: 27, catId: 'travel', title: 'Famous Places', description: 'Các địa danh nổi tiếng.', icon: '🗽', stats: { new: 10, review: 0, learned: 0 } },
        { id: 28, catId: 'travel', title: 'Hotels and Accommodation', description: 'Khách sạn và nơi lưu trú.', icon: '🏨', stats: { new: 8, review: 0, learned: 0 } },

        // Daily Life (29-38)
        { id: 29, catId: 'life', title: 'Food and Drinks', description: 'Thực phẩm và đồ uống.', icon: '🍔', stats: { new: 15, review: 0, learned: 0 } },
        { id: 30, catId: 'life', title: 'Supermarket', description: 'Đi siêu thị.', icon: '🛒', stats: { new: 10, review: 0, learned: 0 } },
        { id: 31, catId: 'life', title: 'Transportation', description: 'Phương tiện giao thông.', icon: '🚌', stats: { new: 12, review: 0, learned: 0 } },
        { id: 32, catId: 'life', title: 'Pets and Animals', description: 'Thú cưng và động vật.', icon: '🐶', stats: { new: 15, review: 0, learned: 0 } },
        { id: 33, catId: 'life', title: 'Leisure Time', description: 'Thời gian rảnh rỗi.', icon: '🪁', stats: { new: 8, review: 0, learned: 0 } },
        { id: 34, catId: 'life', title: 'Clothing and Shopping', description: 'Quần áo và mua sắm.', icon: '👗', stats: { new: 10, review: 0, learned: 0 } },
        { id: 35, catId: 'life', title: 'Daily Routines', description: 'Thói quen hàng ngày.', icon: '🚿', stats: { new: 12, review: 0, learned: 0 } },
        { id: 36, catId: 'life', title: 'Kitchen and Cooking', description: 'Bếp núc và nấu ăn.', icon: '🍳', stats: { new: 10, review: 0, learned: 0 } },
        { id: 37, catId: 'life', title: 'House Cleaning', description: 'Dọn dẹp nhà cửa.', icon: '🧹', stats: { new: 8, review: 0, learned: 0 } },
        { id: 38, catId: 'life', title: 'Technology and Internet', description: 'Công nghệ và Internet.', icon: '🌐', stats: { new: 15, review: 0, learned: 0 } },

        // Emotions & Opinions (39-41)
        { id: 39, catId: 'emotions', title: 'Feelings and Emotions', description: 'Cảm xúc và tình cảm.', icon: '😊', stats: { new: 15, review: 0, learned: 0 } },
        { id: 40, catId: 'emotions', title: 'Hobbies', description: 'Sở thích cá nhân.', icon: '🎨', stats: { new: 10, review: 0, learned: 0 } },
        { id: 41, catId: 'emotions', title: 'Personal Opinions', description: 'Quan điểm cá nhân.', icon: '💬', stats: { new: 12, review: 0, learned: 0 } },

        // Culture & Science (42-44)
        { id: 42, catId: 'science', title: 'Nature and Environment', description: 'Tự nhiên và môi trường.', icon: '🌿', stats: { new: 12, review: 0, learned: 0 } },
        { id: 43, catId: 'science', title: 'Wildlife', description: 'Động vật hoang dã.', icon: '🦁', stats: { new: 10, review: 0, learned: 0 } },
        { id: 44, catId: 'science', title: 'Books and Literature', description: 'Sách và văn học.', icon: '📚', stats: { new: 15, review: 0, learned: 0 } },
    ],
    gameData: {
        leaderboard: [
            { id: 1, username: 'AlexPro', xp: 2450, avatar: '🦊', rank: 1 },
            { id: 2, username: 'MinhDev', xp: 2100, avatar: '🐱', rank: 2 },
            { id: 3, username: 'SarahLearner', xp: 1850, avatar: '🐼', rank: 3 },
            { id: 4, username: 'You', xp: 1200, avatar: '👤', rank: 12 },
            { id: 5, username: 'JohnDoe', xp: 950, avatar: '🐨', rank: 15 },
        ],
        currentUser: {
            streak: 5,
            xp: 1200,
            streakFreezes: 2,
            lastStudyDate: '2026-04-16',
            studyHistory: ['2026-04-16', '2026-04-15', '2026-04-14', '2026-04-13', '2026-04-12'],
            rank: 12
        },
        groupStreak: [
            { id: 1, username: 'AlexPro', streak: 12, status: 'done', avatar: '🦊' },
            { id: 2, username: 'You', streak: 5, status: 'done', avatar: '👤' },
            { id: 3, username: 'MinhDev', streak: 8, status: 'waiting', avatar: '🐱' }
        ]
    }
};

const readingPassages = [
    {
        topicId: 1,
        title: 'Modern Personalities',
        content: 'In today\'s fast-paced world, being pragmatic is often seen as a key to success. However, being eloquent and meticulous are equally important traits for leaders. A resilient person can bounce back from failures and maintain an enigmatic charm that inspires others.',
        questions: [
            { q: 'What is seen as a key to success?', options: ['Being pragmatic', 'Being emotional', 'Being lazy', 'Being loud'], correct: 0, explanation: 'Đoạn văn có ghi: "being pragmatic is often seen as a key to success".' },
            { q: 'Who needs to be eloquent and meticulous?', options: ['Students', 'Leaders', 'Artists', 'Drivers'], correct: 1, explanation: 'Đoạn văn nêu: "traits for leaders".' },
            { q: 'A resilient person can...', options: ['Give up easily', 'Bounce back from failure', 'Always be angry', 'Forget everything'], correct: 1, explanation: 'Đoạn văn ghi: "A resilient person can bounce back from failures".' },
            { q: 'The enigmatic charm...', options: ['Inspires others', 'Bores people', 'Scares children', 'Is annoying'], correct: 0, explanation: 'Đoạn văn có ý: "maintain an enigmatic charm that inspires others".' }
        ]
    },
    {
        topicId: 11,
        title: 'Modern Workplace Innovation',
        content: 'Innovation is the driving force behind modern jobs. Companies encourage employees to collaborate and develop a strategic mindset. Being productive isn\'t just about working hard, but working smart within the team.',
        questions: [
            { q: 'What is the driving force?', options: ['Salary', 'Innovation', 'Office space', 'Internet'], correct: 1, explanation: 'Text states: "Innovation is the driving force".' },
            { q: 'What should employees do?', options: ['Work alone', 'Collaborate', 'Sleep more', 'Watch movies'], correct: 1, explanation: 'Text says: "encourage employees to collaborate".' },
            { q: 'Productivity is about...', options: ['Working smart', 'Working 24/7', 'Being loud', 'Doing nothing'], correct: 0, explanation: 'Text states: "working smart within the team".' },
            { q: 'What kind of mindset is needed?', options: ['Strategic', 'Angry', 'Bored', 'Slow'], correct: 0, explanation: 'Text mentions: "develop a strategic mindset".' }
        ]
    },
    {
        topicId: 26,
        title: 'The Soul of Travel',
        content: 'Choosing a travel destination is more than just picking a spot on a map; it is an adventure into the unknown. Explorers seek experiences that challenge their perspectives and create lifelong memories.',
        questions: [
            { q: 'Picking a spot on a map is...', options: ['Everything', 'Just one part', 'Boring', 'Not necessary'], correct: 1, explanation: 'It is "more than just picking a spot".' },
            { q: 'What is an adventure?', options: ['The unknown', 'The map', 'The airport', 'The hotel'], correct: 0, explanation: 'It is "an adventure into the unknown".' },
            { q: 'Explorers seek...', options: ['Money', 'Memories', 'Food', 'Sleep'], correct: 1, explanation: 'They seek "experiences that... create lifelong memories".' },
            { q: 'What do experiences do?', options: ['Challenge perspectives', 'Waste time', 'Cost money', 'Are useless'], correct: 0, explanation: 'They "challenge their perspectives".' }
        ]
    }
];

// --- COMPONENTS ---

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
    const variants = {
        primary: 'bg-primary text-text-primary shadow-[0_4px_0_rgba(150,100,200,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(150,100,200,1)] hover:brightness-110',
        secondary: 'bg-secondary text-text-primary shadow-[0_4px_0_rgba(230,150,230,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(230,150,230,1)] hover:brightness-110',
        accent: 'bg-accent text-text-primary shadow-[0_4px_0_rgba(120,200,200,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(120,200,200,1)] hover:brightness-110',
        ghost: 'bg-white/40 backdrop-blur-sm border border-primary/20 hover:bg-white/60',
        danger: 'bg-red-500 text-white shadow-[0_4px_0_rgba(180,0,0,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(180,0,0,1)] hover:bg-red-600',
    };

    return (
        <button
            className={`px-6 py-2.5 rounded-pill font-display font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant as keyof typeof variants]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const Badge = ({ children, variant = 'purple', className = '' }: any) => {
    const variants = {
        purple: 'bg-purple/20 text-purple border-purple/30',
        cyan: 'bg-cyan/20 text-cyan border-cyan/30',
        pink: 'bg-pink/20 text-pink border-pink/30',
        green: 'bg-green-500/10 text-green-600 border-green-500/20',
        warn: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        red: 'bg-red-500/10 text-red-600 border-red-500/20',
        accent: 'bg-accent/20 text-text-primary border-accent/40',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </span>
    );
};

const Toast = ({ message, type = 'info', onClose }: any) => (
    <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="bg-white border-2 border-primary/30 rounded-card p-4 shadow-xl flex items-center gap-3 w-80 mb-4 pointer-events-auto"
    >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
            {type === 'success' ? <Check size={20} /> : <Sparkles size={20} />}
        </div>
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
    </motion.div>
);

const ChibiMascot = () => (
    <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-72 h-72 flex items-center justify-center"
    >
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
            {/* Head */}
            <circle cx="100" cy="100" r="70" fill="#FFF" stroke="#CC99FF" strokeWidth="4" />
            {/* Eyes */}
            <circle cx="75" cy="90" r="8" fill="#3D1A6E" />
            <circle cx="125" cy="90" r="8" fill="#3D1A6E" />
            <circle cx="78" cy="87" r="3" fill="#FFF" />
            <circle cx="128" cy="87" r="3" fill="#FFF" />
            {/* Cheeks */}
            <circle cx="60" cy="115" r="8" fill="#FFBBFF" opacity="0.6" />
            <circle cx="140" cy="115" r="8" fill="#FFBBFF" opacity="0.6" />
            {/* Smile */}
            <path d="M 85 130 Q 100 145 115 130" fill="none" stroke="#3D1A6E" strokeWidth="4" strokeLinecap="round" />
            {/* Cap */}
            <path d="M 50 60 L 100 30 L 150 60 L 100 90 Z" fill="#CC99FF" stroke="#3D1A6E" strokeWidth="3" />
            <rect x="95" y="15" width="10" height="20" fill="#3D1A6E" />
            {/* Tassel */}
            <circle cx="160" cy="75" r="6" fill="#99FFFF" />
            <path d="M 150 60 Q 160 65 160 75" fill="none" stroke="#3D1A6E" strokeWidth="2" />
            {/* Book */}
            <rect x="75" y="145" width="50" height="35" rx="5" fill="#FFBBFF" stroke="#3D1A6E" strokeWidth="3" />
            <line x1="85" y1="155" x2="115" y2="155" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            <line x1="85" y1="165" x2="115" y2="165" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-6 bg-primary/10 blur-md rounded-full" />
    </motion.div>
);

const UserWidget = ({ user, gameData, onNavigate, onStreakClick }: any) => (
    <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md border border-primary/20 rounded-pill px-4 py-1.5 shadow-sm">
        <div
            className="flex items-center gap-1.5 text-orange-500 font-bold cursor-pointer hover:scale-105 transition-transform"
            title="Streak"
            onClick={onStreakClick}
        >
            <Flame size={18} fill="currentColor" className={gameData.streak > 0 ? "flame-pulse" : ""} />
            <span>{gameData.streak}</span>
        </div>
        <div className="w-px h-4 bg-primary/20" />
        <div className="flex items-center gap-1.5 text-primary font-bold" title="XP">
            <Award size={18} />
            <span>{gameData.xp}</span>
        </div>
        <div className="w-px h-4 bg-primary/20" />
        <div
            className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-secondary flex items-center justify-center text-text-primary font-bold cursor-pointer text-xs"
            onClick={() => onNavigate('profile')}
        >
            {user.username[0].toUpperCase()}
        </div>
    </div>
);

const StreakHeatmap = ({ history }: { history: string[] }) => {
    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="heatmap-grid flex flex-wrap gap-1">
            {days.map(day => (
                <div
                    key={day}
                    className={`w-3 h-3 rounded-sm ${history.includes(day) ? 'bg-cyan' : 'bg-purple/10'}`}
                    title={day}
                />
            ))}
        </div>
    );
};

const StreakModal = ({ isOpen, onClose, gameData }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-text-primary/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-card w-full max-w-xl p-8 relative z-10 overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4">
                    <button onClick={onClose} className="p-2 hover:bg-purple/10 rounded-full transition-colors"><XCircle size={24} /></button>
                </div>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-orange-100 mb-6 shadow-glow">
                        <Flame size={48} className="text-orange-500 animate-pulse" fill="currentColor" />
                    </div>
                    <h2 className="text-4xl font-display font-bold mb-2">{gameData.currentUser.streak} Ngày Stream!</h2>
                    <p className="text-text-secondary">Bạn đang làm rất tốt, hãy duy trì phong độ nhé!</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                    <div className="bg-bg-light p-6 rounded-2xl border border-primary/10">
                        <h3 className="font-bold flex items-center gap-2 mb-4"><Calendar size={18} className="text-primary" /> Lịch sử học tập</h3>
                        <StreakHeatmap history={gameData.currentUser.studyHistory} />
                        <div className="mt-4 text-[10px] text-text-muted flex justify-between">
                            <span>30 ngày qua</span>
                            <span>Hôm nay</span>
                        </div>
                    </div>
                    <div className="bg-bg-light p-6 rounded-2xl border border-primary/10">
                        <h3 className="font-bold flex items-center gap-2 mb-4"><Trophy size={18} className="text-accent" /> Milestones</h3>
                        <div className="space-y-3">
                            {[7, 30, 100].map(m => (
                                <div key={m} className={`flex items-center gap-3 p-2 rounded-lg border ${gameData.currentUser.streak >= m ? 'bg-primary/10 border-primary/20' : 'opacity-40 border-transparent'}`}>
                                    <div className="text-xl">{m === 7 ? '🔥' : m === 30 ? '🏆' : '👑'}</div>
                                    <div className="text-sm font-bold">{m} Ngày</div>
                                    {gameData.currentUser.streak >= m && <Check size={14} className="ml-auto text-green-600" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-accent/30 bg-accent/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2"><Users size={20} className="text-primary" /> Challenge Streak Nhóm</h3>
                        <Badge variant="accent">{gameData.groupStreak.length}/3 Bạn</Badge>
                    </div>

                    <div className="flex gap-4 mb-6">
                        {gameData.groupStreak.map((member: any) => (
                            <div key={member.id} className="flex-1 flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-2xl shadow-md border-2 border-white">
                                        {member.avatar}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-sm ${member.status === 'done' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                                        {member.status === 'done' ? '✅' : '⏳'}
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-center leading-tight">
                                    {member.username}
                                    <div className="text-[10px] text-text-muted">{member.streak}d</div>
                                </div>
                            </div>
                        ))}
                        {gameData.groupStreak.length < 3 && (
                            <button className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 rounded-full bg-purple/5 border-2 border-dashed border-purple/30 flex items-center justify-center text-purple group-hover:bg-purple/10 transition-colors">
                                    <PlusCircle size={24} />
                                </div>
                                <div className="text-[10px] font-bold text-text-muted">Invite</div>
                            </button>
                        )}
                    </div>

                    <Button variant="accent" className="w-full">Mời bạn tham gia +50 XP 🚀</Button>
                </div>
            </motion.div>
        </div>
    );
};

const Navbar = ({ activePage, onNavigate, currentUser, gameData, onLogout, onStreakClick }: any) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = [
        { id: 'home', label: 'Home' },
        { id: 'vocabulary', label: 'Vocabulary' },
        { id: 'learning-topics', label: 'Learning' },
        { id: 'leaderboard', label: 'Leaderboard' },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/55 backdrop-blur-lg border-b border-purple/20 px-6 py-4 flex items-center justify-between">
            <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onNavigate('home')}
            >
                <span className="font-display font-extrabold text-2xl bg-linear-to-r from-cyan to-pink bg-clip-text text-transparent">VL</span>
                <span className="font-display font-bold text-xl hidden sm:inline">VocabLearning</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
                {navLinks.map(link => (
                    <button
                        key={link.id}
                        onClick={() => onNavigate(link.id)}
                        className={`relative font-medium transition-colors ${activePage === link.id ? 'text-purple' : 'text-text-secondary hover:text-pink'}`}
                    >
                        {link.label}
                        {activePage === link.id && (
                            <motion.div
                                layoutId="nav-active"
                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-pill bg-linear-to-r from-cyan to-pink"
                            />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4">
                {currentUser ? (
                    <div className="flex items-center gap-3">
                        <UserWidget user={currentUser} gameData={gameData} onNavigate={onNavigate} onStreakClick={onStreakClick} />
                        <Button variant="ghost" className="hidden sm:flex" onClick={onLogout}><LogOut size={18} /></Button>
                    </div>
                ) : (
                    <Button variant="primary" onClick={() => onNavigate('auth')}>Login</Button>
                )}
            </div>
        </nav>
    );
};

const Home = ({ onNavigate }: any) => (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
                    Master English <br />
                    <span className="bg-linear-to-r from-cyan via-purple to-pink bg-clip-text text-transparent">Vocabulary</span>
                </h1>
                <p className="text-xl text-text-secondary mb-10 max-w-lg">
                    Learn smarter with spaced repetition — 10 words at a time. Aesthetic, effective, and fun.
                </p>
                <div className="flex flex-wrap gap-4">
                    <Button variant="primary" className="text-lg px-10" onClick={() => onNavigate('learning-topics')}>
                        Bắt đầu học <ChevronRight size={20} />
                    </Button>
                    <Button variant="secondary" className="text-lg px-10" onClick={() => onNavigate('vocabulary')}>
                        Xem từ vựng
                    </Button>
                </div>
                <div className="mt-16 flex items-center gap-8 text-text-muted">
                    <div>
                        <div className="text-2xl font-bold text-text-primary">2,400+</div>
                        <div className="text-sm">Từ vựng</div>
                    </div>
                    <div className="w-px h-10 bg-purple/20" />
                    <div>
                        <div className="text-2xl font-bold text-text-primary">6</div>
                        <div className="text-sm">CEFR Levels</div>
                    </div>
                    <div className="w-px h-10 bg-purple/20" />
                    <div>
                        <div className="text-2xl font-bold text-text-primary">∞</div>
                        <div className="text-sm">Spaced review</div>
                    </div>
                </div>
            </motion.div>
            <div className="relative flex justify-center">
                <ChibiMascot />
                <div className="mesh-orb w-64 h-64 bg-accent top-0 -right-10 opacity-30" />
                <div className="mesh-orb w-48 h-48 bg-secondary bottom-0 -left-10 opacity-30" />
            </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
            {[
                { icon: <BookOpen className="text-cyan" />, title: "Học theo Flashcard", desc: "Flip card trực quan, audio phát âm chuẩn bản xứ." },
                { icon: <Brain className="text-purple" />, title: "Spaced Repetition", desc: "Ôn đúng lúc bạn sắp quên để ghi nhớ lâu dài." },
                { icon: <BarChart3 className="text-pink" />, title: "Theo dõi tiến độ", desc: "Biết chính xác bao nhiêu từ đã thuộc mỗi ngày." }
            ].map((feat, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    viewport={{ once: true }}
                    className="glass-card p-8 hover:translate-y-[-8px] transition-transform duration-300"
                >
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
                        {feat.icon}
                    </div>
                    <h3 className="text-xl mb-3">{feat.title}</h3>
                    <p className="text-text-secondary leading-relaxed">{feat.desc}</p>
                </motion.div>
            ))}
        </div>

        {/* Levels Section */}
        <div className="mt-40 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
            >
                <Badge variant="purple" className="mb-4">CEFR Framework</Badge>
                <h2 className="text-4xl md:text-5xl mb-16">Từ Newbie đến Master</h2>
                <div className="flex flex-wrap justify-center gap-4">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl, i) => (
                        <motion.div
                            key={lvl}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                            className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-white border-2 border-primary/10 shadow-sm flex items-center justify-center text-2xl md:text-3xl font-display font-bold text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-default"
                        >
                            {lvl}
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    </div>
);

const Vocabulary = ({ onNavigate, onSelectWord, items, isLoading, topics }: any) => {
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
                {filtered.map(v => (
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

const Auth = ({ onLogin, onAddToast }: any) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async () => {
        if (isSubmitting) {
            return;
        }

        setErrorMessage('');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                const user = await authApi.login({
                    usernameOrEmail,
                    password,
                    rememberMe: true
                });
                onLogin(user);
                onAddToast?.('Đăng nhập thành công!', 'success');
            } else {
                const user = await authApi.register({
                    name,
                    email,
                    password
                });
                onLogin(user);
                onAddToast?.('Đăng ký thành công!', 'success');
            }
        } catch (error: any) {
            const message = error?.message || 'Không thể kết nối tới hệ thống xác thực.';
            setErrorMessage(message);
            onAddToast?.(message, 'info');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-6 py-24">
            <div className="glass-card p-10">
                <h2 className="text-3xl text-center mb-8">{isLogin ? 'Đăng nhập' : 'Đăng ký'}</h2>
                <div className="space-y-4 mb-8">
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Tên hiển thị"
                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}

                    {isLogin ? (
                        <input
                            type="text"
                            placeholder="Tên đăng nhập hoặc email"
                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                            value={usernameOrEmail}
                            onChange={(e) => setUsernameOrEmail(e.target.value)}
                        />
                    ) : (
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    )}

                    <input
                        type="password"
                        placeholder="Mật khẩu"
                        className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {errorMessage && (
                        <div className="text-sm text-red-500 font-medium">{errorMessage}</div>
                    )}

                    <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                        {isLogin ? 'Vào học ngay' : 'Tạo tài khoản'}
                    </Button>
                </div>
                <p className="text-center text-text-secondary text-sm">
                    {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                    <button
                        className="text-primary font-bold ml-2 underline"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setErrorMessage('');
                        }}
                    >
                        {isLogin ? 'Đăng ký' : 'Đăng nhập'}
                    </button>
                </p>
            </div>
        </div>
    );
};

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
                                                const isLearnedOut = !isGuest && topic.stats.new === 0;

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
                                                                    <div className="h-full bg-linear-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${Math.min(100, topic.stats.learned * 10)}%` }} />
                                                                </div>
                                                                <div className="text-[10px] text-text-muted text-right font-medium">Tiến độ: {Math.min(100, topic.stats.learned * 10)}%</div>
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

const StudySession = ({ topicId, studyWords, onFinish, onAddXP, onStreakCheck, onAddToast }: any) => {
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
    const topic = mockData.topics.find(t => t.id === topicId);
    const category = mockData.categories.find(c => c.id === topic?.catId);

    const selectedWords = useMemo(() =>
        words.filter(w => selectedWordIds.includes(w.id)),
        [words, selectedWordIds]
    );

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

    const handleFinishMatching = (correct: number, total: number, time: number) => {
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
                <button onClick={() => onFinish()} className="hover:text-primary transition-colors">{category?.title}</button>
                <ChevronRight size={14} />
                <span className="text-primary font-bold">{topic?.title}</span>
            </nav>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => onFinish()} className="p-2 rounded-full min-h-0">
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-5xl mb-2 font-display font-extrabold text-text-primary">{topic?.title}</h1>               <div className="flex gap-2">
                            <Badge variant="cyan" className="text-xs">🆕 {topic?.stats?.new}</Badge>
                            <Badge variant="purple" className="text-xs">🔔 {topic?.stats?.review}</Badge>
                            <Badge variant="green" className="text-xs font-bold">✅ {topic?.stats?.learned}</Badge>
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
                        <Minitest topicId={topicId} onFinish={onFinish} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MinitestResult = ({ score, total, detail, onBack }: any) => (
    <div className="max-w-4xl mx-auto px-6 py-24">
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-16 text-center shadow-2xl relative overflow-hidden"
        >
            <div className="mesh-orb w-64 h-64 bg-primary top-[-32px] right-[-32px] opacity-20" />
            <div className="relative z-10">
                <div className="text-9xl font-display font-extrabold bg-linear-to-r from-cyan via-purple to-pink bg-clip-text text-transparent mb-8">
                    {score}<span className="text-4xl text-text-muted">/{total}</span>
                </div>
                <h2 className="text-4xl mb-6 font-bold">Làm tốt lắm! 🎉</h2>

                {detail?.bonus > 0 && (
                    <div className="mb-12 inline-block px-6 py-3 bg-linear-to-r from-yellow-400 to-orange-500 rounded-pill text-white font-bold shadow-lg animate-bounce">
                        🔥 Perfect Reading Bonus: +50 XP
                    </div>
                )}

                <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto mb-16">
                    <div className="p-6 bg-purple/5 rounded-2xl border border-purple/10">
                        <div className="text-text-muted text-sm uppercase font-bold mb-2">Điền Từ</div>
                        <div className="text-3xl font-bold text-primary">{detail?.fill || 0}/5</div>
                    </div>
                    <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10">
                        <div className="text-text-muted text-sm uppercase font-bold mb-2">Reading</div>
                        <div className="text-3xl font-bold text-secondary">{detail?.reading || 0}/4</div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-6">
                    <Button variant="primary" className="px-12 py-5 text-xl" onClick={() => onBack('learning-topics')}>
                        Tiếp tục lộ trình <ChevronRight size={24} />
                    </Button>
                    <Button variant="secondary" className="px-12 py-5 text-xl" onClick={() => onBack('home')}>
                        Về trang chủ
                    </Button>
                </div>
            </div>
        </motion.div>
    </div>
);

const Leaderboard = ({ gameData }: any) => {
    const leaderboard = gameData?.leaderboard || [];
    const top3 = leaderboard.slice(0, 3);
    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="text-center mb-16"><h1 className="text-4xl mb-4">Bảng xếp hạng</h1></header>
            <div className="podium items-end mb-16 flex justify-center gap-4">
                {top3.length > 1 && (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-4 border-primary p-1 mb-2 shadow-lg"><div className="w-full h-full rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-3xl">{top3[1].avatar}</div></div>
                        <div className="font-bold text-sm mb-2">{top3[1].username}</div>
                        <div className="w-32 h-32 bg-primary/20 rounded-t-xl flex items-center justify-center text-4xl font-display border-x border-t border-primary/30">2</div>
                    </div>
                )}
                {top3.length > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-accent p-1 mb-4 shadow-xl scale-110"><div className="w-full h-full rounded-full bg-linear-to-br from-accent to-secondary flex items-center justify-center text-4xl">{top3[0].avatar}</div></div>
                        <div className="font-bold mb-2">{top3[0].username}</div>
                        <div className="w-40 h-48 bg-accent/20 rounded-t-xl flex items-center justify-center text-6xl font-display border-x border-t border-accent/30 shadow-inner">1</div>
                    </div>
                )}
                {top3.length > 2 && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-4 border-secondary p-1 mb-2 shadow-sm"><div className="w-full h-full rounded-full bg-linear-to-br from-secondary to-primary flex items-center justify-center text-2xl">{top3[2].avatar}</div></div>
                        <div className="font-bold text-xs mb-2">{top3[2].username}</div>
                        <div className="w-28 h-24 bg-secondary/20 rounded-t-xl flex items-center justify-center text-3xl font-display border-x border-t border-secondary/30">3</div>
                    </div>
                )}
            </div>
            <div className="glass-card divide-y divide-purple/10">
                {leaderboard.map((u: any, i: number) => (
                    <div key={u.id} className="flex items-center gap-6 p-6 hover:bg-purple/5 transition-colors">
                        <div className="font-mono text-xl font-bold w-10 text-text-muted">#{i + 1}</div>
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm border border-primary/10">{u.avatar}</div>
                        <div className="flex-1 font-bold">{u.username}</div>
                        <div className="font-mono text-primary font-bold">{u.xp} XP</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Profile = ({ user, onLogout, gameData, onFreezeStreak, onOpenStreak }: any) => (
    <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-8">
                <div className="glass-card p-10 text-center">
                    <div className="w-32 h-32 rounded-full bg-linear-to-br from-primary to-secondary mx-auto mb-6 flex items-center justify-center text-5xl font-display text-white shadow-xl">{user.username[0]}</div>
                    <h2 className="text-3xl mb-1">{user.username}</h2>
                    <p className="text-text-muted mb-8">{user.email}</p>
                    <div className="space-y-3">
                        <Button variant="ghost" className="w-full">Edit Profile</Button>
                        <Button variant="danger" className="w-full" onClick={onLogout}>Logout</Button>
                    </div>
                </div>
                <div className="glass-card p-8 bg-linear-to-br from-accent/20 to-secondary/20 border-accent/30">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-primary" /> Nhóm Streak</h3>
                    <p className="text-sm text-text-muted mb-6">Mời thêm bạn bè để cùng nhau nhận Group Bonus XP!</p>
                    <Button variant="primary" className="w-full" onClick={onOpenStreak}><UserPlus size={18} /> Mời bạn tham gia</Button>
                </div>
            </div>
            <div className="md:col-span-2 space-y-8">
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Words', value: user.learnedWords || 0, icon: <BookOpen className="text-cyan" /> },
                        { label: 'Streak', value: user.streak || 0, icon: <Flame className="text-orange-500" /> },
                        { label: 'XP', value: user.xp || 0, icon: <Award className="text-pink" /> }
                    ].map((s, i) => (
                        <div key={i} className="glass-card p-6 text-center">
                            <div className="flex justify-center mb-2">{s.icon}</div>
                            <div className="text-3xl font-bold">{s.value}</div>
                            <div className="text-xs uppercase tracking-widest text-text-muted">{s.label}</div>
                        </div>
                    ))}
                </div>
                <div className="glass-card p-8">
                    <h3 className="text-xl mb-6">Study History (30 Days)</h3>
                    <StreakHeatmap history={user.studyHistory} />
                </div>
            </div>
        </div>
    </div>
);

const AdminDashboard = () => (
    <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl mb-12">Admin Control</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8"><h3>Users</h3><p className="text-4xl font-bold">1,280</p></div>
            <div className="glass-card p-8"><h3>Topics</h3><p className="text-4xl font-bold">42</p></div>
            <div className="glass-card p-8"><h3>Words</h3><p className="text-4xl font-bold">2,450</p></div>
        </div>
    </div>
);

const Footer = () => (
    <footer className="mt-20 py-12 border-t border-primary/10 bg-white/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div>
                <div className="font-display font-extrabold text-2xl bg-linear-to-r from-cyan to-pink bg-clip-text text-transparent mb-2">VocabLearning</div>
                <p className="text-text-muted text-sm tracking-wide uppercase font-bold opacity-60">© 2026 Build with Sparkles ✨</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 text-sm">
                <div className="font-bold text-primary uppercase tracking-[0.2em] mb-1">Contact Us</div>
                <a
                    href="mailto:thai.na20p0161@gmail.com"
                    className="text-text-primary hover:text-primary transition-colors font-medium underline underline-offset-4 decoration-primary/30"
                >
                    thai.na20p0161@gmail.com
                </a>
            </div>
        </div>
    </footer>
);

// --- APP ---

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('home');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [gameData, setGameData] = useState({
        ...mockData.gameData,
        currentUser: { ...EMPTY_CURRENT_USER_GAME_DATA }
    });
    const [selectedWord, setSelectedWord] = useState<any>(null);
    const [vocabularyItems, setVocabularyItems] = useState<any[]>([]);
    const [topicFilters, setTopicFilters] = useState<VocabularyTopicItem[]>([]);
    const [isVocabularyLoading, setIsVocabularyLoading] = useState(false);
    const [studyTopicId, setStudyTopicId] = useState<number | null>(null);
    const [studyWords, setStudyWords] = useState<any[]>([]);
    const [testResult, setTestResult] = useState<{ score: number, total: number, detail?: any } | null>(null);
    const [xpFloats, setXpFloats] = useState<{ id: number, amount: number }[]>([]);
    const [toasts, setToasts] = useState<{ id: number, message: string, type?: string }[]>([]);
    const [showStreakModal, setShowStreakModal] = useState(false);

    const learningTopicGroups = useMemo(() => {
        const byParent = topicFilters.filter(topic => !topic.parentTopicId);
        const children = topicFilters.filter(topic => topic.parentTopicId);

        if (byParent.length === 0 && topicFilters.length > 0) {
            return [
                {
                    id: 'all',
                    title: 'Chủ đề học tập',
                    topics: topicFilters.map(topic => {
                        const totalWords = vocabularyItems.filter(item => item.topicId === topic.topicId).length;
                        return {
                            id: topic.topicId,
                            title: topic.name,
                            description: topic.description,
                            stats: { new: totalWords, review: 0, learned: 0 }
                        };
                    })
                }
            ];
        }

        return byParent.map(parent => {
            const childTopics = children.filter(topic => topic.parentTopicId === parent.topicId);
            const topics = (childTopics.length > 0 ? childTopics : [parent]).map(topic => {
                const totalWords = vocabularyItems.filter(item => item.topicId === topic.topicId).length;

                return {
                    id: topic.topicId,
                    title: topic.name,
                    description: topic.description,
                    stats: { new: totalWords, review: 0, learned: 0 }
                };
            });

            return {
                id: String(parent.topicId),
                title: parent.name,
                topics
            };
        });
    }, [topicFilters, vocabularyItems]);

    const addToast = (message: string, type: string = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const addXP = (amount: number) => {
        setGameData(prev => ({
            ...prev,
            currentUser: { ...prev.currentUser, xp: prev.currentUser.xp + amount }
        }));
        const id = Date.now();
        setXpFloats(prev => [...prev, { id, amount }]);
        setTimeout(() => setXpFloats(prev => prev.filter(f => f.id !== id)), 2000);
    };

    const triggerStreakCheck = () => {
        const today = new Date().toISOString().split('T')[0];
        if (gameData.currentUser.lastStudyDate !== today) {
            setGameData(prev => ({
                ...prev,
                currentUser: { ...prev.currentUser, streak: prev.currentUser.streak + 1, lastStudyDate: today }
            }));
            addXP(XP_RULES.STREAK_BONUS(gameData.currentUser.streak + 1));
            addToast(`Streak ${gameData.currentUser.streak + 1} ngày! 🔥`, 'success');
        }
    };

    const loadVocabulary = async () => {
        setIsVocabularyLoading(true);
        try {
            const [items, topics] = await Promise.all([
                vocabularyApi.getAll(),
                vocabularyApi.getTopics()
            ]);
            setVocabularyItems(items.map(mapVocabularyToUiModel));
            setTopicFilters(topics);
        } catch {
            setVocabularyItems([]);
            setTopicFilters([]);
            addToast('Không tải được danh sách từ vựng từ hệ thống.', 'info');
        } finally {
            setIsVocabularyLoading(false);
        }
    };

    const handleStartStudy = async (topicId: number) => {
        setStudyTopicId(topicId);
        try {
            const items = await vocabularyApi.getLearningByTopic(topicId);
            setStudyWords(items.map(mapLearningVocabularyToUiModel));
        } catch {
            setStudyWords([]);
            addToast('Không tải được dữ liệu học cho chủ đề này.', 'info');
        }

        setCurrentPage('study-session');
    };

    const handleSelectWord = async (word: any) => {
        try {
            const detail = await vocabularyApi.getById(word.id);
            setSelectedWord(mapVocabularyToUiModel(detail));
        } catch {
            setSelectedWord(word);
        }

        setCurrentPage('vocab-detail');
    };

    const handleFinishStudy = (score?: number, total?: number, detail?: any) => {
        if (score !== undefined && total !== undefined) {
            setTestResult({ score, total, detail });
            setCurrentPage('minitest-result');
        } else {
            setCurrentPage('learning-topics');
        }
    };

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } finally {
            setCurrentUser(null);
            setGameData(prev => ({
                ...prev,
                currentUser: { ...EMPTY_CURRENT_USER_GAME_DATA }
            }));
            setCurrentPage('home');
            addToast('Đã đăng xuất.');
        }
    };

    useEffect(() => {
        let isDisposed = false;

        const bootstrap = async () => {
            const splashTimer = new Promise(resolve => setTimeout(resolve, 1200));
            const [session] = await Promise.all([
                authApi.me(),
                loadVocabulary()
            ]);

            if (!isDisposed && session?.succeeded && session.user) {
                setCurrentUser(session.user);
                setGameData(prev => ({
                    ...prev,
                    currentUser: { ...EMPTY_CURRENT_USER_GAME_DATA }
                }));
            }

            await splashTimer;
            if (!isDisposed) {
                setIsLoading(false);
            }
        };

        bootstrap();
        return () => {
            isDisposed = true;
        };
    }, []);

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
                        {currentPage === 'home' && <Home onNavigate={setCurrentPage} />}
                        {currentPage === 'vocabulary' && <Vocabulary onNavigate={setCurrentPage} onSelectWord={handleSelectWord} items={vocabularyItems} topics={topicFilters} isLoading={isVocabularyLoading} />}
                        {currentPage === 'vocab-detail' && <VocabDetail word={selectedWord} onBack={() => setCurrentPage('vocabulary')} />}
                        {currentPage === 'auth' && <Auth onLogin={(u: any) => {
                            setCurrentUser(u);
                            setGameData(prev => ({
                                ...prev,
                                currentUser: { ...EMPTY_CURRENT_USER_GAME_DATA }
                            }));
                            setCurrentPage('home');
                        }} onAddToast={addToast} />}
                        {currentPage === 'learning-topics' && <LearningTopics onStartStudy={handleStartStudy} currentUser={currentUser} gameData={gameData.currentUser} onNavigate={setCurrentPage} topicGroups={learningTopicGroups} />}
                        {currentPage === 'study-session' && <StudySession topicId={studyTopicId} studyWords={studyWords} onFinish={handleFinishStudy} onAddXP={addXP} onStreakCheck={triggerStreakCheck} onAddToast={addToast} />}
                        {currentPage === 'minitest-result' && <MinitestResult score={testResult?.score} total={testResult?.total} onBack={setCurrentPage} />}
                        {currentPage === 'profile' && <Profile user={{ ...currentUser, ...gameData.currentUser }} onLogout={handleLogout} gameData={gameData} onFreezeStreak={() => { }} onOpenStreak={() => setShowStreakModal(true)} />}
                        {currentPage === 'leaderboard' && <Leaderboard gameData={gameData} />}
                        {currentPage === 'admin' && <AdminDashboard />}
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
                        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
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