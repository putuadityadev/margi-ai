import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { ArrowLeft, Bookmark, BookmarkCheck, MessageSquare, Navigation, Play } from 'lucide-react';
import {
  googleMapsTripUrl,
  type CopilotIntent,
  type TripPlan,
  type TripSuggestion,
} from '@margi-ai/shared';
import { Spinner } from '../../components/ui';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { placeName } from '../../features/explore/placeText';
import { CopilotPanel, planKeyOf } from '../../features/trip/CopilotPanel';
import { ImpactSheet } from '../../features/trip/ImpactSheet';
import { InsightBanner } from '../../features/trip/InsightBanner';
import { AuthDialog } from '../../features/auth/AuthDialog';
import { useMe } from '../../features/auth/useMe';
import {
  clearPendingSave,
  peekPendingSave,
  stashPendingSave,
} from '../../features/trip/pendingSave';
import { UndoToast } from '../../features/trip/UndoToast';
import { TripMap } from '../../features/trip/TripMap';
import { TripPlanPanel } from '../../features/trip/TripPlanPanel';
import {
  useCopilot,
  useCorridors,
  useDepartureScan,
  useSavePlan,
  useTripInsight,
  useTripPlan,
} from '../../features/trip/queries';
import { suggestionLogLine } from '../../features/trip/tripText';
import { cn } from '../../lib/cn';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { toTripRequest, useTripStore, type TripTab } from '../../stores/tripStore';

const TOP_BAR_PX = 64;
const DESKTOP_PANEL_PX = 456;
/** Phone sheet snap heights as viewport fractions: peek, half, full. */
const SHEET_SNAPS = [0.34, 0.62, 0.92] as const;
const SHEET_INITIAL_SNAP = 1;

interface CopilotInput {
  readonly message?: string;
  readonly intent?: CopilotIntent;
}

function MissingTrip() {
  const { t } = useTranslation('trip');
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 border-t border-ink bg-white p-5 md:inset-auto md:top-20 md:left-4 md:w-[440px] md:border">
      <p className="text-subheading font-medium text-ink">{t('error.missing')}</p>
      <div className="mt-4 flex gap-2">
        <Link
          to="/app"
          className="flex h-12 flex-1 items-center justify-center border border-ink bg-lime text-body font-medium text-ink"
        >
          {t('error.toMap')}
        </Link>
        <Link
          to="/plans"
          className="flex h-12 flex-1 items-center justify-center border border-ink text-body text-ink"
        >
          {t('actions.savedPlans')}
        </Link>
      </div>
    </div>
  );
}

/**
 * `/app/trip`: MARGI's in-app trip plan (DECISIONS D-026). Itinerary and copilot share
 * one draft; every applied suggestion re-evaluates the plan and replays the route.
 */
