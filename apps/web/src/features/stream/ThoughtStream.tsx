import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircleIcon, CheckCircleIcon } from '../../components/ui';
import { useStreamStore } from '../../stores/streamStore';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { ScanningIllustration } from './ScanningIllustration';

export interface ThoughtStreamProps {
  readonly className?: string;
}

type HumanStepState = 'pending' | 'active' | 'done';

export function ThoughtStream({ className = '' }: ThoughtStreamProps): ReactNode {
  const { i18n } = useTranslation('results');
  const isId = i18n.language.startsWith('id');

  const events = useStreamStore((s) => s.events);
  const status = useStreamStore((s) => s.status);
  const sections = useStreamStore((s) => s.sections);
  const result = useStreamStore((s) => s.result);
  const error = useStreamStore((s) => s.error);
  const previewUrl = useAnalyzerStore((s) => s.previewUrl);

  const isCompleted = status === 'completed' || Boolean(result);
  const isFailed = status === 'failed' || Boolean(error && !error.recoverable);

  // Derive 3 simple human-friendly stages from stream events & partial sections
  const { steps, progressPct } = useMemo(() => {
    const hasVibeDone =
      Boolean(sections.vibe || result?.vibe) ||
      events.some(
        (e) =>
          e.event.type === 'step' &&
          e.event.agent === 'vibe' &&
          (e.event.status === 'done' || e.event.status === 'fallback'),
      );

    const hasCrowdStarted = events.some(
      (e) => 'agent' in e.event && (e.event.agent === 'crowd' || e.event.agent === 'bundler'),
    );

    const hasCrowdDone =
      Boolean(sections.origin || sections.candidates || result?.origin) ||
      events.some(
        (e) =>
          e.event.type === 'step' &&
          e.event.agent === 'crowd' &&
          (e.event.status === 'done' || e.event.status === 'fallback'),
      );

    const hasBundlerDone = Boolean(sections.recommendations || result) || isCompleted;

    const step1: HumanStepState = hasVibeDone ? 'done' : 'active';
    const step2: HumanStepState = hasCrowdDone
      ? 'done'
      : hasVibeDone || hasCrowdStarted
        ? 'active'
        : 'pending';
    const step3: HumanStepState = hasBundlerDone
      ? 'done'
      : hasCrowdDone
        ? 'active'
        : 'pending';

    const pct = hasBundlerDone ? 100 : hasCrowdDone ? 78 : hasVibeDone ? 48 : 22;

    return {
      progressPct: pct,
      steps: [
        {
          id: 'photo',
          label: isId
            ? 'Mengenali suasana & ciri pemandangan dari foto'
            : 'Reading scenery & atmosphere from your photo',
          state: step1,
        },
        {
          id: 'traffic',
          label: isId
            ? 'Mengecek tingkat keramaian & perkiraan antre'
            : 'Checking current crowd levels & wait time',
          state: step2,
        },
        {
          id: 'places',
          label: isId
            ? 'Menyiapkan tempat serupa yang tenang & UMKM terdekat'
            : 'Finding calmer similar places & nearby local spots',
          state: step3,
        },
      ],
    };
  }, [events, sections, result, isCompleted, isId]);

  if (status === 'idle' && !result && !error) {
    return null;
  }

  // Friendly error state (e.g., not a travel scene or temporary busy error)
  if (isFailed && error) {
    return (
      <section
        aria-label={isId ? 'Status pemeriksaan foto' : 'Photo check status'}
        className={`rounded-card bg-white border border-ash p-6 space-y-3 ${className}`}
        data-testid="thought-stream"
      >
        <div
          role="alert"
          className="flex items-start gap-3 text-ink"
        >
          <div className="h-10 w-10 rounded-pill bg-parchment border border-ash flex items-center justify-center shrink-0">
            <AlertCircleIcon size={20} className="text-ink" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-ink">
              {isId ? 'Foto belum dapat diproses' : 'Could not check this photo'}
            </h3>
            <p className="text-body-sm text-graphite leading-relaxed">{error.message}</p>
          </div>
        </div>
      </section>
    );
  }

  // Quiet single-line confirmation once completed so results sit right at the top
  if (isCompleted) {
    return (
      <section
        aria-label={isId ? 'Pemeriksaan selesai' : 'Scan complete'}
        className={`rounded-none bg-parchment border border-ash px-4 py-2.5 flex items-center gap-2.5 text-xs text-ink ${className}`}
        data-testid="thought-stream"
      >
        <CheckCircleIcon size={16} className="text-ink" />
        <span className="font-medium">
          {isId
            ? 'Foto selesai diperiksa — berikut kondisi keramaian & rekomendasi tempat tenang.'
            : 'Photo checked — here is the crowd report and calmer places nearby.'}
        </span>
      </section>
    );
  }

  const activeStepIndex = steps.findIndex((s) => s.state === 'active');

  // Active Scanning State with Animated Person Illustration
  return (
    <section
      aria-label={isId ? 'Memeriksa foto tempat wisata' : 'Scanning destination photo'}
      className={`rounded-none bg-white border border-ash p-5 sm:p-7 space-y-6 max-w-xl mx-auto ${className}`}
      data-testid="thought-stream"
    >
      <ScanningIllustration
        previewUrl={previewUrl}
        photoLabel={isId ? 'Foto Anda' : 'Your photo'}
        activeStep={activeStepIndex >= 0 ? activeStepIndex : undefined}
      />

      {/* Progress Bar & Title */}
      <div className="space-y-2.5 text-center">
        <h2 className="text-subheading font-medium text-ink tracking-tight">
          {isId ? 'Memeriksa kondisi tempat...' : 'Checking this place...'}
        </h2>
        <p className="text-body-sm text-graphite">
          {isId
            ? 'Tunggu sebentar, kami sedang menyiapkan laporan keramaian dan alternatif tenang untuk Anda.'
            : 'Hang tight while we prepare your crowd report and calmer recommendations.'}
        </p>

        <div
          className="h-2 w-full rounded-none bg-parchment border border-ash overflow-hidden mt-3"
          role="progressbar"
          aria-label={isId ? 'Kemajuan pemeriksaan' : 'Scan progress'}
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-lime transition-all duration-500 ease-out rounded-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Simple 3-Step Human Progress List */}
      <div
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className="space-y-2.5 rounded-inner bg-parchment p-4 border border-ash/80"
      >
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-3 text-body-sm"
            data-testid={`scan-step-${step.id}`}
            data-state={step.state}
          >
            {step.state === 'done' ? (
              <CheckCircleIcon size={16} className="text-ink" />
            ) : step.state === 'active' ? (
              <span
                className="h-3 w-3 rounded-full bg-lime border border-ink animate-pulse shrink-0 ml-0.5 mr-0.5"
                role="status"
                aria-label="in progress"
              />
            ) : (
              <span
                className="h-2.5 w-2.5 rounded-full bg-ash shrink-0 ml-0.5 mr-1"
                aria-hidden="true"
              />
            )}
            <span
              className={
                step.state === 'pending'
                  ? 'text-stone font-normal'
                  : 'text-ink font-medium'
              }
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
