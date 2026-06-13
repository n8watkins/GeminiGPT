'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * Rotating prompt suggestions, including one that demos cross-chat memory.
 */
const SUGGESTIONS = [
  'Try: tell me about your day…',
  "Try: what's the weather in Tokyo?",
  'Try: tell one chat a secret, then ask another chat about it',
  'Try: explain how this app remembers things across chats',
];

const TYPE_SPEED_MS = 45;
const DELETE_SPEED_MS = 22;
const HOLD_FULL_MS = 2200;
const HOLD_EMPTY_MS = 500;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false // SSR fallback: assume motion is fine until hydrated
  );
}

/**
 * Animated typewriter placeholder overlay for the chat input.
 *
 * Rendered as a pointer-events-none overlay (NOT the input's value), so it
 * vanishes the instant the user has any content in the input. Types each
 * suggestion character-by-character, pauses, deletes, and cycles. With
 * prefers-reduced-motion it shows a static suggestion instead of animating.
 *
 * Usage: wrap the input in a `relative` container, keep the input's native
 * placeholder empty, and render this when the input value is empty.
 */
export default function TypewriterPlaceholder({ className = '' }: { className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [text, setText] = useState('');
  // Animation state lives in refs so a single timeout chain drives it
  // without re-creating effects on every keystroke of the animation.
  const stateRef = useRef({ suggestion: 0, char: 0, deleting: false });

  useEffect(() => {
    if (reducedMotion) return;

    let timeout: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const state = stateRef.current;
      const current = SUGGESTIONS[state.suggestion];
      let delay: number;

      if (!state.deleting) {
        state.char += 1;
        setText(current.slice(0, state.char));
        if (state.char >= current.length) {
          state.deleting = true;
          delay = HOLD_FULL_MS; // pause on the full sentence
        } else {
          delay = TYPE_SPEED_MS;
        }
      } else {
        state.char -= 1;
        setText(current.slice(0, state.char));
        if (state.char <= 0) {
          state.deleting = false;
          state.suggestion = (state.suggestion + 1) % SUGGESTIONS.length;
          delay = HOLD_EMPTY_MS; // brief beat before the next suggestion
        } else {
          delay = DELETE_SPEED_MS;
        }
      }

      timeout = setTimeout(tick, delay);
    };

    timeout = setTimeout(tick, HOLD_EMPTY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [reducedMotion]);

  return (
    <span
      aria-hidden="true"
      data-testid="typewriter-placeholder"
      className={`pointer-events-none absolute inset-y-0 left-4 right-4 flex items-center text-gray-400 dark:text-gray-400 truncate select-none ${className}`}
    >
      <span className="truncate">{reducedMotion ? SUGGESTIONS[0] : text}</span>
      {!reducedMotion && (
        <span className="ml-0.5 w-px h-[1.1em] bg-gray-400 dark:bg-gray-400 animate-pulse" />
      )}
    </span>
  );
}
