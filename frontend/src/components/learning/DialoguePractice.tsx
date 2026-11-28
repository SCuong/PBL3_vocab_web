import { useMemo, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { Button } from '../ui';
import { playPronunciationAudio } from '../../utils/audio';
import { playLumoVoice, playSfx } from '../../utils/sound';
import { getTopicIllustration } from '../../utils/vocabIllustrations';

type DialogueWord = {
  id: number | string;
  word: string;
  meaning: string;
  transcription?: string;
  example?: string;
  translation?: string;
  audioUrl?: string;
};

type DialogueTurn = {
  speaker: string;
  isLumo: boolean;
  en: string;
  vi: string;
  audioUrl?: string;
  fullAudioUrl?: string;
  spotlight: string;
  blankKey?: string;
  blankWord?: string;
  blankHint?: string;
  choices?: string[];
  highlightWords?: string[];
};

type DialoguePracticeProps = {
  topicTitle: string;
  words: DialogueWord[];
  onComplete?: (xpEarned: number) => void;
};

const AIRPORT_TURNS: DialogueTurn[] = [
  {
    speaker: 'Nhân viên sân bay',
    isLumo: false,
    en: 'Good morning! May I see your boarding pass and passport?',
    vi: 'Chào buổi sáng! Cho tôi xem thẻ lên máy bay và hộ chiếu của bạn nhé?',
    audioUrl: '/audio/dlg-0.mp3',
    spotlight: 'Lumo đang làm thủ tục tại quầy sân bay',
    highlightWords: ['boarding pass'],
  },
  {
    speaker: 'Lumo',
    isLumo: true,
    en: 'Here you go. I also need to check in one piece of luggage.',
    vi: 'Của tôi đây ạ. Tôi cũng cần ký gửi một kiện hành lý.',
    audioUrl: '/audio/dlg-1.mp3',
    spotlight: 'Kiểm tra hành lý ký gửi tại quầy cân',
    highlightWords: ['luggage'],
  },
  {
    speaker: 'Nhân viên sân bay',
    isLumo: false,
    en: 'Thank you. Please note that your ___ time moved to 10:45.',
    vi: 'Cảm ơn bạn. Lưu ý rằng giờ khởi hành của bạn đã đổi sang 10:45.',
    audioUrl: '/audio/dlg-2-blank.mp3',
    fullAudioUrl: '/audio/dlg-2-full.mp3',
    spotlight: 'Bảng Departures phía sau đổi sang 10:45!',
    blankKey: 'b1',
    blankWord: 'departure',
    blankHint: 'giờ khởi hành',
    choices: ['departure', 'destination', 'itinerary'],
  },
  {
    speaker: 'Lumo',
    isLumo: true,
    en: 'Got it! Let me update my ___ so my hotel knows.',
    vi: 'Tôi hiểu rồi! Để tôi cập nhật lịch trình để khách sạn biết.',
    audioUrl: '/audio/dlg-3-blank.mp3',
    fullAudioUrl: '/audio/dlg-3-full.mp3',
    spotlight: 'Lumo cập nhật lịch trình chuyến đi kịp thời',
    blankKey: 'b2',
    blankWord: 'itinerary',
    blankHint: 'lịch trình chuyến đi',
    choices: ['boarding pass', 'itinerary', 'luggage'],
  },
  {
    speaker: 'Nhân viên sân bay',
    isLumo: false,
    en: 'No problem at all. Have a safe flight to your destination!',
    vi: 'Không có gì đâu. Chúc bạn có chuyến bay an toàn tới điểm đến!',
    audioUrl: '/audio/dlg-4.mp3',
    spotlight: 'Hoàn tất thủ tục — sẵn sàng lên máy bay!',
    highlightWords: ['destination'],
  },
];

const AIRPORT_GLOSSARY: Record<string, { word: string; ipa: string; meaning: string }> = {
  'boarding pass': { word: 'boarding pass', ipa: '/ˈbɔːr.dɪŋ pæs/', meaning: 'thẻ lên máy bay' },
  luggage: { word: 'luggage', ipa: '/ˈlʌɡ.ɪdʒ/', meaning: 'hành lý' },
  departure: { word: 'departure', ipa: '/dɪˈpɑːr.tʃər/', meaning: 'giờ khởi hành' },
  itinerary: { word: 'itinerary', ipa: '/aɪˈtɪn.ə.rer.i/', meaning: 'lịch trình chuyến đi' },
  destination: { word: 'destination', ipa: '/ˌdes.tɪˈneɪ.ʃən/', meaning: 'điểm đến' },
};

function buildDynamicTurns(topicTitle: string, words: DialogueWord[]): DialogueTurn[] {
  const usable = words.filter(w => w.word && w.example && w.translation).slice(0, 5);
  if (usable.length < 2) {
    return AIRPORT_TURNS;
  }

  const allWordNames = words.map(w => w.word).filter(Boolean);
  const pickChoices = (target: string) => {
    const others = allWordNames.filter(w => w.toLowerCase() !== target.toLowerCase()).slice(0, 2);
    const list = [target, ...others];
    return list.sort((a, b) => a.localeCompare(b));
  };

  return usable.map((item, idx) => {
    const isBlank = idx === 1 || idx === Math.min(3, usable.length - 1);
    const escaped = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    const hasWordInEx = regex.test(item.example || '');

    if (isBlank && hasWordInEx) {
      return {
        speaker: idx % 2 === 1 ? 'Lumo' : 'Bạn đồng hành',
        isLumo: idx % 2 === 1,
        en: (item.example || '').replace(regex, '___'),
        vi: item.translation || item.meaning,
        spotlight: `Luyện dùng "${item.meaning}" trong ${topicTitle}`,
        blankKey: `dyn-${idx}`,
        blankWord: item.word,
        blankHint: item.meaning,
        choices: pickChoices(item.word),
      };
    }

    return {
      speaker: idx % 2 === 1 ? 'Lumo' : 'Bạn đồng hành',
      isLumo: idx % 2 === 1,
      en: item.example || `${item.word} — ${item.meaning}`,
      vi: item.translation || item.meaning,
      spotlight: `Hội thoại chủ đề ${topicTitle}`,
      highlightWords: [item.word],
    };
  });
}

export const DialoguePractice = ({ topicTitle, words, onComplete }: DialoguePracticeProps) => {
  const isTravel = /travel|explore|flight|airport/i.test(topicTitle);
  const turns = useMemo(
    () => (isTravel ? AIRPORT_TURNS : buildDynamicTurns(topicTitle, words)),
    [isTravel, topicTitle, words],
  );

  const firstBlankIdx = useMemo(() => {
    const found = turns.findIndex(t => Boolean(t.blankKey));
    return found >= 0 ? found : turns.length - 1;
  }, [turns]);

  const totalBlanks = useMemo(() => turns.filter(t => Boolean(t.blankKey)).length, [turns]);

  const [step, setStep] = useState(firstBlankIdx);
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [peekWord, setPeekWord] = useState<{ word: string; ipa: string; meaning: string } | null>(null);

  const visibleTurns = turns.slice(0, step + 1);
  const currentTurn = turns[step];
  const activeBlank = currentTurn?.blankKey && !solved[currentTurn.blankKey] ? currentTurn : null;
  const solvedCount = Object.keys(solved).length;
  const allSolved = totalBlanks === 0 || solvedCount >= totalBlanks;
  const sceneImage = isTravel
    ? '/illustrations/scene-airport-dialogue.jpg'
    : getTopicIllustration(topicTitle, topicTitle.length);

  const lookupWord = (term: string) => {
    const key = term.toLowerCase();
    const match = words.find(w => w.word.toLowerCase() === key);
    if (match) {
      return { word: match.word, ipa: match.transcription || '', meaning: match.meaning };
    }
    return AIRPORT_GLOSSARY[key] || { word: term, ipa: '', meaning: '' };
  };

  const handleChoose = (choice: string) => {
    if (!activeBlank || !activeBlank.blankKey || !activeBlank.blankWord) return;
    if (choice.toLowerCase() === activeBlank.blankWord.toLowerCase()) {
      playSfx('correct');
      setWrongChoice(null);
      setSolved(prev => ({ ...prev, [activeBlank.blankKey!]: true }));
      const fullSentence = activeBlank.en.replace('___', activeBlank.blankWord);
      playPronunciationAudio(activeBlank.fullAudioUrl, fullSentence, undefined, 0.95);
      if (step < turns.length - 1) {
        setStep(s => s + 1);
      }
    } else {
      playSfx('wrong');
      setWrongChoice(choice);
    }
  };

  const handleFinish = () => {
    if (completed) return;
    setCompleted(true);
    playSfx('complete');
    onComplete?.(30);
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Compact Full-Bleed Cinema Scene Header — fits dialogue & choices above the fold */}
      <div className="relative mb-4 h-40 w-full overflow-hidden rounded-2xl bg-[#171429] shadow-[0_14px_30px_-18px_rgba(17,16,25,0.4)] sm:h-48">
        <img
          src={sceneImage}
          alt={`Bối cảnh hội thoại ${topicTitle}`}
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(13, 12, 20, 0.92) 0%, rgba(13, 12, 20, 0.35) 55%, rgba(13, 12, 20, 0.1) 100%)',
          }}
        />
        <div className="absolute right-4 top-3.5">
          <span className="inline-flex items-center rounded-full bg-[#171429]/85 px-3 py-1 text-xs font-extrabold tabular-nums text-white">
            {solvedCount} / {totalBlanks} chỗ trống
          </span>
        </div>
        <div className="absolute inset-x-5 bottom-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-base font-extrabold leading-tight text-white sm:text-lg">
              {visibleTurns[visibleTurns.length - 1]?.spotlight}
            </p>
            <p className="mt-0.5 text-xs text-[#E5E7EB]">
              Chạm từ nổi bật để xem nghĩa nhanh
            </p>
          </div>
        </div>
      </div>

      {/* Dialogue Bubbles */}
      <div className="flex flex-col gap-3">
        {visibleTurns.map((turn, idx) => {
          const isTurnSolved = turn.blankKey ? Boolean(solved[turn.blankKey]) : true;
          const displayEn =
            turn.blankKey && turn.blankWord
              ? turn.en
              : turn.en;
          const speakSentence =
            turn.blankKey && turn.blankWord
              ? isTurnSolved
                ? turn.en.replace('___', turn.blankWord)
                : turn.en.replace('___', 'blank')
              : turn.en;

          return (
            <div
              key={idx}
              className={`cinema-content-in flex max-w-[92%] items-start gap-3 ${turn.isLumo ? 'self-end flex-row-reverse' : ''}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xs font-extrabold text-primary shadow-xs">
                {turn.isLumo ? (
                  <img
                    src="/mascot-lumo.webp"
                    alt="Lumo"
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  'NV'
                )}
              </div>
              <div
                className={`rounded-2xl border px-4 py-3 shadow-[0_4px_14px_-8px_rgba(23,20,41,0.12)] ${
                  turn.isLumo
                    ? 'border-primary/25 bg-primary-light/70'
                    : 'border-border bg-surface'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-text-secondary">{turn.speaker}</span>
                  <button
                    type="button"
                    onClick={() =>
                      playPronunciationAudio(
                        isTurnSolved ? (turn.fullAudioUrl || turn.audioUrl) : turn.audioUrl,
                        speakSentence,
                        undefined,
                        0.95,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                  >
                    <Volume2 size={13} aria-hidden /> Nghe
                  </button>
                </div>

                <p className="text-[15px] font-semibold leading-relaxed text-text-primary">
                  {turn.blankKey && turn.blankWord ? (
                    <>
                      {displayEn.split('___')[0]}
                      {isTurnSolved ? (
                        <button
                          type="button"
                          onClick={() => setPeekWord(lookupWord(turn.blankWord!))}
                          className="mx-1 inline-block rounded-lg border border-success-color bg-success-color/10 px-2.5 py-0.5 font-extrabold text-success-color cursor-pointer"
                        >
                          {turn.blankWord}
                        </button>
                      ) : (
                        <span className="mx-1 inline-block min-w-[88px] rounded-lg border-2 border-dashed border-primary/50 bg-surface px-2.5 py-0.5 text-center font-extrabold text-primary">
                          _____
                        </span>
                      )}
                      {displayEn.split('___')[1]}
                    </>
                  ) : turn.highlightWords && turn.highlightWords.length > 0 ? (
                    renderClickableTerms(displayEn, turn.highlightWords, term => setPeekWord(lookupWord(term)))
                  ) : (
                    displayEn
                  )}
                </p>
                {isTurnSolved && <p className="mt-1 text-xs text-text-secondary">{turn.vi}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Blank Challenge or Completion */}
      {activeBlank ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-[0_8px_20px_-14px_rgba(23,20,41,0.14)] sm:p-5">
          <p className="text-sm font-bold text-text-primary">
            Chọn từ điền vào chỗ trống · Gợi ý:{' '}
            <span className="text-primary">{activeBlank.blankHint}</span>
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            {(activeBlank.choices ?? []).map(choice => {
              const isWrong = wrongChoice === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleChoose(choice)}
                  className={`duo-btn duo-btn-sm normal-case tracking-normal ${
                    isWrong
                      ? 'border-2 border-danger-color bg-danger-color/10 text-danger-color'
                      : 'duo-btn-surface'
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </div>
      ) : allSolved ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-container)] border border-success-color/40 bg-success-color/10 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <img
              src="/mascot-lumo-cool.webp"
              alt="Lumo chúc mừng"
              width={48}
              height={54}
              onClick={() => playLumoVoice('celebrate')}
              className="h-auto w-12 cursor-pointer"
            />
            <div>
              <p className="text-sm font-extrabold text-success-color">
                Bạn vừa hoàn thành trọn đoạn hội thoại thực tế!
              </p>
              <p className="text-xs text-text-muted">
                {completed ? 'Đã cộng +30 XP vào tiến độ của bạn.' : 'Bấm hoàn tất để ghi nhận +30 XP.'}
              </p>
            </div>
          </div>
          {!completed && (
            <Button onClick={handleFinish}>Hoàn tất (+30 XP)</Button>
          )}
        </div>
      ) : null}

      {/* Word Peek Popover */}
      {peekWord && (
        <div className="fixed bottom-20 right-5 z-50 w-72 rounded-2xl border border-primary/30 bg-surface p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-base font-extrabold text-text-primary">{peekWord.word}</strong>
            <button
              type="button"
              onClick={() => setPeekWord(null)}
              className="rounded-md p-1 text-text-muted hover:text-text-primary cursor-pointer"
              aria-label="Đóng"
            >
              <X size={15} />
            </button>
          </div>
          {peekWord.ipa && <p className="mt-0.5 font-mono text-xs text-primary">{peekWord.ipa}</p>}
          <p className="mt-1.5 text-sm font-semibold text-text-primary">{peekWord.meaning}</p>
          <button
            type="button"
            data-no-tap-sfx="true"
            onClick={() => playPronunciationAudio(undefined, peekWord.word)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-light px-3 py-1.5 text-xs font-bold text-primary cursor-pointer"
          >
            <Volume2 size={14} aria-hidden /> Nghe phát âm
          </button>
        </div>
      )}
    </div>
  );
};

function renderClickableTerms(sentence: string, terms: string[], onPick: (term: string) => void) {
  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  const parts = sentence.split(pattern);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <button
        key={`${part}-${i}`}
        type="button"
        onClick={() => onPick(part)}
        className="rounded bg-primary-light px-1.5 py-0.5 font-bold text-primary underline decoration-dashed underline-offset-2 cursor-pointer"
      >
        {part}
      </button>
    ) : (
      part
    ),
  );
}
