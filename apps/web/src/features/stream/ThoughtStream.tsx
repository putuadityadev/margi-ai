import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentId, StreamDoneEvent } from '@margi-ai/shared';
import { useStreamStore } from '../../stores/streamStore';
import { useReducedMotion } from '../../lib/gsap';
import { StepRow } from './StepRow';

export interface ThoughtStreamProps {
  readonly className?: string;
}

interface AgentConfig {
  readonly id: AgentId;
  readonly nameKey: string;
  readonly subKey: string;
  readonly defaultName: string;
  readonly defaultSub: string;
}

const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'orchestrator',
    nameKey: 'thoughtStream.orchestrator',
    subKey: 'thoughtStream.orchestratorSub',
    defaultName: 'Orchestrator',
    defaultSub: 'Pipeline Director',
  },
  {
    id: 'vibe',
    nameKey: 'thoughtStream.agentVibe',
    subKey: 'thoughtStream.agentVibeSub',
    defaultName: 'Agent 1 · Vibe',
    defaultSub: 'Vision & Embedding',
  },
  {
    id: 'crowd',
    nameKey: 'thoughtStream.agentCrowd',
    subKey: 'thoughtStream.agentCrowdSub',
    defaultName: 'Agent 2 · Crowd',
    defaultSub: 'Telemetry & Forecasts',
  },
  {
    id: 'bundler',
    nameKey: 'thoughtStream.agentBundler',
    subKey: 'thoughtStream.agentBundlerSub',
    defaultName: 'Agent 3 · Bundler',
    defaultSub: 'Scoring & Routing',
  },
];

