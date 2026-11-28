import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  Headphones,
  Lightbulb,
  Play,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SkillsPractice, type SkillTab } from '../components/learning/SkillsPractice';
import { getTopicSkillsPack } from '../data/topicSkillsData';
import { getTopicIllustration } from '../utils/vocabIllustrations';
import { PATHS } from '../routes/paths';

const STORAGE_KEY = 'vocablearning_completed_skill_lessons_v1';

type UnitDef = {
  unitNumber: number;
  slug: string;
  titleEn: string;
  titleVi: string;
  cefr: string;
  shortTitles: Record<SkillTab, string>;
};

type LessonDef = {
  id: string;
  lessonNumber: number;
  unitNumber: number;
  unitSlug: string;
  topicTitleEn: string;
  topicTitleVi: string;
  cefr: string;
  skill: SkillTab;
  skillLabel: string;
  shortTitleVi: string;
  fullTitleVi: string;
  minutes: number;
};

const UNITS: UnitDef[] = [
  {
    unitNumber: 1,
    slug: 'food',
    titleEn: 'Food and Drinks',
    titleVi: 'Ẩm thực & Đồ uống',
    cefr: 'A1–A2',
    shortTitles: {
      grammar: 'Danh từ & Some / Any',
      listening: 'Gọi món tại quán ăn',
      reading: 'Bữa sáng của sinh viên',
    },
  },
  {
    unitNumber: 2,
    slug: 'home',
    titleEn: 'Home and Living',
    titleVi: 'Nhà cửa & Đời sống',
    cefr: 'A1–A2',
    shortTitles: {
      grammar: 'There is/are & Vị trí',
      listening: 'Tham quan căn hộ mới',
      reading: 'Phòng gọn giúp tập trung',
    },
  },
  {
    unitNumber: 3,
    slug: 'travel',
    titleEn: 'Travel and City',
    titleVi: 'Du lịch & Đô thị',
    cefr: 'A2',
    shortTitles: {
      grammar: 'Be going to & Lịch trình',
      listening: 'Check-in tại sân bay',
      reading: 'Mẹo xếp hành lý 5 ngày',
    },
  },
  {
    unitNumber: 4,
    slug: 'work',
    titleEn: 'Work and Study',
    titleVi: 'Công việc & Học tập',
    cefr: 'A2–B1',
    shortTitles: {
      grammar: 'Hiện tại hoàn thành',
      listening: 'Phỏng vấn thực tập',
      reading: 'Vượt qua deadline nhẹ nhàng',
    },
  },
  {
    unitNumber: 5,
    slug: 'health',
    titleEn: 'Health and Routine',
    titleVi: 'Sức khỏe & Thói quen',
    cefr: 'A2–B1',
    shortTitles: {
      grammar: 'Should / Shouldn\'t & Must',
      listening: 'Khám bệnh tại phòng khám',
      reading: '5 phút tăng năng lượng',
    },
  },
];

const SKILL_ICON: Record<SkillTab, typeof Lightbulb> = {
  grammar: Lightbulb,
  listening: Headphones,
  reading: BookOpenCheck,
};

function buildAllLessons(): LessonDef[] {
  const list: LessonDef[] = [];
  let num = 1;
  for (const unit of UNITS) {
    const pack = getTopicSkillsPack(unit.titleEn);
    list.push({
      id: `${unit.slug}-grammar`,
      lessonNumber: num++,
      unitNumber: unit.unitNumber,
      unitSlug: unit.slug,
      topicTitleEn: unit.titleEn,
      topicTitleVi: unit.titleVi,
      cefr: pack.grammar.cefr,
      skill: 'grammar',
      skillLabel: 'Ngữ pháp',
      shortTitleVi: unit.shortTitles.grammar,
      fullTitleVi: pack.grammar.title,
      minutes: 4,
    });
    list.push({
      id: `${unit.slug}-listening`,
      lessonNumber: num++,
      unitNumber: unit.unitNumber,
      unitSlug: unit.slug,
      topicTitleEn: unit.titleEn,
      topicTitleVi: unit.titleVi,
      cefr: pack.listening.cefr,
      skill: 'listening',
      skillLabel: 'Luyện nghe',
      shortTitleVi: unit.shortTitles.listening,
      fullTitleVi: pack.listening.title,
      minutes: 5,
    });
    list.push({
      id: `${unit.slug}-reading`,
      lessonNumber: num++,
      unitNumber: unit.unitNumber,
      unitSlug: unit.slug,
      topicTitleEn: unit.titleEn,
      topicTitleVi: unit.titleVi,
      cefr: pack.reading.cefr,
      skill: 'reading',
      skillLabel: 'Đọc hiểu',
      shortTitleVi: unit.shortTitles.reading,
      fullTitleVi: pack.reading.title,
      minutes: 5,
    });
  }
  return list;
}

