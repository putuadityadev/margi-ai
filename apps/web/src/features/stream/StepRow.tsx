import type { ReactNode } from 'react';
import type { StreamEvent, StepStatus, TelemetryTier } from '@margi-ai/shared';

export interface StepRowProps {
  readonly event: StreamEvent;
  readonly isLatest?: boolean;
}

function StatusIndicator({ status }: { readonly status: StepStatus }): ReactNode {
  switch (status) {
    case 'running':
      return (
        <span
          className="inline-block w-2.5 h-2.5 rounded-full bg-lime animate-pulse shrink-0"
          aria-label="running"
          role="status"
        />
      );
    case 'done':
      return (
        <span
          className="inline-flex items-center justify-center text-lime font-mono text-sm leading-none shrink-0"
          aria-label="completed"
        >
          ✓
        </span>
      );
    case 'fallback':
      return (
        <span
          className="inline-flex items-center justify-center text-smoke font-mono text-xs leading-none shrink-0"
          aria-label="fallback"
        >
          ▲
        </span>
      );
    case 'failed':
      return (
        <span
          className="inline-flex items-center justify-center text-smoke font-mono text-sm leading-none shrink-0"
          aria-label="failed"
        >
          ✕
        </span>
      );
    default:
      return null;
  }
}

function TierBadge({ tier }: { readonly tier: TelemetryTier }): ReactNode {
  const labels: Record<TelemetryTier, string> = {
    LIVE: 'Live',
    FORECAST: 'Forecast',
    SIMULATION: 'Simulated',
  };

  const colors: Record<TelemetryTier, string> = {
    LIVE: 'text-parchment border-stone/60 bg-[#22221c]',
    FORECAST: 'text-stone border-stone/40 bg-stone/10',
    SIMULATION: 'text-smoke border-stone/40 bg-stone/10',
  };

  return (
    <span
      className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-inner border tracking-wide ${colors[tier]}`}
      data-testid="tier-badge"
    >
      {labels[tier]}
    </span>
  );
}

function formatPayload(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function StepRow({ event }: StepRowProps): ReactNode {
  if (event.type === 'step') {
    return (
      <div
        className="font-mono text-[13px] leading-relaxed py-1.5 border-b border-stone/10 last:border-b-0"
        data-testid="step-row"
        data-step-id={event.stepId}
        data-status={event.status}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="pt-1">
              <StatusIndicator status={event.status} />
            </div>
            <div className="min-w-0">
              <div className="text-parchment font-medium break-words">{event.title}</div>
              {event.detail ? (
                <div className="text-xs text-stone mt-0.5 break-words">{event.detail}</div>
              ) : null}
            </div>
          </div>
          {event.ms != null ? (
            <span className="text-xs text-stone shrink-0 tabular-nums">{event.ms}ms</span>
          ) : null}
        </div>

        {event.data != null ? (
          <details className="mt-1.5 ml-5 text-xs text-stone group">
            <summary className="cursor-pointer hover:text-parchment select-none text-[11px] focus-visible:outline-none focus-visible:text-parchment">
              Payload & Details
            </summary>
            <pre className="mt-1 p-2 rounded-inner bg-[#22221c] text-parchment/80 overflow-x-auto border border-stone/30 font-mono text-[11px] whitespace-pre-wrap max-h-48">
              {formatPayload(event.data)}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  if (event.type === 'tool_call') {
    return (
      <div
        className="font-mono text-[13px] leading-relaxed py-1.5 border-b border-stone/10 last:border-b-0"
        data-testid="tool-call-row"
        data-tool={event.tool}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              className="text-stone font-mono text-sm leading-none shrink-0 pt-0.5"
              aria-hidden="true"
            >
              λ
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-parchment/70 font-normal">{event.tool}</span>
                {event.tier ? <TierBadge tier={event.tier} /> : null}
              </div>
              <div className="text-parchment font-normal text-xs mt-0.5 break-words">
                {event.resultSummary}
              </div>
            </div>
          </div>
          <span className="text-xs text-stone shrink-0 tabular-nums">{event.ms}ms</span>
        </div>

        {event.args != null ? (
          <details className="mt-1.5 ml-5 text-xs text-stone group">
            <summary className="cursor-pointer hover:text-parchment select-none text-[11px] focus-visible:outline-none focus-visible:text-parchment">
              Tool Arguments
            </summary>
            <pre className="mt-1 p-2 rounded-inner bg-[#22221c] text-parchment/80 overflow-x-auto border border-stone/30 font-mono text-[11px] whitespace-pre-wrap max-h-48">
              {formatPayload(event.args)}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  if (event.type === 'error') {
    return (
      <div
        className="font-mono text-[13px] leading-relaxed py-1.5 border-b border-stone/10 last:border-b-0 text-smoke"
        data-testid="error-row"
        role="alert"
      >
        <div className="flex items-start gap-2.5">
          <span className="font-mono text-sm leading-none shrink-0 pt-0.5">✕</span>
          <div>
            <span className="font-medium">[{event.code}]</span> {event.message}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