export function ThoughtStream({ className = '' }: ThoughtStreamProps): ReactNode {
  const { t } = useTranslation('results');
  const events = useStreamStore((s) => s.events);
  const status = useStreamStore((s) => s.status);
  const error = useStreamStore((s) => s.error);
  const reducedMotion = useReducedMotion();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef<boolean>(false);

  // Auto-scroll logic respecting user manual scroll up
  useEffect(() => {
    if (userScrolledUp.current || !scrollRef.current) return;
    if (typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    } else {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, reducedMotion]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distanceFromBottom > 30;
  };

  const doneEvent = events.find((e) => e.event.type === 'done')?.event as
    StreamDoneEvent | undefined;

  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isStreaming = status === 'streaming' || status === 'starting';

  // If collapsed when completed, show the compact summary island
  if (isCompleted && isCollapsed) {
    return (
      <section
        aria-label="Agent Reasoning Summary"
        className={`bg-charcoal text-parchment rounded-card border border-stone p-5 font-mono text-[13px] transition-colors ${className}`}
        data-testid="thought-stream-collapsed"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lime text-base leading-none">✓</span>
            <div>
              <span className="font-medium text-parchment">
                {t('thoughtStream.title', 'Glass-Box Thought Stream')}
              </span>
              <span className="text-stone ml-2 text-xs">
                (
                {doneEvent?.totalMs
                  ? `${(doneEvent.totalMs / 1000).toFixed(2)}s`
                  : t('thoughtStream.completed', 'All agents completed')}
                )
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="text-xs text-parchment/80 hover:text-parchment underline decoration-stone cursor-pointer focus-visible:outline-none"
            aria-label="Expand thought stream"
          >
            {t('thoughtStream.expand', 'Expand stream')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Agent Reasoning Stream"
      className={`bg-charcoal text-parchment rounded-card border border-stone p-6 md:p-8 font-mono text-[13px] transition-colors ${className}`}
      data-testid="thought-stream"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-stone/20 pb-4 mb-4">
        <div className="flex items-center gap-3">
          {isStreaming ? (
            <span
              className="w-2.5 h-2.5 rounded-full bg-lime animate-pulse shrink-0"
              role="status"
              aria-label="Agent pipeline active"
            />
          ) : isCompleted ? (
            <span className="text-lime text-base leading-none" aria-label="Completed">
              ✓
            </span>
          ) : isFailed ? (
            <span className="text-smoke text-base leading-none" aria-label="Failed">
              ✕
            </span>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-stone shrink-0" />
          )}

          <div>
            <h3 className="font-medium text-parchment text-sm">
              {t('thoughtStream.title', 'Glass-Box Thought Stream')}
            </h3>
            <p className="text-xs text-stone font-normal mt-0.5">
              {t(
                'thoughtStream.subtitle',
                'Real-time execution trace across 3 autonomous AI agents',
              )}
            </p>
          </div>
        </div>

        {isCompleted ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="text-xs text-parchment/80 hover:text-parchment underline decoration-stone cursor-pointer shrink-0 focus-visible:outline-none"
            aria-label="Collapse thought stream"
          >
            {t('thoughtStream.collapse', 'Collapse stream')}
          </button>
        ) : null}
      </div>

      {/* Terminal log container with aria-live */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className="max-h-[460px] overflow-y-auto space-y-6 pr-2 focus-visible:outline-none"
        tabIndex={0}
      >
        {AGENT_CONFIGS.map((agent) => {
          const agentEvents = events.filter(
            (e) => 'agent' in e.event && e.event.agent === agent.id,
          );

          // Only render agent group if it has events or if it is the current active agent
          if (agentEvents.length === 0) return null;

          const stepEvents = agentEvents.filter((e) => e.event.type === 'step');
          const lastStep = stepEvents[stepEvents.length - 1]?.event;

          const isAgentRunning =
            status !== 'completed' && lastStep?.type === 'step' && lastStep.status === 'running';
          const hasAgentFailed = agentEvents.some(
            (e) =>
              (e.event.type === 'step' && e.event.status === 'failed') || e.event.type === 'error',
          );
          const hasFallback = agentEvents.some(
            (e) => e.event.type === 'step' && e.event.status === 'fallback',
          );

          return (
            <div
              key={agent.id}
              className="border-t border-stone/15 pt-3 first:border-t-0 first:pt-0"
              data-testid={`agent-group-${agent.id}`}
            >
              {/* Agent Group Header */}
              <div className="flex items-center justify-between text-xs text-stone mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-parchment/90 font-medium">
                    {t(agent.nameKey, agent.defaultName)}
                  </span>
                  <span className="text-stone font-normal">
                    · {t(agent.subKey, agent.defaultSub)}
                  </span>
                </div>
                <div>
                  {isAgentRunning ? (
                    <span className="text-[11px] text-lime font-mono animate-pulse">RUNNING</span>
                  ) : hasAgentFailed ? (
                    <span className="text-[11px] text-smoke font-mono">FAILED</span>
                  ) : hasFallback ? (
                    <span className="text-[11px] text-stone font-mono">FALLBACK / REPLAY</span>
                  ) : (
                    <span className="text-[11px] text-stone font-mono">DONE</span>
                  )}
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-1">
                {agentEvents.map((item, idx) => (
                  <StepRow
                    key={item.id}
                    event={item.event}
                    isLatest={idx === agentEvents.length - 1}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Global Error if any */}
        {error ? (
          <div
            className="p-3 rounded-inner bg-[#22221c] border border-stone/50 text-parchment font-mono text-xs"
            role="alert"
          >
            <div className="font-medium">[{error.code}] Analysis Error</div>
            <div className="mt-1">{error.message}</div>
          </div>
        ) : null}
      </div>

      {/* Footer Line */}
      {doneEvent || isCompleted ? (
        <div
          className="mt-5 pt-4 border-t border-stone/20 text-xs text-stone flex flex-col md:flex-row md:items-center justify-between gap-2"
          data-testid="thought-stream-footer"
        >
          <div>
            {doneEvent?.totalMs ? (
              <span>
                {t('thoughtStream.totalTime', 'Total execution time')}:{' '}
                <strong className="text-parchment font-medium tabular-nums">
                  {(doneEvent.totalMs / 1000).toFixed(2)}s
                </strong>{' '}
                ({doneEvent.totalMs}ms)
              </span>
            ) : (
              <span>{t('thoughtStream.completed', 'All agents completed')}</span>
            )}
          </div>

          {doneEvent?.models && Object.keys(doneEvent.models).length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>{t('thoughtStream.modelsUsed', 'Models')}:</span>
              {Object.entries(doneEvent.models).map(([key, model]) => (
                <span
                  key={key}
                  className="px-1.5 py-0.5 rounded-inner bg-[#22221c] border border-stone/30 text-parchment/80 font-mono text-[11px]"
                >
                  {model}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
