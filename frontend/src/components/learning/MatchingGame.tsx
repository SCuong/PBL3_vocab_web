import React, { useReducer, useEffect, useCallback, useState } from "react";

const PAIRS_PER_ROUND = 8;

type CardType = "word" | "meaning";
type CardState = "idle" | "selected" | "matched" | "wrong";

type Card = {
  id: number;
  content: string;
  cardType: CardType;
};

type GameState = {
  round: number;
  cards: Card[];
  cardStates: CardState[];
  selected: number | null;
  matchedInRound: number;
  totalMatched: number;
};

type GameAction =
  | { type: "INIT"; cards: Card[] }
  | { type: "CLICK"; idx: number }
  | { type: "RESET_WRONG"; idx1: number; idx2: number }
  | { type: "NEXT_ROUND"; round: number; cards: Card[] };

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "INIT":
      return {
        round: 0,
        cards: action.cards,
        cardStates: new Array(action.cards.length).fill("idle"),
        selected: null,
        matchedInRound: 0,
        totalMatched: 0,
      };

    case "CLICK": {
      const { idx } = action;
      const cs = state.cardStates[idx];
      if (cs === "matched" || cs === "wrong") return state;

      if (state.selected === null) {
        const next = [...state.cardStates];
        next[idx] = "selected";
        return { ...state, selected: idx, cardStates: next };
      }

      if (state.selected === idx) {
        const next = [...state.cardStates];
        next[idx] = "idle";
        return { ...state, selected: null, cardStates: next };
      }

      const selCard = state.cards[state.selected];
      const clickedCard = state.cards[idx];
      const isMatch =
        selCard.id === clickedCard.id && selCard.cardType !== clickedCard.cardType;

      if (isMatch) {
        const next = [...state.cardStates];
        next[state.selected] = "matched";
        next[idx] = "matched";
        return {
          ...state,
          selected: null,
          cardStates: next,
          matchedInRound: state.matchedInRound + 1,
          totalMatched: state.totalMatched + 1,
        };
      } else {
        const next = [...state.cardStates];
        next[state.selected] = "wrong";
        next[idx] = "wrong";
        return { ...state, selected: null, cardStates: next };
      }
    }

    case "RESET_WRONG": {
      const next = [...state.cardStates];
      if (next[action.idx1] === "wrong") next[action.idx1] = "idle";
      if (next[action.idx2] === "wrong") next[action.idx2] = "idle";
      return { ...state, cardStates: next };
    }

    case "NEXT_ROUND":
      return {
        ...state,
        round: action.round,
        cards: action.cards,
        cardStates: new Array(action.cards.length).fill("idle"),
        selected: null,
        matchedInRound: 0,
      };

    default:
      return state;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type MatchingGameProps = {
  words: any[];
  type: "word" | "ipa";
  onFinish: (correct: number, total: number, time: number) => void;
};

export const MatchingGame = ({ words, type, onFinish }: MatchingGameProps) => {
  const [startTime] = useState(Date.now());

  const buildRoundCards = useCallback(
    (roundIndex: number): Card[] => {
      const slice = words.slice(
        roundIndex * PAIRS_PER_ROUND,
        (roundIndex + 1) * PAIRS_PER_ROUND,
      );
      const wordCards: Card[] = slice.map((w) => ({
        id: w.id,
        content: type === "ipa" ? (w.transcription ?? w.word) : w.word,
        cardType: "word",
      }));
      const meaningCards: Card[] = slice.map((w) => ({
        id: w.id,
        content: w.meaning,
        cardType: "meaning",
      }));
      return shuffle([...wordCards, ...meaningCards]);
    },
    [words, type],
  );

  const [gameState, dispatch] = useReducer(reducer, null, () => {
    const cards = buildRoundCards(0);
    return {
      round: 0,
      cards,
      cardStates: new Array(cards.length).fill("idle"),
      selected: null,
      matchedInRound: 0,
      totalMatched: 0,
    };
  });

  useEffect(() => {
    dispatch({ type: "INIT", cards: buildRoundCards(0) });
  }, [words, type]);

  const totalRounds = Math.ceil(words.length / PAIRS_PER_ROUND);
  const roundPairCount = Math.min(
    PAIRS_PER_ROUND,
    words.length - gameState.round * PAIRS_PER_ROUND,
  );

  const wrongIndices = gameState.cardStates
    .map((s, i) => (s === "wrong" ? i : -1))
    .filter((i) => i >= 0);

  const wrongKey = wrongIndices.join(",");
  useEffect(() => {
    if (wrongIndices.length < 2) return;
    const [idx1, idx2] = wrongIndices;
    const timer = setTimeout(() => {
      dispatch({ type: "RESET_WRONG", idx1, idx2 });
    }, 1000);
    return () => clearTimeout(timer);
  }, [wrongKey]);

  useEffect(() => {
    if (gameState.matchedInRound === 0 || gameState.matchedInRound !== roundPairCount) return;

    if (gameState.round + 1 < totalRounds) {
      const timer = setTimeout(() => {
        const nextCards = buildRoundCards(gameState.round + 1);
        dispatch({ type: "NEXT_ROUND", round: gameState.round + 1, cards: nextCards });
      }, 700);
      return () => clearTimeout(timer);
    } else {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const timer = setTimeout(() => {
        onFinish(gameState.totalMatched, words.length, elapsed);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState.matchedInRound, gameState.round]);

  if (words.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-text-secondary">
        Không có từ để luyện tập.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-text-muted uppercase tracking-wide">
          {totalRounds > 1
            ? `Vòng ${gameState.round + 1} / ${totalRounds}`
            : "Nối từ"}
        </span>
        <span className="text-sm font-bold text-primary">
          {gameState.totalMatched} / {words.length} cặp
        </span>
      </div>
      <div className="h-2 bg-purple-100 rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-gradient-to-r from-purple-400 to-primary rounded-full transition-all duration-500"
          style={{
            width: `${words.length > 0 ? (gameState.totalMatched / words.length) * 100 : 0}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {gameState.cards.map((card, idx) => {
          const state = gameState.cardStates[idx] ?? "idle";
          return (
            <button
              key={idx}
              disabled={state === "matched"}
              onClick={() => dispatch({ type: "CLICK", idx })}
              style={
                state === "wrong"
                  ? { animation: "shake 0.5s ease-in-out" }
                  : undefined
              }
              className={`
                p-4 min-h-[80px] flex items-center justify-center rounded-2xl border-2
                transition-all duration-200 font-bold text-sm text-center leading-snug
                ${
                  state === "matched"
                    ? "border-purple-400 bg-purple-50 text-purple-700 opacity-60 cursor-default"
                    : state === "selected"
                      ? "border-primary bg-primary/5 shadow-lg scale-105"
                      : state === "wrong"
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "bg-surface border-primary/10 hover:border-primary/40 hover:scale-[1.02] cursor-pointer"
                }
              `}
            >
              {card.content}
            </button>
          );
        })}
      </div>
    </div>
  );
};
