# Bậc Thầy Từ Vựng — Prototype

Standalone prototype of an "Ai Là Triệu Phú"-style English vocabulary quiz game
for the PBL3 VocabLearning project. Built in isolation for design + UX
validation before integration into the main app.

## Status

Prototype only. **Do not** import from the main `frontend/` source tree. This
folder ships with its own `package.json`, `vite.config.ts`, and `tsconfig.json`
so it can be developed and reviewed independently.

## Run

```bash
cd frontend/experimental/bac-thay-tu-vung
npm install
npm run dev
```

Opens on http://localhost:5180.

## Architecture

```
src/
├── main.tsx               # Vite entry
├── App.tsx                # Top-level screen router (intro/game/win/over)
├── styles.css             # Theme tokens + global styles
├── engine/
│   ├── types.ts           # Question, GameState, GameStatus types
│   ├── GameEngine.ts      # Pure reducer — single source of truth
│   └── useGameEngine.ts   # React adapter (useReducer + selectors)
├── data/
│   ├── questions.ts       # Mock vocabulary question bank (15 levels)
│   └── prizeLadder.ts     # Score ladder values + safe-haven levels
├── hooks/
│   ├── useTimer.ts        # Per-question countdown, pausable
│   └── useKeyboard.ts     # A/B/C/D + Enter/Escape bindings
├── audio/
│   └── SoundManager.ts    # Placeholder sound bus (no-op until assets land)
├── utils/
│   └── shuffle.ts         # Fisher-Yates, deterministic via seed
├── components/
│   ├── Logo.tsx
│   ├── StageBackground.tsx
│   ├── QuestionCard.tsx
│   ├── AnswerOption.tsx
│   ├── Timer.tsx
│   ├── Lifelines.tsx          # Pill-button row, lives in the top bar
│   ├── RewardModal.tsx        # Popup ladder shown after a correct answer
│   └── PrizeLadder.tsx        # Reusable ladder list (unused in the v2 layout, kept for future reuse)
└── pages/
    ├── IntroPage.tsx
    ├── GamePage.tsx
    ├── WinPage.tsx
    └── GameOverPage.tsx
```

## Design notes

- **Layout v2** mirrors `frontend/experimental/reference/ingame.png`:
  three-column top bar (brand+score · lifelines pill row · sound+exit), a
  centered hero with a premium circular timer above a large question panel
  and a 2×2 answer grid. The prize ladder is no longer permanently docked —
  `RewardModal` pops it up after each correct answer with the cleared rung
  highlighted and the next milestone called out.
- **Engine is pure.** `GameEngine` is a reducer with no React, no DOM, no
  timers. The React adapter (`useGameEngine`) wires it to state; `useTimer`
  emits TICK actions. This makes the engine trivially unit-testable later.
- **Lifelines are first-class.** `GameState.lifelines` already has slots for
  `fiftyFifty`, `audienceHint`, `skip`. The skip lifeline is wired today; the
  others render disabled buttons so the UI/UX is locked in.
- **Difficulty ladder.** Questions are ordered by `level` (1–15). The ladder
  in `data/prizeLadder.ts` mirrors the millionaire format with safe-haven
  checkpoints at level 5 and level 10.
- **Sound is placeholder.** `SoundManager` exposes `play('correct')` etc. but
  the underlying `Audio` calls are guarded so missing files do not crash. Drop
  MP3s into `public/sfx/` to light it up.
- **Keyboard.** `A/B/C/D` (or `1/2/3/4`) pick answers, `Enter` confirms /
  advances, `Escape` returns to intro.

## Out of scope (intentional)

- No backend calls. Mock data only.
- No auth, no user state.
- No tailwind dependency — keeps the prototype self-contained.
- No router lib — three screens, plain state machine is enough.
