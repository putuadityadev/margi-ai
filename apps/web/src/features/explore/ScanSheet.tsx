import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import { gsap, useGSAP } from '../../lib/gsap';
import { ExploreSheet } from './ExploreSheet';

export interface ScanSheetProps {
  readonly scanRun: number;
  readonly durationMs: number;
  readonly radiusKm: number;
  /** Places found so far; null while the request is still in flight. */
  readonly foundCount: number | null;
  readonly isError: boolean;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
  readonly onHeightChange: (heightPx: number) => void;
}

const STEPS = ['locate', 'radius', 'crowd', 'calm'] as const;

/** Step 3: radar scan status. The radar itself runs on the map around the user marker. */
export function ScanSheet(props: ScanSheetProps): ReactNode {
  const { t } = useTranslation('explore');
  const { durationMs, scanRun, foundCount } = props;
  const [stepIndex, setStepIndex] = useState(0);
  const counter = useRef<HTMLSpanElement>(null);
  const scope = useRef<HTMLDivElement>(null);

  // The page remounts this sheet per scan (key = scanRun), so the step index starts at 0.
  useEffect(() => {
    const stepMs = durationMs / STEPS.length;
    const timers = STEPS.slice(1).map((_, index) =>
      window.setTimeout(() => setStepIndex(index + 1), stepMs * (index + 1)),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [scanRun, durationMs]);

  useGSAP(
    () => {
      if (!counter.current || foundCount === null) return;
      const state = { value: 0 };
      const node = counter.current;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to(state, {
          value: foundCount,
          duration: (durationMs / 1000) * 0.8,
          ease: 'power1.inOut',
          onUpdate: () => {
            node.textContent = String(Math.round(state.value));
          },
        });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        node.textContent = String(foundCount);
      });
    },
    { scope, dependencies: [foundCount, scanRun], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      gsap.from('[data-scan-step]', {
        yPercent: 100,
        autoAlpha: 0,
        duration: 0.4,
        ease: 'power3.out',
      });
    },
    { scope, dependencies: [stepIndex], revertOnUpdate: true },
  );

  const step = STEPS[stepIndex] ?? 'locate';

  return (
    <ExploreSheet
      motionKey={`scan-${scanRun}`}
      label={t(`scan.steps.${step}`, { km: props.radiusKm })}
      onHeightChange={props.onHeightChange}
    >
      <div ref={scope}>
        <div className="h-[3px] w-full bg-ash" aria-hidden="true">
          {!props.isError && (
            <span
              key={scanRun}
              className="scan-progress block h-full bg-ink"
              style={{ '--scan-ms': `${durationMs}ms` } as CSSProperties}
            />
          )}
        </div>

        {props.isError ? (
          <div role="alert" className="pt-5">
            <p className="text-subheading font-medium text-ink">{t('scan.error')}</p>
            <button
              type="button"
              onClick={props.onRetry}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 border border-ink bg-lime text-body font-medium text-ink"
            >
              <RotateCw size={18} />
              {t('scan.retry')}
            </button>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-4 pt-5">
            <div className="min-w-0">
              <p className="font-mono text-caption text-graphite">
                {String(stepIndex + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </p>
              <p
                className="mt-1 min-h-[52px] overflow-hidden text-subheading font-medium text-ink"
                aria-live="polite"
              >
                <span data-scan-step className="block">
                  {t(`scan.steps.${step}`, { km: props.radiusKm })}
                </span>
              </p>
            </div>
            <p className="flex-none text-right">
              <span
                ref={counter}
                className="block font-mono text-[44px] leading-none tracking-[-0.04em] text-ink tabular-nums"
              >
                {foundCount ?? 0}
              </span>
              <span className="text-caption tracking-normal text-graphite">
                {t('scan.found', { count: foundCount ?? 0 })}
              </span>
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={props.onCancel}
          className="mt-4 py-1 text-body-sm text-graphite underline underline-offset-4 hover:text-ink"
        >
          {t('scan.cancel')}
        </button>
      </div>
    </ExploreSheet>
  );
}
