import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ArrowUp, RotateCcw, X } from 'lucide-react';
import { MAX_TRIP_STOPS, type NearbyPlace } from '@margi-ai/shared';
import { PageHeader } from '../../components/navigation/PageHeader';
import { ChatPlaceCard } from '../../features/chat/ChatPlaceCard';
import { useChatReply } from '../../features/chat/queries';
import { OriginQuickPick } from '../../features/explore/OriginQuickPick';
import { useReverseGeocode } from '../../features/explore/queries';
import { nowWitaIso } from '../../features/trip/tripStart';
import { ApiClientError } from '../../lib/apiClient';
import { cn } from '../../lib/cn';
import { useChatStore, type ChatMessage } from '../../stores/chatStore';
import { defaultVisitWindow, useExploreStore, visitInstant } from '../../stores/exploreStore';
import { useTripStore } from '../../stores/tripStore';

const MAX_CHARS = 500;
const HISTORY_TURNS = 6;
const STARTERS = ['starter1', 'starter2', 'starter3', 'starter4'] as const;

function errorKind(error: unknown): Extract<ChatMessage, { role: 'error' }>['kind'] {
  if (error instanceof ApiClientError) {
    if (error.code === 'RATE_LIMITED') return 'rateLimited';
    if (error.status === 503) return 'unavailable';
    return 'generic';
  }
  return 'offline';
}

/**
 * Casual chat with MARGI. Replies come with tappable place cards; chosen cards collect in a
 * tray that turns the conversation into a trip plan with one tap, so chatting never dead-ends.
 */
