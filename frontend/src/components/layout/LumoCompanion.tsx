import { useEffect, useMemo, useRef, useState } from 'react';
import { GripHorizontal, Lightbulb, Maximize2, Minimize2, Send, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
  askLumoTutor,
  getLumoRouteHint,
  LUMO_SUGGESTION_POOL,
  type LumoMood,
} from '../../services/lumoTutorService';
import { LumoLiveMascot } from '../ui/LumoLiveMascot';

type ChatMessage = {
  id: string;
  role: 'lumo' | 'user';
  text: string;
};

type ResizeEdge = 'right' | 'bottom' | 'corner';

type WindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface LumoCompanionProps {
  isVisible?: boolean;
}

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 440;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 320;
const NAV_SAFE_TOP = 68;
const EDGE_PAD = 12;

function getInitialRect(): WindowRect {
  if (typeof window === 'undefined') {
    return { x: 20, y: 120, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
  const width = Math.min(DEFAULT_WIDTH, window.innerWidth - EDGE_PAD * 2);
  const height = Math.min(DEFAULT_HEIGHT, window.innerHeight - NAV_SAFE_TOP - 96);
  const x = Math.max(EDGE_PAD, 20);
  const y = Math.max(NAV_SAFE_TOP, window.innerHeight - height - 92);
  return { x, y, width, height };
}

function clampRect(r: WindowRect): WindowRect {
  if (typeof window === 'undefined') return r;
  const maxW = Math.max(MIN_WIDTH, window.innerWidth - EDGE_PAD * 2);
  const maxH = Math.max(MIN_HEIGHT, window.innerHeight - NAV_SAFE_TOP - EDGE_PAD);
  const width = Math.min(maxW, Math.max(MIN_WIDTH, r.width));
  const height = Math.min(maxH, Math.max(MIN_HEIGHT, r.height));
  const maxX = Math.max(EDGE_PAD, window.innerWidth - width - EDGE_PAD);
  const maxY = Math.max(NAV_SAFE_TOP, window.innerHeight - height - EDGE_PAD);
  const x = Math.min(maxX, Math.max(EDGE_PAD, r.x));
  const y = Math.min(maxY, Math.max(NAV_SAFE_TOP, r.y));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

export function LumoCompanion({ isVisible = true }: LumoCompanionProps) {
  const location = useLocation();
  const routeHint = useMemo(
    () => getLumoRouteHint({ pathname: location.pathname, search: location.search }),
    [location.pathname, location.search],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [visiblePrompts, setVisiblePrompts] = useState<string[]>(() => routeHint.quickPrompts.slice(0, 3));
  const nextPoolIndexRef = useRef(0);
  const [mood, setMood] = useState<LumoMood>(routeHint.mood);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // True top-left anchored OS window rect (x, y, width, height)
  const [winRect, setWinRect] = useState<WindowRect>(() => getInitialRect());
  const [isMaximized, setIsMaximized] = useState(false);
  const prevRectRef = useRef<WindowRect>(getInitialRect());
  const [isInteracting, setIsInteracting] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    pointerId: number;
  } | null>(null);

  const resizeRef = useRef<{
    edge: ResizeEdge;
    startX: number;
    startY: number;
    origin: WindowRect;
    pointerId: number;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Keep window inside viewport whenever browser resizes
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => {
      setWinRect((prev) => clampRect(prev));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen]);

  // Drag title bar
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsInteracting(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: winRect.x,
      originY: winRect.y,
      pointerId: e.pointerId,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    setWinRect((prev) =>
      clampRect({
        ...prev,
        x: st.originX + (e.clientX - st.startX),
        y: st.originY + (e.clientY - st.startY),
      }),
    );
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setIsInteracting(false);
  };

  // Resize from right edge, bottom edge, or bottom-right corner (top-left stays 100% anchored!)
  const handleResizePointerDown = (edge: ResizeEdge) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsInteracting(true);
    setIsMaximized(false);
    resizeRef.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      origin: winRect,
      pointerId: e.pointerId,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = resizeRef.current;
    if (!st || st.pointerId !== e.pointerId) return;

    const maxW = Math.min(760, window.innerWidth - st.origin.x - EDGE_PAD);
    const maxH = Math.min(760, window.innerHeight - st.origin.y - EDGE_PAD);

    let nextW = st.origin.width;
    let nextH = st.origin.height;
    if (st.edge === 'right' || st.edge === 'corner') {
      nextW = Math.min(maxW, Math.max(MIN_WIDTH, st.origin.width + (e.clientX - st.startX)));
    }
    if (st.edge === 'bottom' || st.edge === 'corner') {
      nextH = Math.min(maxH, Math.max(MIN_HEIGHT, st.origin.height + (e.clientY - st.startY)));
    }

    setWinRect({
      x: st.origin.x,
      y: st.origin.y,
      width: Math.round(nextW),
      height: Math.round(nextH),
    });
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = resizeRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resizeRef.current = null;
    setIsInteracting(false);
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setWinRect(clampRect(prevRectRef.current));
    } else {
      prevRectRef.current = winRect;
      const targetW = Math.min(640, window.innerWidth - EDGE_PAD * 2);
      const targetH = Math.min(660, window.innerHeight - NAV_SAFE_TOP - EDGE_PAD * 2);
      setIsMaximized(true);
      setWinRect(
        clampRect({
          x: Math.round((window.innerWidth - targetW) / 2),
          y: NAV_SAFE_TOP + 8,
          width: targetW,
          height: targetH,
        }),
      );
    }
  };

  // Sync Lumo expression & show fresh contextual hint when navigating to a new lesson/page
  useEffect(() => {
    setMood(routeHint.mood);
    setShowBubble(true);
    setVisiblePrompts(routeHint.quickPrompts.slice(0, 3));
    nextPoolIndexRef.current = 0;
    const timer = window.setTimeout(() => setShowBubble(false), 9000);
    return () => window.clearTimeout(timer);
  }, [routeHint]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isThinking]);

  if (!isVisible) return null;

  const replacePromptAt = (slotIdx: number) => {
    setVisiblePrompts((prev) => {
      const activeSet = new Set(prev);
      const fullPool = [...routeHint.quickPrompts, ...LUMO_SUGGESTION_POOL];
      let replacement: string | null = null;
      for (let i = 0; i < fullPool.length; i += 1) {
        const candidate = fullPool[(nextPoolIndexRef.current + i) % fullPool.length];
        if (!activeSet.has(candidate)) {
          replacement = candidate;
          nextPoolIndexRef.current = (nextPoolIndexRef.current + i + 1) % fullPool.length;
          break;
        }
      }
      if (!replacement) return prev;
      const next = [...prev];
      next[slotIdx] = replacement;
      return next;
    });
  };

  const sendQuestion = async (text: string, fromSuggestionIdx?: number) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;
    setInput('');
    setShowBubble(false);
    if (fromSuggestionIdx !== undefined) {
      replacePromptAt(fromSuggestionIdx);
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setMood('thinking');

    const res = await askLumoTutor(trimmed, {
      pathname: location.pathname,
      search: location.search,
    });

    setMessages((prev) => [
      ...prev,
      { id: `l-${Date.now()}`, role: 'lumo', text: res.reply },
    ]);
    setMood(res.mood);
    setIsThinking(false);
  };

  return (
    <>
      {/* Independent Top-Left Anchored OS-Style Floating Window */}
      {isOpen && (
        <section
          aria-label="Trợ lý học tập Lumo"
          style={{
            left: `${winRect.x}px`,
            top: `${winRect.y}px`,
            width: `${winRect.width}px`,
            height: `${winRect.height}px`,
          }}
          className={`fixed z-[430] flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_48px_-20px_rgba(17,16,25,0.28)] ${
            isInteracting ? 'select-none' : ''
          }`}
        >
          {/* Draggable Window Title Bar */}
          <div
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
            onDoubleClick={toggleMaximize}
            title="Kéo để di chuyển · Nhấp đúp để phóng to / thu nhỏ"
            className="flex shrink-0 cursor-grab items-center justify-between gap-3 border-b border-border bg-bg-secondary/60 px-4 py-3 touch-none active:cursor-grabbing"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <LumoLiveMascot
                mood={mood}
                size={40}
                riveSrc="/animations/lumo-rive.riv"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold leading-tight text-text-primary">
                  Trợ lý Lumo
                </p>
                <p className="truncate text-[11px] font-semibold text-text-secondary">
                  {isThinking ? 'Đang suy nghĩ...' : 'Kéo tiêu đề để di chuyển · Kéo góc để đổi cỡ'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <GripHorizontal size={15} className="hidden text-text-muted sm:block" aria-hidden />
              <button
                type="button"
                onClick={toggleMaximize}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                aria-label={isMaximized ? 'Thu nhỏ cửa sổ Lumo' : 'Phóng to cửa sổ Lumo'}
                title={isMaximized ? 'Thu nhỏ' : 'Phóng to'}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                aria-label="Đóng Lumo"
                title="Đóng"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3.5 text-sm"
          >
            <div className="rounded-2xl rounded-tl-sm bg-primary-light/70 px-3.5 py-2.5 text-xs leading-relaxed text-text-primary">
              {routeHint.tip}
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-primary font-semibold text-white'
                      : 'rounded-tl-sm border border-border bg-bg-secondary/70 text-text-primary'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-bg-secondary px-3.5 py-2 text-xs font-semibold text-text-secondary">
                Lumo đang trả lời...
              </div>
            )}
          </div>

          {/* Collapsible Quick-Ask Suggestions */}
          {showSuggestions && (
            <div className="shrink-0 border-t border-border/70 bg-bg-secondary/35 px-3.5 py-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-text-muted">Gợi ý nhanh</span>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  className="inline-flex cursor-pointer items-center gap-0.5 text-[11px] font-bold text-text-muted transition-colors hover:text-text-primary"
                >
                  Ẩn hết
                  <X size={12} aria-hidden />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visiblePrompts.map((prompt, idx) => (
                  <button
                    key={`${idx}-${prompt}`}
                    type="button"
                    disabled={isThinking}
                    onClick={() => void sendQuestion(prompt, idx)}
                    className="cursor-pointer rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-text-secondary transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ask Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendQuestion(input);
            }}
            className="flex shrink-0 items-center gap-2 border-t border-border bg-surface p-2.5 pr-4"
          >
            {!showSuggestions && (
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                title="Hiện lại câu hỏi gợi ý"
                aria-label="Hiện lại câu hỏi gợi ý"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-bg-secondary/60 text-text-secondary transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Lightbulb size={14} />
              </button>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi Lumo về bài học..."
              className="min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary/60 px-3 py-2 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-45"
              aria-label="Gửi câu hỏi cho Lumo"
            >
              <Send size={14} />
            </button>
          </form>

          {/* Right-Edge Resize Handle */}
          <div
            onPointerDown={handleResizePointerDown('right')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            aria-hidden="true"
            className="absolute inset-y-3 right-0 w-1.5 cursor-ew-resize touch-none"
          />

          {/* Bottom-Edge Resize Handle */}
          <div
            onPointerDown={handleResizePointerDown('bottom')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            aria-hidden="true"
            className="absolute inset-x-3 bottom-0 h-1.5 cursor-ns-resize touch-none"
          />

          {/* Bottom-Right Corner Resize Grip */}
          <div
            onPointerDown={handleResizePointerDown('corner')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            title="Kéo góc để phóng to / thu nhỏ"
            aria-label="Kéo góc để thay đổi kích thước cửa sổ Lumo"
            className="absolute bottom-0 right-0 flex h-4 w-4 cursor-nwse-resize items-end justify-end p-0.5 touch-none text-text-muted/70 hover:text-primary"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </section>
      )}

      {/* Floating Living Mascot Button + Gentle Contextual Speech Bubble */}
      <div className="fixed bottom-20 left-4 z-[420] flex items-end gap-2.5 lg:bottom-5 lg:left-5">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (!isOpen) {
                setWinRect((prev) => clampRect(prev));
              }
              setIsOpen((v) => !v);
              setShowBubble(false);
            }}
            aria-label="Mở trợ lý Lumo"
            aria-expanded={isOpen}
            className="relative block cursor-pointer rounded-full bg-transparent p-0 focus:outline-none"
          >
            <LumoLiveMascot
              mood={mood}
              size={64}
              riveSrc="/animations/lumo-rive.riv"
            />
          </button>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-0.5 top-0 h-3.5 w-3.5 rounded-full border-2 border-surface bg-[#10B981]"
          />
        </div>

        {!isOpen && showBubble && (
          <div className="cinema-content-in relative flex max-w-[250px] items-start gap-2 rounded-2xl rounded-bl-sm border border-border bg-surface px-3.5 py-2.5 shadow-md">
            <button
              type="button"
              onClick={() => {
                setWinRect((prev) => clampRect(prev));
                setIsOpen(true);
                setShowBubble(false);
              }}
              className="cursor-pointer text-left text-xs font-semibold leading-snug text-text-primary hover:text-primary"
            >
              {routeHint.tip}
            </button>
            <button
              type="button"
              onClick={() => setShowBubble(false)}
              className="mt-0.5 shrink-0 cursor-pointer text-text-muted hover:text-text-primary"
              aria-label="Ẩn gợi ý"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
