import { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Play, Square } from 'lucide-react';
import type { Grade1Unit } from '../../data/grade1Curriculum';
import { playPronunciationAudio, stopPronunciationAudio } from '../../utils/audio';

interface ListenAndChantProps {
  unit: Grade1Unit;
  onChantPlayed: () => void;
}

function playSoftBeat(ctx: AudioContext, accent: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(accent ? 523.25 : 392.0, ctx.currentTime); // C5 / G4 marimba pop
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function ListenAndChant({ unit, onChantPlayed }: ListenAndChantProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLine, setActiveLine] = useState<number>(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const playingRef = useRef(false);

  const letter = unit.phonicsLetter.charAt(0);
  const lower = letter.toLowerCase();
  const w0 = unit.words[0];
  const w1 = unit.words[1];
  const w2 = unit.words[2];

  const lines = [
    {
      text: `${letter}, ${lower}, ${w0.word}!`,
      sub: w0.meaningVi,
      image: w0.imageUrl,
      audio: w0.audioUrl,
    },
    {
      text: `${letter}, ${lower}, ${w1.word}!`,
      sub: w1.meaningVi,
      image: w1.imageUrl,
      audio: w1.audioUrl,
    },
    {
      text: `${letter}, ${lower}, ${w2.word}!`,
      sub: w2.meaningVi,
      image: w2.imageUrl,
      audio: w2.audioUrl,
    },
    {
      text: w0.exampleEn,
      sub: w0.exampleVi,
      image: w0.imageUrl,
      audio: w0.exampleAudioUrl,
    },
  ];

  const stopChant = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setActiveLine(-1);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopPronunciationAudio();
  }, []);

  useEffect(() => {
    return () => stopChant();
  }, [stopChant]);

  const runLine = useCallback(
    (idx: number) => {
      if (!playingRef.current) return;
      if (idx >= lines.length) {
        playingRef.current = false;
        setIsPlaying(false);
        setActiveLine(-1);
        onChantPlayed();
        return;
      }

      setActiveLine(idx);
      try {
        if (!audioCtxRef.current) {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new AudioCtx();
        }
        playSoftBeat(audioCtxRef.current, idx % 2 === 0);
      } catch {
        // Ignore Web Audio restriction
      }

      playPronunciationAudio(lines[idx].audio, undefined, () => {
        if (!playingRef.current) return;
        timerRef.current = window.setTimeout(() => runLine(idx + 1), 360);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unit.unit, onChantPlayed],
  );

  const toggleChant = () => {
    if (isPlaying) {
      stopChant();
      return;
    }
    playingRef.current = true;
    setIsPlaying(true);
    runLine(0);
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {lines.map((line, i) => {
          const active = activeLine === i;
          return (
            <button
              key={`${line.text}-${i}`}
              type="button"
              onClick={() => {
                stopChant();
                setActiveLine(i);
                playPronunciationAudio(line.audio, undefined, () => setActiveLine(-1));
              }}
              className={`flex cursor-pointer items-center gap-3.5 rounded-3xl border-[3px] p-3 text-left transition-all duration-150 ${
                active
                  ? 'scale-[1.02] border-[#F59E0B] bg-[#FFFBEB] shadow-md'
                  : 'border-border/70 bg-white hover:border-primary/60'
              }`}
            >
              <img
                src={line.image}
                alt={line.sub}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-lg font-black text-text-primary">
                  <Music
                    size={16}
                    className={active ? 'animate-bounce text-[#F59E0B]' : 'text-primary'}
                  />
                  <span className="truncate">{line.text}</span>
                </p>
                <p className="text-xs font-bold text-text-secondary">{line.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={toggleChant}
          className={`duo-btn ${isPlaying ? 'duo-btn-surface' : 'duo-btn-purple'} !px-7 !py-3.5`}
        >
          {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          {isPlaying ? 'Dừng đọc vè' : 'Đọc vè theo nhịp!'}
        </button>
      </div>
    </div>
  );
}