export function ChatPage(): ReactNode {
  const { t, i18n } = useTranslation('app');
  const isId = i18n.language.startsWith('id');
  const navigate = useNavigate();
  const origin = useExploreStore((state) => state.origin);
  const goTo = useExploreStore((state) => state.goTo);
  const startTrip = useTripStore((state) => state.start);
  const store = useChatStore();
  const reverse = useReverseGeocode(origin);
  const reply = useChatReply();
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const at = useMemo(() => visitInstant(defaultVisitWindow()), []);
  const areaName = reverse.data
    ? isId
      ? reverse.data.area.nameId
      : reverse.data.area.nameEn
    : null;
  const trayIds = new Set(store.tray.map((item) => item.id));

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [store.messages.length, reply.isPending]);

  /** Asks MARGI; `echo` is false on retry because the question is already in the log. */
  const ask = useCallback(
    (raw: string, echo: boolean): void => {
      const text = raw.trim();
      if (!text || !origin || reply.isPending) return;
      if (text.length > MAX_CHARS) {
        setNotice(t('chat.tooLong'));
        return;
      }
      setNotice(null);
      const settled = store.messages.filter((message) => message.role !== 'error');
      // On retry the last settled message is the question being retried; do not send it twice.
      const before = echo ? settled : settled.slice(0, -1);
      const history = before
        .flatMap((message): { role: 'user' | 'assistant'; text: string }[] =>
          message.role === 'user'
            ? [{ role: 'user', text: message.text.slice(0, 700) }]
            : message.role === 'assistant'
              ? [{ role: 'assistant', text: message.reply.text.slice(0, 700) }]
              : [],
        )
        .slice(-HISTORY_TURNS);
      store.dropErrors();
      if (echo) store.addUser(text);
      setDraft('');
      reply.mutate(
        {
          message: text,
          locale: isId ? 'id' : 'en',
          origin,
          ...(at ? { at } : {}),
          ...(history.length > 0 ? { history } : {}),
        },
        {
          onSuccess: store.addReply,
          onError: (error) => store.addError(errorKind(error), text),
        },
      );
    },
    [origin, reply, store, isId, at, t],
  );
  const send = (text: string): void => ask(text, true);
  const retry = (text: string): void => ask(text, false);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  };

  const togglePlace = (place: NearbyPlace): void => {
    const done = store.toggleTray(place);
    setNotice(done ? null : t('chat.trayFull', { count: MAX_TRIP_STOPS }));
  };

  const showOnMap = (place: NearbyPlace): void => {
    goTo('browse');
    void navigate(`/app?place=${place.venue.id}`);
  };

  const startPlanning = (): void => {
    if (!origin || store.tray.length === 0) return;
    startTrip(
      {
        origin,
        originLabel: areaName ?? t('feed.yourLocation'),
        departAt: at ?? nowWitaIso(),
        stops: store.tray.map((item) => ({ venueId: item.id })),
      },
      'PLAN',
    );
    void navigate('/app/trip');
  };

  const errorText = (kind: Extract<ChatMessage, { role: 'error' }>['kind']): string =>
    kind === 'rateLimited'
      ? t('chat.rateLimited')
      : kind === 'unavailable'
        ? t('chat.notConfigured')
        : kind === 'offline'
          ? t('chat.offline')
          : t('chat.error');

  const lastAssistant = [...store.messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  return (
    <main id="main-content" className="absolute inset-0 flex flex-col bg-parchment">
      <PageHeader
        title={t('chat.title')}
        subtitle={t('chat.subtitle')}
        actions={
          store.messages.length > 0 ? (
            <button
              type="button"
              onClick={store.reset}
              aria-label={t('chat.newChat')}
              className="flex h-11 w-11 flex-none items-center justify-center border border-ink bg-white text-ink"
            >
              <RotateCcw size={16} />
            </button>
          ) : null
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 p-4" aria-live="polite">
          {store.messages.length === 0 && (
            <section className="space-y-4 border border-ink bg-white p-5">
              <h2 className="text-subheading font-medium text-ink">{t('chat.greetingTitle')}</h2>
              <p className="text-body-sm text-graphite">{t('chat.greetingBody')}</p>
              {origin ? (
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => send(t(`chat.${key}`))}
                      className="min-h-10 border border-ink bg-white px-3 py-2 text-left text-body-sm text-ink"
                    >
                      {t(`chat.${key}`)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 border-t border-ash pt-4">
                  <h3 className="text-body font-medium text-ink">{t('feed.needOriginTitle')}</h3>
                  <OriginQuickPick />
                </div>
              )}
            </section>
          )}

          {store.messages.map((message) => {
            if (message.role === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words bg-ink px-3 py-2 text-body-sm text-white">
                    {message.text}
                  </p>
                </div>
              );
            }
            if (message.role === 'error') {
              return (
                <div
                  key={message.id}
                  role="alert"
                  className="space-y-2 border border-ink bg-white p-3"
                >
                  <p className="text-body-sm text-ink">{errorText(message.kind)}</p>
                  {message.kind !== 'rateLimited' && (
                    <button
                      type="button"
                      onClick={() => retry(message.retryText)}
                      disabled={reply.isPending}
                      className="h-9 border border-ink px-3 text-body-sm text-ink"
                    >
                      {t('chat.retry')}
                    </button>
                  )}
                </div>
              );
            }
            const { reply: answer } = message;
            return (
              <div key={message.id} className="space-y-2">
                <div className="max-w-[92%] space-y-1 border border-ink bg-white px-3 py-2">
                  <p className="whitespace-pre-wrap break-words text-body-sm text-ink">
                    {answer.text}
                  </p>
                  <p className="font-mono text-[10px] uppercase text-graphite">
                    {t('chat.source')}
                  </p>
                </div>
                {answer.places.length > 0 && (
                  <ul className="flex snap-x gap-3 overflow-x-auto pb-1">
                    {answer.places.map((place) => (
                      <ChatPlaceCard
                        key={place.venue.id}
                        place={place}
                        inPlan={trayIds.has(place.venue.id)}
                        onTogglePlan={togglePlace}
                        onShowOnMap={showOnMap}
                      />
                    ))}
                  </ul>
                )}
                {message.id === lastAssistant?.id && !reply.isPending && (
                  <div className="flex flex-wrap gap-2">
                    {answer.quickReplies.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => send(chip)}
                        className="min-h-9 border border-ink bg-white px-3 py-1.5 text-left text-body-sm text-ink"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {reply.isPending && (
            <p role="status" className="flex items-center gap-2 text-body-sm text-graphite">
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce bg-ink [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce bg-ink [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce bg-ink" />
              </span>
              {t('chat.thinking')}
            </p>
          )}
          <div ref={bottom} />
        </div>
      </div>

      {store.tray.length > 0 && (
        <section
          aria-label={t('chat.trayTitle')}
          className="flex-none border-t border-ink bg-white px-4 py-2"
        >
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
              {store.tray.map((item) => {
                const name = isId ? item.nameId : item.nameEn;
                return (
                  <li
                    key={item.id}
                    className="flex flex-none items-center border border-ink bg-parchment"
                  >
                    <span className="max-w-[9rem] truncate px-2 text-body-sm text-ink">{name}</span>
                    <button
                      type="button"
                      onClick={() => store.removeFromTray(item.id)}
                      aria-label={t('chat.trayRemove', { name })}
                      className="flex h-8 w-8 items-center justify-center border-l border-ink"
                    >
                      <X size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={startPlanning}
              className="h-11 flex-none border border-ink bg-lime px-4 text-body-sm font-medium text-ink"
            >
              {t('chat.trayStart')} · {t('chat.trayCount', { count: store.tray.length })}
            </button>
          </div>
        </section>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="flex-none border-t border-ink bg-white px-4 py-3"
      >
        {notice && (
          <p role="status" className="mx-auto mb-2 max-w-2xl text-caption text-graphite">
            {notice}
          </p>
        )}
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <label className="sr-only" htmlFor="chat-input">
            {t('chat.inputLabel')}
          </label>
          <textarea
            id="chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_CHARS + 50}
            disabled={!origin}
            placeholder={t('chat.inputPlaceholder')}
            className="max-h-28 min-h-11 flex-1 resize-none border border-ink bg-white px-3 py-2.5 text-body text-ink focus:outline-none disabled:bg-parchment"
          />
          <button
            type="submit"
            disabled={!origin || reply.isPending || draft.trim() === ''}
            aria-label={t('chat.send')}
            className={cn(
              'flex h-11 w-11 flex-none items-center justify-center border border-ink bg-lime text-ink',
              'disabled:bg-parchment disabled:text-graphite',
            )}
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </form>
    </main>
  );
}
