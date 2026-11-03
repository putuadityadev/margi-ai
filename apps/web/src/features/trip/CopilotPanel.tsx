import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, ChevronDown, RotateCw } from 'lucide-react';
import type { CopilotIntent, CopilotReply, TripPlan, TripSuggestion } from '@margi-ai/shared';
import { gsap, useGSAP } from '../../lib/gsap';
import type { ChatEntry } from '../../stores/tripStore';
import { SuggestionCard } from './SuggestionCard';

export interface CopilotPanelProps {
  readonly chat: readonly ChatEntry[];
  readonly isThinking: boolean;
  readonly isError: boolean;
  readonly appliedIds: readonly string[];
  /** Plan currently on screen; cards from older plans are disabled. */
  readonly currentPlanKey: string;
  readonly onSend: (input: { message?: string; intent?: CopilotIntent }) => void;
  readonly onRetry: () => void;
  readonly onApply: (suggestion: TripSuggestion, plan: TripPlan) => void;
  readonly onPreview: (suggestion: TripSuggestion | null) => void;
}

/** Stable key of a plan request, used to tell whether a reply's cards still apply. */
export function planKeyOf(plan: TripPlan): string {
  return JSON.stringify(plan.request);
}

function TypingIndicator({ label }: { readonly label: string }) {
  return (
    <div className="flex items-center gap-3 py-2" role="status">
      <span className="flex h-8 w-8 flex-none items-center justify-center border border-ink bg-lime font-mono text-[12px] text-ink">
        M
      </span>
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="typing-dot h-1.5 w-1.5 bg-ink"
            style={{ animationDelay: `${dot * 140}ms` }}
          />
        ))}
      </span>
      <span className="text-body-sm text-graphite">{label}</span>
    </div>
  );
}

