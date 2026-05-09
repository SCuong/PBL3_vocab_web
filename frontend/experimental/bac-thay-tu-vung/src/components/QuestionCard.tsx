import type { Question } from '../engine/types';

interface QuestionCardProps {
  question: Question;
  onPlayAudio?: (q: Question) => void;
}

const KIND_LABEL: Record<Question['kind'], string> = {
  definition: 'Definition',
  synonym: 'Synonym',
  antonym: 'Antonym',
  usage: 'Usage',
  listening: 'Listening',
};

export function QuestionCard({ question, onPlayAudio }: QuestionCardProps) {
  return (
    <section className="qcard" aria-live="polite">
      <div className="qcard__kind">
        Level {question.level} · {KIND_LABEL[question.kind]}
      </div>
      <h2 className="qcard__word">{question.word}</h2>
      <p className="qcard__prompt">{question.prompt}</p>
      {question.audioSrc && (
        <button type="button" className="qcard__audio" onClick={() => onPlayAudio?.(question)}>
          🔊 Pronounce
        </button>
      )}
    </section>
  );
}
