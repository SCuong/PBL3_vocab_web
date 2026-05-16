import React, { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button } from "../ui";
import { useAppContext } from "../../context/AppContext";
import { PATHS } from "../../routes/paths";
import { vocabularyApi } from "../../services/vocabularyApi";
import { mapLearningVocabularyToUiModel } from "../../utils/vocabularyMapper";

const LearningTopics = () => {
  const navigate = useNavigate();
  const { currentUser, gameData, learningTopicGroups: topicGroups, addToast } = useAppContext();

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
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [hasInitializedAccordion, setHasInitializedAccordion] = useState(false);
  const isGuest = !currentUser;

  useEffect(() => {
    if (!hasInitializedAccordion && !expandedCat && topicGroups.length > 0) {
      setExpandedCat(topicGroups[0].id);
      setHasInitializedAccordion(true);
    }
  }, [expandedCat, hasInitializedAccordion, topicGroups]);

  const streakDays = Number.isFinite(gameData?.streak) ? gameData.streak : 0;

  const totalReviewCount = isGuest ? 0 : topicGroups.reduce(
    (sum: number, cat: any) => sum + cat.topics.reduce((s: number, t: any) => s + (t.stats?.review || 0), 0), 0
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 relative">
      {/* Guest Banner */}
      {isGuest && (
        <div className="mb-12 p-4 bg-linear-to-r from-cyan/80 via-purple/80 to-pink/80 rounded-2xl flex items-center justify-between  border border-text-on-accent/20 shadow-xl animate-fade-in">
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

      {/* Greeting Header */}
      {!isGuest && (
        <header className="flex items-center justify-between mb-16 animate-slide-down">
          <div>
            <h1 className="text-[1.875rem] sm:text-[2rem] mb-2 font-display font-bold leading-tight tracking-normal">
              Chào {currentUser.username}! 👋
            </h1>
            <p className="text-text-secondary text-lg">
              Hôm nay bạn muốn học gì nào?
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="learning-card px-6 py-3 border-orange-500/20 bg-orange-500/5 flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <span className="font-bold text-orange-600">
                {streakDays} ngày liên tiếp
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Main Header for Guest */}
      {isGuest && (
        <header className="text-center mb-16">
          <h1 className="text-[1.875rem] sm:text-[2rem] mb-4 font-display font-bold leading-tight tracking-normal">
            Khám phá chủ đề học
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Khám phá kho tàng kiến thức với 7 danh mục lớn và 44 chủ đề từ vựng
            đa dạng từ cơ bản đến nâng cao.
          </p>
        </header>
      )}

      {!isGuest && totalReviewCount > 0 && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-4 border animate-fade-in ${
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

      <div className="space-y-6">
        {topicGroups.map((cat: any, catIndex: number) => {
          const isOpen = expandedCat === cat.id;
          const isCategoryLocked = isGuest && catIndex > 0;

          return (
            <div
              key={cat.id}
              className={`learning-card overflow-hidden shadow-sm hover:shadow-md transition-all border-2 border-primary/5 ${isCategoryLocked ? "opacity-50" : ""}`}
            >
              {/* Accordion Header */}
              <button
                onClick={() =>
                  !isCategoryLocked && setExpandedCat(isOpen ? null : cat.id)
                }
                className={`w-full p-6 flex items-center justify-between group transition-colors ${isOpen ? "bg-primary/5" : "hover:bg-primary/5"} ${isCategoryLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                disabled={isCategoryLocked}
              >
                <div className="flex items-center gap-6">
                  <div className="text-[2rem] group-hover:scale-110 transition-transform">
                    {cat.icon ?? "📚"}
                  </div>
                  <div className="text-left">
                    <h3
                      className={`text-2xl font-bold flex items-center gap-2 ${isOpen ? "text-primary" : "text-text-primary"}`}
                    >
                      {cat.title}
                      {isCategoryLocked && (
                        <Shield size={20} className="text-text-muted" />
                      )}
                    </h3>
                    <p className="text-text-muted text-sm">
                      {cat.topics.length} chủ đề từ vựng
                    </p>
                  </div>
                </div>
                <div
                  className={`p-2 rounded-full transform transition-transform duration-300 ${isOpen ? "rotate-180 bg-primary/20 text-primary" : "rotate-0 bg-bg-light text-text-muted"}`}
                >
                  <ChevronLeft className="-rotate-90" />
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-surface/30"
                  >
                    <div className="p-8 grid md:grid-cols-2 gap-6">
                      {cat.topics.map((topic: any, idx: number) => {
                        const isTopicLocked = isGuest && idx >= 3;
                        const isLearnedOut =
                          !isGuest &&
                          topic.stats.new === 0 &&
                          topic.stats.review === 0;
                        const progressPercent =
                          topic.stats.total > 0
                            ? Math.round(
                                (topic.stats.learned / topic.stats.total) * 100,
                              )
                            : 0;

                        return (
                          <div
                            key={topic.id}
                            className={`learning-card p-6 border group transition-all relative ${isTopicLocked ? "blur-[2px] opacity-70 pointer-events-none" : "hover:border-primary/40 hover:-translate-y-1"}`}
                          >
                            {/* Locking Overlay */}
                            {isTopicLocked && (
                              <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/10  rounded-card">
                                <div className="w-10 h-10 rounded-full bg-surface/80 flex items-center justify-center shadow-lg border-2 border-primary/20 text-text-muted">
                                  🔒
                                </div>
                              </div>
                            )}

                            <div className="flex items-start justify-between mb-4">
                              <div className="text-[2rem]">{topic.icon}</div>
                              {isGuest && idx < 3 && (
                                <Badge
                                  variant="green"
                                  className="animate-pulse"
                                >
                                  Preview ✓
                                </Badge>
                              )}
                              {!isGuest && (
                                <div className="flex gap-2">
                                  <Badge
                                    variant="cyan"
                                    className="text-[10px] px-1.5"
                                  >
                                    🆕 {topic.stats.new}
                                  </Badge>
                                  <Badge
                                    variant="purple"
                                    className="text-[10px] px-1.5"
                                  >
                                    🔔 {topic.stats.review}
                                  </Badge>
                                  <Badge
                                    variant="green"
                                    className="text-[10px] px-1.5 font-bold"
                                  >
                                    ✅ {topic.stats.learned}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <h4 className="text-xl font-bold mb-2">
                              {topic.title}
                            </h4>
                            <p className="text-sm text-text-secondary line-clamp-2 mb-6">
                              {topic.description}
                            </p>

                            {!isGuest && (
                              <div className="mb-6">
                                <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden mb-1">
                                  <div
                                    className="h-full bg-linear-to-r from-primary to-accent transition-all duration-1000"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <div className="text-[10px] text-text-muted text-right font-medium">
                                  Tiến độ: {progressPercent}%
                                </div>
                              </div>
                            )}

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
                                {topic.stats.new > 0 && (
                                  <Button
                                    variant="primary"
                                    className="w-full group/btn"
                                    onClick={() => onStartStudy(topic.id)}
                                    disabled={isTopicLocked}
                                  >
                                    {topic.stats.review > 0 ? "🆕 Học từ mới" : "Bắt đầu →"}
                                  </Button>
                                )}
                                {topic.stats.review > 0 && (
                                  <Button
                                    variant="ghost"
                                    className="w-full border border-purple/50 text-purple hover:bg-purple/10"
                                    onClick={() => onStartStudy(topic.id, 'review')}
                                    disabled={isTopicLocked}
                                  >
                                    🔔 Ôn tập ngay ({topic.stats.review})
                                  </Button>
                                )}
                              </div>
                            )}
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
