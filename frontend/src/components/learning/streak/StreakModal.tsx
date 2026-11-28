import { Check, Calendar, Flame } from 'lucide-react';
import { AppDialog } from '../../ui';
import { StreakHeatmap } from './StreakHeatmap';
import { useAppContext } from '../../../context/AppContext';

type StreakModalProps = {
    isOpen: boolean;
    onClose: () => void;
    gameData: any;
};

export const StreakModal = ({ isOpen, onClose, gameData }: StreakModalProps) => {
    const { learnerAnalytics } = useAppContext();

    // Prefer backend analytics (same source as dashboard/profile/navbar); fall back to local.
    const streakValue = learnerAnalytics?.streak ?? Number(gameData?.currentUser?.streak ?? 0);
    const historyDates = learnerAnalytics
        ? learnerAnalytics.heatmap
            .filter((day) => day.wordsStudied > 0)
            .map((day) => day.date.slice(0, 10))
        : (Array.isArray(gameData?.currentUser?.studyHistory) ? gameData.currentUser.studyHistory : []);

    const milestones = [7, 30, 100];
    const nextMilestone = milestones.find(m => streakValue < m);

    return (
        <AppDialog
            isOpen={isOpen}
            onClose={onClose}
            purpose="info"
            width={520}
            title={`Chuỗi ${streakValue} ngày`}
            subtitle={nextMilestone ? `Còn ${nextMilestone - streakValue} ngày nữa để đạt mốc ${nextMilestone} ngày.` : 'Bạn đã đạt mọi mốc chuỗi. Tuyệt vời!'}
        >
            <div className="space-y-6">
                <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                        <Calendar size={16} className="text-primary" aria-hidden /> 30 ngày qua
                    </h3>
                    <StreakHeatmap history={historyDates} />
                </section>

                <section>
                    <h3 className="mb-3 text-sm font-semibold text-text-primary">Các mốc chuỗi</h3>
                    <ol className="grid grid-cols-3 gap-2">
                        {milestones.map(m => {
                            const reached = streakValue >= m;
                            return (
                                <li
                                    key={m}
                                    className={`flex flex-col items-center gap-1 rounded-[var(--radius-element)] border px-2 py-3 text-center ${
                                        reached ? 'border-primary/30 bg-primary-light' : 'border-border bg-bg-secondary/50'
                                    }`}
                                >
                                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${reached ? 'bg-primary text-text-on-accent' : 'border border-dashed border-border-emphasized text-text-muted'}`} aria-hidden>
                                        {reached ? <Check size={16} /> : <Flame size={15} />}
                                    </span>
                                    <span className="text-sm font-semibold tabular-nums text-text-primary">{m} ngày</span>
                                    <span className="text-xs text-text-muted">{reached ? 'Đã đạt' : 'Chưa đạt'}</span>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            </div>
        </AppDialog>
    );
};