const ALL_LESSONS = buildAllLessons();

function loadCompletedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export default function Skills() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [completedIds, setCompletedIds] = useState<string[]>(() => loadCompletedIds());

  const activeLessonId = searchParams.get('lesson');
  const activeLesson = useMemo(
    () => ALL_LESSONS.find((l) => l.id === activeLessonId) ?? null,
    [activeLessonId],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeLessonId]);

  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);

  const nextRecommendedLesson = useMemo(
    () => ALL_LESSONS.find((l) => !completedSet.has(l.id)) ?? ALL_LESSONS[0],
    [completedSet],
  );

  const openLesson = (lessonId: string) => {
    setSearchParams({ lesson: lessonId });
  };

  const closeLesson = () => {
    setSearchParams({});
  };

  const markCompleteAndAdvance = (lesson: LessonDef) => {
    const nextCompleted = completedSet.has(lesson.id)
      ? completedIds
      : [...completedIds, lesson.id];
    setCompletedIds(nextCompleted);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextCompleted));
    } catch {
      // Ignore storage quota errors
    }

    const nextIdx = ALL_LESSONS.findIndex((l) => l.id === lesson.id) + 1;
    if (nextIdx > 0 && nextIdx < ALL_LESSONS.length) {
      openLesson(ALL_LESSONS[nextIdx].id);
    } else {
      closeLesson();
    }
  };

  // =========================================================================
  // FOCUSED SINGLE-LESSON CLASSROOM (/skills?lesson=...)
  // =========================================================================
  if (activeLesson) {
    const nextIdx = ALL_LESSONS.findIndex((l) => l.id === activeLesson.id) + 1;
    const nextLesson = nextIdx < ALL_LESSONS.length ? ALL_LESSONS[nextIdx] : null;

    return (
      <div className="mx-auto max-w-[1000px] px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <button
              type="button"
              onClick={closeLesson}
              className="duo-btn duo-btn-surface duo-btn-sm shrink-0"
            >
              <ArrowLeft size={15} aria-hidden />
              Lộ trình
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-secondary">
                Bài {activeLesson.lessonNumber}/{ALL_LESSONS.length} · {activeLesson.skillLabel} · {activeLesson.topicTitleVi}
              </p>
              <h1 className="truncate text-lg font-extrabold tracking-[-0.02em] text-text-primary sm:text-xl">
                {activeLesson.fullTitleVi}
              </h1>
            </div>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            {activeLesson.minutes} phút · {activeLesson.cefr}
          </span>
        </header>

        <SkillsPractice
          key={activeLesson.id}
          topicTitle={activeLesson.topicTitleEn}
          focusedSkill={activeLesson.skill}
          lessonNumber={activeLesson.lessonNumber}
          nextLessonLabel={
            nextLesson ? `Bài ${nextLesson.lessonNumber}: ${nextLesson.skillLabel}` : undefined
          }
          onCompleteLesson={() => markCompleteAndAdvance(activeLesson)}
        />
      </div>
    );
  }

  // =========================================================================
  // ULTRA-CLEAN, LOW-TEXT 15-LESSON ROADMAP (/skills)
  // =========================================================================
  const completedCount = completedIds.length;
  const totalCount = ALL_LESSONS.length;
  const heroArt = getTopicIllustration(nextRecommendedLesson.topicTitleEn);

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-7 pb-20 sm:px-6 lg:px-8">
      {/* Minimal Header */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-text-primary sm:text-3xl">
            Lộ trình kỹ năng
          </h1>
          <span className="text-sm font-bold tabular-nums text-text-secondary">
            {completedCount}/{totalCount} bài
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate(PATHS.learning)}
          className="duo-btn duo-btn-surface duo-btn-sm shrink-0"
        >
          Học từ vựng
          <ArrowUpRight size={15} aria-hidden />
        </button>
      </header>

      {/* Clean Full-Bleed Spotlight (3 elements only) */}
      <section className="relative mb-10 overflow-hidden rounded-3xl shadow-[0_24px_48px_-26px_rgba(17,16,25,0.45)]">
        <img
          src={heroArt}
          alt={nextRecommendedLesson.topicTitleVi}
          className="h-[240px] w-full object-cover sm:h-[260px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(17,16,25,0.9) 0%, rgba(17,16,25,0.62) 52%, rgba(17,16,25,0.12) 100%)',
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10">
          <div className="max-w-lg">
            <p className="text-xs font-bold tracking-wide text-[#FCD34D]">
              BÀI {nextRecommendedLesson.lessonNumber} · {nextRecommendedLesson.skillLabel.toUpperCase()} · {nextRecommendedLesson.minutes} PHÚT
            </p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.025em] text-white sm:text-3xl">
              {nextRecommendedLesson.shortTitleVi}
            </h2>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => openLesson(nextRecommendedLesson.id)}
                className="duo-btn duo-btn-amber"
              >
                <Play size={15} fill="currentColor" aria-hidden />
                {completedCount === 0
                  ? 'Bắt đầu Bài 1'
                  : `Tiếp tục Bài ${nextRecommendedLesson.lessonNumber}`}
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Sleek Chapters (Minimal Scannable Cards) */}
      <div className="space-y-8">
        {UNITS.map((unit) => {
          const unitLessons = ALL_LESSONS.filter((l) => l.unitSlug === unit.slug);
          const unitDone = unitLessons.filter((l) => completedSet.has(l.id)).length;
          const cover = getTopicIllustration(unit.titleEn);

          return (
            <section key={unit.slug}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={cover}
                    alt={unit.titleVi}
                    className="h-10 w-14 shrink-0 rounded-xl object-cover"
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-lg font-extrabold tracking-[-0.02em] text-text-primary">
                      Chặng {unit.unitNumber} · {unit.titleVi}
                    </h3>
                    <span className="text-xs font-semibold text-text-muted">{unit.cefr}</span>
                  </div>
                </div>
                <span className="text-xs font-bold tabular-nums text-text-muted">
                  {unitDone}/3
                </span>
              </div>

              <div className="grid gap-3.5 md:grid-cols-3">
                {unitLessons.map((lesson) => {
                  const isDone = completedSet.has(lesson.id);
                  const isNext = nextRecommendedLesson.id === lesson.id;
                  const Icon = SKILL_ICON[lesson.skill];

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => openLesson(lesson.id)}
                      className={`group flex cursor-pointer flex-col justify-between rounded-2xl border bg-surface p-4 text-left transition-all duration-150 ${
                        isNext && !isDone
                          ? 'border-[#F59E0B] shadow-[0_10px_24px_-16px_rgba(245,158,11,0.55)]'
                          : 'border-border hover:border-primary/45'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-text-secondary">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon size={14} className="text-primary" aria-hidden />
                          Bài {lesson.lessonNumber} · {lesson.skillLabel}
                        </span>
                        {isDone ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981] text-white">
                            <Check size={12} strokeWidth={3} aria-hidden />
                          </span>
                        ) : (
                          <span className="text-text-muted">{lesson.minutes}p</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[15px] font-extrabold text-text-primary group-hover:text-primary">
                          {lesson.shortTitleVi}
                        </span>
                        <ArrowRight
                          size={15}
                          className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
                            isNext && !isDone ? 'text-[#D97706]' : 'text-text-muted group-hover:text-primary'
                          }`}
                          aria-hidden
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