function AssistantMessage({
  reply,
  isLatest,
  props,
}: {
  readonly reply: CopilotReply;
  readonly isLatest: boolean;
  readonly props: CopilotPanelProps;
}) {
  const { t } = useTranslation('trip');
  const scope = useRef<HTMLDivElement>(null);
  const isStale = planKeyOf(reply.plan) !== props.currentPlanKey;

  useGSAP(
    () => {
      if (!isLatest) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-word]', {
          autoAlpha: 0,
          y: 4,
          duration: 0.35,
          ease: 'power2.out',
          stagger: 0.018,
        });
        gsap.from('[data-card]', {
          y: 16,
          autoAlpha: 0,
          duration: 0.45,
          ease: 'power3.out',
          stagger: 0.08,
          delay: 0.3,
        });
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="flex gap-3">
      <span
        className="flex h-8 w-8 flex-none items-center justify-center border border-ink bg-lime font-mono text-[12px] text-ink"
        aria-hidden="true"
      >
        M
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-body text-ink">
          {reply.text.split(' ').map((word, index) => (
            <span key={index} data-word className="inline-block whitespace-pre">
              {word}{' '}
            </span>
          ))}
        </p>
        <p className="font-mono text-[10px] text-graphite uppercase">
          {t(`copilot.source.${reply.source}`)}
        </p>
        {reply.suggestions.length > 0 && (
          <div className="grid gap-2">
            {reply.suggestions.map((suggestion) => (
              <div key={suggestion.id} data-card>
                <SuggestionCard
                  suggestion={suggestion}
                  plan={reply.plan}
                  isApplied={props.appliedIds.includes(suggestion.id)}
                  isStale={isStale}
                  onApply={(chosen) => props.onApply(chosen, reply.plan)}
                  onPreview={props.onPreview}
                />
              </div>
            ))}
          </div>
        )}
        {reply.trace.length > 0 && (
          <details className="group border-t border-ash pt-2">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-body-sm text-graphite hover:text-ink">
              <ChevronDown
                size={14}
                className="transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
              {t('copilot.trace')}
            </summary>
            <ol className="mt-2 space-y-2">
              {reply.trace.map((step, index) => (
                <li key={step.code} className="grid grid-cols-[20px_1fr] gap-2">
                  <span className="font-mono text-[11px] text-graphite">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block text-body-sm text-ink">{step.label}</span>
                    <span className="block font-mono text-[11px] break-words text-graphite">
                      {step.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}

/** Chat with MARGI: narrative replies, actionable suggestion cards, quick replies, free text. */
export function CopilotPanel(props: CopilotPanelProps): ReactNode {
  const { t } = useTranslation('trip');
  const [message, setMessage] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const { chat, isThinking } = props;
  const lastAssistant = [...chat].reverse().find((entry) => entry.role === 'assistant');
  const quickReplies = lastAssistant?.role === 'assistant' ? lastAssistant.reply.quickReplies : [];

  // A new answer scrolls to its first line so the narrative is read before the cards;
  // anything else (typing, events) keeps the end of the thread in view.
  useEffect(() => {
    const target =
      chat.at(-1)?.role === 'assistant' && !isThinking ? latestRef.current : endRef.current;
    target?.scrollIntoView?.({
      behavior: 'smooth',
      block: target === endRef.current ? 'end' : 'start',
    });
  }, [chat, isThinking]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const text = message.trim();
    if (!text || isThinking) return;
    setMessage('');
    props.onSend({ message: text });
  };

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pt-4 pb-4"
        aria-live="polite"
      >
        <p className="border-l-2 border-ink pl-3 text-body-sm text-graphite">
          {t('copilot.intro')}
        </p>
        {chat.map((entry) => {
          if (entry.role === 'user') {
            return (
              <p
                key={entry.id}
                className="ml-auto w-fit max-w-[85%] bg-ink px-3 py-2 text-body-sm text-white"
              >
                {entry.text}
              </p>
            );
          }
          if (entry.role === 'event') {
            return (
              <p
                key={entry.id}
                className="flex items-center gap-2 font-mono text-[11px] text-graphite"
              >
                <span className="h-px flex-1 bg-ash" aria-hidden="true" />
                {entry.text}
                <span className="h-px flex-1 bg-ash" aria-hidden="true" />
              </p>
            );
          }
          const isLatest = entry.id === lastAssistant?.id;
          return (
            <div key={entry.id} ref={isLatest ? latestRef : undefined} className="scroll-mt-3">
              <AssistantMessage reply={entry.reply} isLatest={isLatest} props={props} />
            </div>
          );
        })}
        {isThinking && <TypingIndicator label={t('copilot.thinking')} />}
        {props.isError && !isThinking && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border border-ink p-3"
          >
            <span className="text-body-sm text-ink">{t('copilot.error')}</span>
            <button
              type="button"
              onClick={props.onRetry}
              className="flex items-center gap-1.5 text-body-sm text-ink underline"
            >
              <RotateCw size={14} aria-hidden="true" />
              {t('copilot.retry')}
            </button>
          </div>
        )}
        <p className="text-[11px] text-graphite">{t('copilot.forecastNote')}</p>
        <div ref={endRef} />
      </div>

      <div className="flex-none border-t border-ash bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {quickReplies.length > 0 && (
          <div className="no-scrollbar -mx-5 mb-2.5 flex gap-1.5 overflow-x-auto px-5">
            {quickReplies.map((reply) => (
              <button
                key={reply.intent}
                type="button"
                disabled={isThinking}
                onClick={() => props.onSend({ intent: reply.intent, message: reply.label })}
                className="h-9 flex-none border border-ink bg-white px-3 text-body-sm text-ink hover:bg-parchment disabled:opacity-40"
              >
                {reply.label}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex">
          <label htmlFor="copilot-input" className="sr-only">
            {t('copilot.inputLabel')}
          </label>
          <input
            id="copilot-input"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t('copilot.inputPlaceholder')}
            autoComplete="off"
            maxLength={500}
            className="h-12 min-w-0 flex-1 border border-ink bg-white px-3 text-body text-ink placeholder:text-stone focus:outline-none"
          />
          <button
            type="submit"
            disabled={isThinking || message.trim().length === 0}
            aria-label={t('copilot.send')}
            className="flex h-12 w-12 flex-none items-center justify-center border border-l-0 border-ink bg-lime text-ink disabled:bg-parchment disabled:text-graphite"
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
