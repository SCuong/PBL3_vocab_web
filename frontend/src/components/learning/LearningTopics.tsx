import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Badge, Button } from "../ui";
import { useAppContext } from "../../context/AppContext";
import { PATHS } from "../../routes/paths";
import { vocabularyApi } from "../../services/vocabularyApi";
import { mapLearningVocabularyToUiModel } from "../../utils/vocabularyMapper";

const toCategorySectionId = (id: unknown) =>
  `learning-topic-${String(id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

const LearningTopics = () => {
  const navigate = useNavigate();
  const topicScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { currentUser, learningTopicGroups: topicGroups, addToast } = useAppContext();

  const onStartStudy = useCallback(async (topicId: number, mode?: string) => {
    try {
      const items = await vocabularyApi.getLearningByTopic(topicId);
      if (!items || items.length === 0) {
        addToast('Chủ đề này chưa có từ vựng.', 'info');
        return;
      }
      navigate(PATHS.learningStudy, {
        state: { topicId, words: items.map(mapLearningVocabularyToUiModel), mode: mode ?? null },
      });
    } catch {
      addToast('Không tải được dữ liệu học cho chủ đề này.', 'info');
    }
  }, [navigate, addToast]);
  const isGuest = !currentUser;

  const categoryNavItems = useMemo(
    () => topicGroups.map((cat: any, index: number) => ({
      id: String(cat.id),
      sectionId: toCategorySectionId(cat.id),
      title: cat.title,
      count: Array.isArray(cat.topics) ? cat.topics.length : 0,
      locked: isGuest && index > 0,
    })),
    [isGuest, topicGroups],
  );

  const scrollToCategory = useCallback((sectionId: string) => {
    const target = document.getElementById(sectionId);
    const scrollContainer = topicScrollContainerRef.current;

    if (!target) return;

    if (
      scrollContainer?.contains(target) &&
      scrollContainer.scrollHeight > scrollContainer.clientHeight
    ) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      scrollContainer.scrollTo({
        top: scrollContainer.scrollTop + targetRect.top - containerRect.top,
        behavior: "smooth",
      });
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const totalReviewCount = isGuest ? 0 : topicGroups.reduce(
    (sum: number, cat: any) => sum + cat.topics.reduce((s: number, t: any) => s + (t.stats?.review || 0), 0), 0
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;

    const syncPageScrollLock = () => {
      const overflowValue = mediaQuery.matches ? "hidden" : "";
      document.body.style.overflow = overflowValue || previousBodyOverflow;
      document.documentElement.style.overflow = overflowValue || previousRootOverflow;
    };

    syncPageScrollLock();
    mediaQuery.addEventListener("change", syncPageScrollLock);

    return () => {
      mediaQuery.removeEventListener("change", syncPageScrollLock);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-4 relative lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col lg:overflow-hidden">
      {/* Guest Banner */}
      {isGuest && (
        <div className="mb-4 p-4 bg-linear-to-r from-cyan/80 via-purple/80 to-pink/80 rounded-2xl flex items-center justify-between  border border-text-on-accent/20 shadow-xl animate-fade-in lg:shrink-0">
          <div className="flex items-center gap-4 text-text-on-accent">
            <div className="w-10 h-10 rounded-full bg-surface/20 flex items-center justify-center text-xl">
              ✨
            </div>
            <p className="font-bold">
              Bạn đang xem chế độ khách. Đăng ký để mở khóa toàn bộ 44 chủ đề!
            </p>
          </div>
          <Button
            variant="ghost"
            className="bg-surface/20 border-text-on-accent/40 text-text-on-accent"
            onClick={() => navigate("/register")}
          >
            Đăng ký miễn phí →
          </Button>
        </div>
      )}

      {!isGuest && totalReviewCount > 0 && (
        <div className={`mb-4 p-4 rounded-2xl flex items-center gap-4 border animate-fade-in lg:shrink-0 ${
          totalReviewCount > 10
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-purple/10 border-purple/30 text-primary'
        }`}>
          <div className="text-3xl flex-shrink-0">🔔</div>
          <div>
            <p className="font-bold text-lg">
              Hôm nay bạn có <span className="underline">{totalReviewCount} từ</span> cần ôn tập!
            </p>
            <p className="text-sm opacity-80">Ôn tập đúng hạn giúp ghi nhớ lâu hơn theo phương pháp Spaced Repetition.</p>
          </div>
        </div>
      )}

      {categoryNavItems.length > 0 && (
        <nav
          className="lg:hidden mb-8 -mx-6 px-6 overflow-x-auto"
          aria-label="Danh mục chủ đề học tập"
        >
          <div className="flex gap-3 min-w-max pb-2">
            {categoryNavItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToCategory(item.sectionId)}
                disabled={item.locked}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
                  item.locked
                    ? "cursor-not-allowed border-border bg-bg-light text-text-muted opacity-50"
                    : "border-primary/20 bg-surface text-text-primary hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] text-text-on-accent">
                  {index + 1}
                </span>
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="grid gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-stretch">
        <div
          ref={topicScrollContainerRef}
          className="lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:rounded-card lg:border lg:border-primary/10 lg:bg-surface/30 lg:shadow-inner"
        >
          <div className="space-y-8 lg:space-y-6">
          {topicGroups.map((cat: any, catIndex: number) => {
            const topics = Array.isArray(cat.topics) ? cat.topics : [];
            const isCategoryLocked = isGuest && catIndex > 0;
            const sectionId = categoryNavItems[catIndex]?.sectionId ?? toCategorySectionId(cat.id);
            const categoryTotals = topics.reduce(
              (totals: { total: number; learned: number; review: number }, topic: any) => ({
                total: totals.total + Number(topic.stats?.total ?? 0),
                learned: totals.learned + Number(topic.stats?.learned ?? 0),
                review: totals.review + Number(topic.stats?.review ?? 0),
              }),
              { total: 0, learned: 0, review: 0 },
            );
            const categoryProgress =
              categoryTotals.total > 0
                ? Math.round((categoryTotals.learned / categoryTotals.total) * 100)
                : 0;

            return (
              <section
                id={sectionId}
                key={cat.id}
                className="scroll-mt-28"
              >
                <div
                  className={`learning-card border-2 border-primary/5 transition-all ${
                    isCategoryLocked ? "opacity-50" : "hover:border-primary/20"
                  }`}
                >
                  <div className="z-40 flex flex-col gap-4 rounded-t-card border-b border-primary/10 bg-surface p-5 shadow-[0_12px_30px_var(--shadow-color)] sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:sticky lg:top-0">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-[1.75rem]">
                        {cat.icon ?? "📚"}
                      </div>
                      <div>
                        <h3 className="flex items-center gap-2 text-xl font-bold text-text-primary sm:text-2xl">
                          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-sm text-text-on-accent">
                            {catIndex + 1}
                          </span>
                          {cat.title}
                          {isCategoryLocked && (
                            <Shield size={18} className="text-text-muted" />
                          )}
                        </h3>
                        <p className="mt-1 text-sm text-text-muted">
                          {topics.length} chủ đề từ vựng
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full border border-primary/10 bg-bg-light px-3 py-1 text-text-muted">
                        {categoryTotals.total} từ
                      </span>
                      {!isGuest && (
                        <>
                          <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-green-700">
                            {categoryProgress}% đã học
                          </span>
                          {categoryTotals.review > 0 && (
                            <span className="rounded-full border border-purple/30 bg-purple/10 px-3 py-1 text-purple">
                              {categoryTotals.review} cần ôn
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isCategoryLocked ? (
                    <div className="flex items-center gap-4 bg-surface/30 p-6 text-text-muted">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-sm">
                        <Shield size={18} />
                      </div>
                      <p className="text-sm font-medium">
                        Đăng ký để mở khóa danh mục này.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-5 bg-surface/30 p-5 sm:p-6 xl:grid-cols-2">
                      {topics.map((topic: any, idx: number) => {
                        const stats = topic.stats ?? { new: 0, review: 0, learned: 0, total: 0 };
                        const isTopicLocked = isGuest && idx >= 3;
                        const isLearnedOut =
                          !isGuest &&
                          stats.new === 0 &&
                          stats.review === 0;
                        const progressPercent =
                          stats.total > 0
                            ? Math.round((stats.learned / stats.total) * 100)
                            : 0;

                        return (
                          <article
                            key={topic.id}
                            className={`learning-card relative flex min-h-[18rem] flex-col p-5 transition-all sm:p-6 ${
                              isTopicLocked
                                ? "pointer-events-none blur-[2px] opacity-70"
                                : "hover:-translate-y-1 hover:border-primary/40"
                            }`}
                          >
                            {isTopicLocked && (
                              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-card bg-surface/10">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-surface/80 text-text-muted shadow-lg">
                                  🔒
                                </div>
                              </div>
                            )}

                            <div className="mb-4 flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-light text-[1.75rem]">
                                  {topic.icon}
                                </div>
                                <div className="text-xs font-semibold text-text-muted">
                                  {stats.total} từ
                                </div>
                              </div>

                              {isGuest && idx < 3 && (
                                <Badge
                                  variant="green"
                                  className="animate-pulse"
                                >
                                  Preview ✓
                                </Badge>
                              )}
                              {!isGuest && (
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Badge
                                    variant="cyan"
                                    className="text-[10px] px-1.5"
                                  >
                                    🆕 {stats.new}
                                  </Badge>
                                  <Badge
                                    variant="purple"
                                    className="text-[10px] px-1.5"
                                  >
                                    🔔 {stats.review}
                                  </Badge>
                                  <Badge
                                    variant="green"
                                    className="text-[10px] px-1.5 font-bold"
                                  >
                                    ✅ {stats.learned}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <h4 className="mb-2 text-xl font-bold text-text-primary">
                              {topic.title}
                            </h4>
                            <p className="mb-6 line-clamp-2 text-sm text-text-secondary">
                              {topic.description}
                            </p>

                            {!isGuest && (
                              <div className="mb-6">
                                <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-primary/10">
                                  <div
                                    className="h-full bg-linear-to-r from-primary to-accent transition-all duration-1000"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] font-medium text-text-muted">
                                  <span>Tiến độ</span>
                                  <span>{progressPercent}%</span>
                                </div>
                              </div>
                            )}

                            <div className="mt-auto">
                              {isLearnedOut ? (
                                <Button
                                  variant="ghost"
                                  className="w-full cursor-not-allowed opacity-40"
                                  disabled
                                  title="Bạn đã học hết chủ đề này! Chờ ngày ôn tiếp theo."
                                >
                                  Đã hoàn thành
                                </Button>
                              ) : (
                                <div className="space-y-2">
                                  {stats.new > 0 && (
                                    <Button
                                      variant="primary"
                                      className="w-full group/btn"
                                      onClick={() => onStartStudy(topic.id)}
                                      disabled={isTopicLocked}
                                    >
                                      {stats.review > 0 ? "🆕 Học từ mới" : "Bắt đầu →"}
                                    </Button>
                                  )}
                                  {stats.review > 0 && (
                                    <Button
                                      variant="ghost"
                                      className="w-full border border-purple/50 text-purple hover:bg-purple/10"
                                      onClick={() => onStartStudy(topic.id, 'review')}
                                      disabled={isTopicLocked}
                                    >
                                      🔔 Ôn tập ngay ({stats.review})
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
          </div>
        </div>

        {categoryNavItems.length > 0 && (
          <aside
            className="hidden lg:block"
            aria-label="Mục lục chủ đề học tập"
          >
            <div className="learning-card sticky top-24 p-4">
              <div className="mb-4 flex items-center gap-3 border-b border-primary/10 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  #
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    Nhóm chủ đề
                  </p>
                  <p className="text-xs text-text-muted">
                    Chọn để cuộn nhanh
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {categoryNavItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToCategory(item.sectionId)}
                    disabled={item.locked}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                      item.locked
                        ? "cursor-not-allowed text-text-muted opacity-45"
                        : "text-text-secondary hover:bg-primary/5 hover:text-text-primary active:scale-[0.98]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        item.locked
                          ? "bg-bg-light text-text-muted"
                          : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-text-on-accent"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Sticky Guest CTA */}
      {isGuest && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-6 flex justify-center pointer-events-none">
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="pointer-events-auto bg-surface/90  border-2 border-primary/40 p-6 rounded-card shadow-2xl flex flex-col sm:flex-row items-center gap-8 max-w-4xl w-full"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-purple flex items-center justify-center text-text-on-accent text-3xl shadow-lg ring-4 ring-primary/10">
                🎯
              </div>
              <div>
                <h4 className="font-bold text-xl mb-1 text-text-primary">
                  Mở khóa 44 chủ đề đặc sắc
                </h4>
                <p className="text-text-secondary">
                  Theo dõi tiến trình học tập và nhận ngay 100 XP thưởng! 🔥
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              className="px-10 py-4 text-lg ml-auto"
              onClick={() => navigate("/register")}
            >
              Đăng ký miễn phí →
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export { LearningTopics };