export function TripPage(): ReactNode {
  const { t, i18n } = useTranslation('trip');
  const isId = i18n.language.startsWith('id');
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const trip = useTripStore(
    useShallow((s) => ({
      draft: s.draft,
      situation: s.situation,
      tab: s.tab,
      chat: s.chat,
      appliedSuggestionIds: s.appliedSuggestionIds,
      changeLog: s.changeLog,
      savedPlanId: s.savedPlanId,
      history: s.history,
      baseline: s.baseline,
    })),
  );
  const actions = useTripStore(
    useShallow((s) => ({
      start: s.start,
      setTab: s.setTab,
      setDepartAt: s.setDepartAt,
      addStop: s.addStop,
      removeStop: s.removeStop,
      moveStop: s.moveStop,
      applyChange: s.applyChange,
      pushUser: s.pushUser,
      pushAssistant: s.pushAssistant,
      markSaved: s.markSaved,
      undo: s.undo,
    })),
  );

  const navigate = useNavigate();
  const locale = isId ? 'id' : 'en';
  const request = toTripRequest(trip.draft);
  const plan = useTripPlan(request);
  const baselinePlan = useTripPlan(trip.baseline);
  const departures = useDepartureScan(request);
  const insight = useTripInsight(request);
  const corridors = useCorridors();
  const copilot = useCopilot();
  const savePlan = useSavePlan();
  const { isAuthenticated } = useMe();
  const [authOpen, setAuthOpen] = useState(false);
  // A plan parked before leaving for Google sign-in; restored and saved once we are back.
  const [resume] = useState(peekPendingSave);
  const resumed = useRef(false);
  const [preview, setPreview] = useState<TripSuggestion | null>(null);
  const [replay, setReplay] = useState(0);
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const [impactOpen, setImpactOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const lastInput = useRef<CopilotInput>({});
  const autoAsked = useRef<string | null>(null);

  const send = useCallback(
    (input: CopilotInput, echo = true) => {
      if (!request) return;
      lastInput.current = input;
      if (echo && input.message) actions.pushUser(input.message);
      // Recent turns (before this message) so the Copilot keeps context like "that one".
      const history = trip.chat
        .flatMap((entry): { role: 'user' | 'assistant'; text: string }[] =>
          entry.role === 'user'
            ? [{ role: 'user' as const, text: entry.text.slice(0, 700) }]
            : entry.role === 'assistant'
              ? [{ role: 'assistant' as const, text: entry.reply.text.slice(0, 700) }]
              : [],
        )
        .slice(-6);
      copilot.mutate(
        {
          trip: request,
          situation: trip.situation,
          locale,
          ...(history.length > 0 ? { history } : {}),
          ...(input.message ? { message: input.message } : {}),
          ...(input.intent ? { intent: input.intent } : {}),
        },
        { onSuccess: actions.pushAssistant },
      );
    },
    [request, actions, copilot, trip.situation, trip.chat, locale],
  );

  // Open the conversation with a first answer matching why the traveller came.
  useEffect(() => {
    if (trip.tab !== 'copilot' || !request || trip.chat.length > 0 || copilot.isPending) return;
    const key = JSON.stringify(request);
    if (autoAsked.current === key) return;
    autoAsked.current = key;
    send(
      { intent: trip.situation === 'STUCK_IN_TRAFFIC' ? 'STUCK_IN_TRAFFIC' : 'REVIEW_PLAN' },
      false,
    );
  }, [trip.tab, trip.chat.length, trip.situation, request, copilot.isPending, send]);

  const openInsight = (): void => actions.setTab('copilot');

  const undoLast = (): void => {
    const last = trip.history[trip.history.length - 1];
    if (!last) return;
    actions.undo(t('undo.undone', { change: last.logLine }));
    setLastApplied(null);
    setReplay((count) => count + 1);
  };

  const applySuggestion = (suggestion: TripSuggestion, replyPlan: TripPlan): void => {
    actions.applyChange(
      suggestion.change,
      suggestionLogLine(t, suggestion, replyPlan, isId),
      suggestion.id,
    );
    setPreview(null);
    setReplay((count) => count + 1);
    setLastApplied(suggestionLogLine(t, suggestion, replyPlan, isId));
  };

  const persist = (): void => {
    if (!request || !plan.data) return;
    const firstStop = plan.data.stops[0];
    savePlan.mutate(
      {
        title: t('saved.defaultTitle', {
          place: firstStop ? placeName(firstStop.place.venue, isId) : '',
        }),
        situation: trip.situation,
        request,
        changeLog: trip.changeLog,
      },
      {
        onSuccess: (saved) => {
          actions.markSaved(saved.id);
          setImpactOpen(true);
        },
      },
    );
  };

  // Back from Google sign-in: restore the parked plan, then save it once the account is known.
  useEffect(() => {
    if (resume && !trip.draft) {
      actions.start(resume.draft, resume.situation, [...resume.changeLog]);
    }
  }, [resume, trip.draft, actions]);
  const { isLoading: checkingAccount } = useMe();
  useEffect(() => {
    if (!resume || resumed.current || checkingAccount || !request || !plan.data) return;
    resumed.current = true;
    clearPendingSave();
    // Sign-in may have been cancelled at Google; then the plan is restored but not saved.
    if (isAuthenticated) persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, checkingAccount, isAuthenticated, request, plan.data]);

  // Planning is open to everyone; saving needs an account. Sign in, then finish saving.
  const save = (): void => {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    persist();
  };

  const insets = isDesktop
    ? { left: DESKTOP_PANEL_PX, bottom: 0, top: TOP_BAR_PX }
    : { left: 0, bottom: sheetHeight, top: TOP_BAR_PX };
  const planData = plan.data;
  const playKey = planData ? `${planKeyOf(planData)}-${replay}` : 'empty';
  const navigateUrl = planData
    ? googleMapsTripUrl(
        planData.request.origin,
        planData.stops.map((stop) => stop.place.venue),
      )
    : null;
  const tabs: readonly TripTab[] = ['plan', 'copilot'];

  return (
    <main id="main-content" className="fixed inset-0 overflow-hidden bg-parchment text-ink">
      {trip.draft && (
        <TripMap
          plan={request ? planData : undefined}
          origin={trip.draft.origin}
          corridors={corridors.data ?? []}
          preview={preview?.venue ?? null}
          playKey={playKey}
          insets={insets}
          isId={isId}
        />
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4">
        <button
          type="button"
          onClick={() => {
            // Back to wherever the traveller came from (feed, chat, plans), else the map.
            const cameFromApp = (window.history.state as { idx?: number } | null)?.idx;
            void (cameFromApp ? navigate(-1) : navigate('/app'));
          }}
          aria-label={t('back')}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center border border-ink bg-white text-ink"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="pointer-events-auto flex h-11 items-center border border-ink bg-white px-3 text-body-sm font-medium text-ink">
          {t('title')}
        </h1>
        <div className="ml-auto flex gap-2">
          <Link
            to="/plans"
            aria-label={t('actions.savedPlans')}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center border border-ink bg-white text-ink"
          >
            <Bookmark size={16} />
          </Link>
          <button
            type="button"
            onClick={() => void i18n.changeLanguage(isId ? 'en' : 'id')}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center border border-ink bg-white font-mono text-caption tracking-normal text-ink"
          >
            {isId ? 'EN' : 'ID'}
          </button>
        </div>
      </header>

      {!trip.draft && <MissingTrip />}

      {trip.draft && (
        <BottomSheet
          label={t('title')}
          snaps={SHEET_SNAPS}
          initialSnap={SHEET_INITIAL_SNAP}
          handleLabel={t('sheet.handle')}
          onHeightChange={setSheetHeight}
          className="z-20"
          desktopClassName="md:top-20 md:bottom-4 md:left-4 md:right-auto md:h-auto md:w-[440px] md:border"
        >
          <div
            role="tablist"
            aria-label={t('title')}
            className="grid flex-none grid-cols-2 border-b border-ink"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={trip.tab === tab}
                onClick={() => actions.setTab(tab)}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 text-body-sm font-medium transition-colors',
                  trip.tab === tab ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-parchment',
                )}
              >
                {tab === 'copilot' && <MessageSquare size={15} aria-hidden="true" />}
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>

          {trip.tab === 'plan' ? (
            <>
              <div role="tabpanel" className="flex-1 overflow-y-auto overscroll-contain">
                {request && (
                  <div className="px-5 pt-4">
                    <InsightBanner
                      insight={insight.data}
                      isChecking={insight.isFetching}
                      isError={insight.isError}
                      onOpen={openInsight}
                      onRetry={() => void insight.refetch()}
                    />
                  </div>
                )}
                {plan.isError && (
                  <div
                    role="alert"
                    className="m-5 flex items-center justify-between border border-ink p-3"
                  >
                    <span className="text-body-sm text-ink">{t('error.plan')}</span>
                    <button
                      type="button"
                      onClick={() => void plan.refetch()}
                      className="text-body-sm underline"
                    >
                      {t('error.retry')}
                    </button>
                  </div>
                )}
                {plan.isFetching && !planData && (
                  <div className="flex justify-center pt-6">
                    <Spinner size="sm" />
                  </div>
                )}
                <TripPlanPanel
                  draft={trip.draft}
                  plan={request ? planData : undefined}
                  departures={request ? departures.data : undefined}
                  departuresError={departures.isError && !departures.data}
                  onDepartAt={actions.setDepartAt}
                  onAddStop={actions.addStop}
                  onRemoveStop={actions.removeStop}
                  onMoveStop={actions.moveStop}
                />
              </div>
              <div className="flex flex-none gap-2 border-t border-ash px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {navigateUrl ? (
                  <a
                    href={navigateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-14 flex-1 items-center justify-between border border-ink bg-lime px-5 text-body font-medium text-ink"
                  >
                    {t('actions.navigate')}
                    <Navigation size={18} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="flex h-14 flex-1 items-center justify-center border border-ash text-body text-graphite">
                    {t('actions.navigate')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={save}
                  disabled={!planData || savePlan.isPending}
                  aria-label={trip.savedPlanId ? t('actions.saved') : t('actions.save')}
                  className="flex h-14 w-14 flex-none items-center justify-center border border-ink bg-white text-ink disabled:opacity-40"
                >
                  {trip.savedPlanId ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => setReplay((count) => count + 1)}
                  disabled={!planData}
                  aria-label={t('actions.replay')}
                  className="flex h-14 w-14 flex-none items-center justify-center border border-ink bg-white text-ink disabled:opacity-40"
                >
                  <Play size={18} />
                </button>
              </div>
            </>
          ) : (
            <div role="tabpanel" className="min-h-0 flex-1">
              <CopilotPanel
                chat={trip.chat}
                isThinking={copilot.isPending}
                isError={copilot.isError}
                appliedIds={trip.appliedSuggestionIds}
                currentPlanKey={planData ? planKeyOf(planData) : ''}
                onSend={(input) => send(input)}
                onRetry={() => send(lastInput.current, false)}
                onApply={applySuggestion}
                onPreview={setPreview}
                {...(trip.draft ? { origin: trip.draft.origin } : {})}
                onPinned={(place) => actions.addStop(place.venue.id)}
              />
            </div>
          )}
          <span role="status" className="sr-only">
            {trip.savedPlanId ? t('actions.saved') : ''}
          </span>
        </BottomSheet>
      )}

      {lastApplied && (
        <div
          className="pointer-events-none absolute inset-x-3 z-30 md:right-auto md:bottom-4 md:left-[472px] md:w-[400px]"
          style={isDesktop ? undefined : { bottom: sheetHeight + 8 }}
        >
          <UndoToast
            change={lastApplied}
            onUndo={undoLast}
            onDismiss={() => setLastApplied(null)}
          />
        </div>
      )}

      {impactOpen && planData && (
        <ImpactSheet
          before={trip.baseline ? (baselinePlan.data?.metrics ?? null) : null}
          after={planData.metrics}
          navigateUrl={navigateUrl}
          onClose={() => setImpactOpen(false)}
        />
      )}

      <AuthDialog
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onBeforeGoogle={() => {
          if (trip.draft) {
            stashPendingSave({
              draft: trip.draft,
              situation: trip.situation,
              changeLog: trip.changeLog,
            });
          }
        }}
        onSuccess={() => {
          // After sign-in, finish the save the traveller asked for (not when only browsing saved plans).
          persist();
        }}
      />
    </main>
  );
}
