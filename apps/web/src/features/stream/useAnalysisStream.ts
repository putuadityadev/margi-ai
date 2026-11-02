import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { type AnalysisResult, AnalysisResultSchema, StreamEventSchema } from '@margi-ai/shared';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import {
  type StreamErrorState,
  type StreamEventItem,
  type StreamSections,
  type StreamStatus,
  useStreamStore,
} from '../../stores/streamStore';
import { track } from '../../lib/track';
import { ApiClientError } from '../../lib/apiClient';

export interface UseAnalysisStreamReturn {
  start: () => Promise<void>;
  stop: () => void;
  analysisId: string | null;
  status: StreamStatus;
  events: StreamEventItem[];
  sections: StreamSections;
  result: AnalysisResult | null;
  error: StreamErrorState | null;
  activeCardId: string | null;
  activeTab: 'micro' | 'regional';
  setActiveCardId: (id: string | null) => void;
  setActiveTab: (tab: 'micro' | 'regional') => void;
}

export function useAnalysisStream(): UseAnalysisStreamReturn {
  const { i18n } = useTranslation();
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const errorCountRef = useRef(0);
  const seqRef = useRef(0);

  const {
    analysisId,
    status,
    events,
    sections,
    result,
    error,
    activeCardId,
    activeTab,
    setStarting,
    setStreaming,
    addEvent,
    setResult,
    setError,
    setActiveCardId,
    setActiveTab,
    reset,
  } = useStreamStore();

  const cleanupConnections = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    errorCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnections();
    };
  }, [cleanupConnections]);

  const pollAnalysisResult = useCallback(
    async (id: string): Promise<void> => {
      let attempt = 1;
      while (attempt <= 10) {
        try {
          const response = await fetch(`/api/v1/analyses/${id}`, {
            headers: {
              'X-Requested-With': 'margi-ai',
            },
            credentials: 'include',
          });

          if (response.ok) {
            const raw = (await response.json()) as unknown;
            const parsed = AnalysisResultSchema.safeParse(raw);
            if (parsed.success && parsed.data.status === 'COMPLETED') {
              setResult(parsed.data);
              return;
            }
          }
        } catch {
          // Continue polling on network error
        }

        attempt += 1;
        await new Promise((resolve) => {
          pollTimerRef.current = setTimeout(resolve, 2000);
        });
      }

      setError({
        code: 'STREAM_TIMEOUT',
        message:
          i18n.language === 'id'
            ? 'Waktu streaming habis. Silakan coba lagi.'
            : 'Analysis stream timed out. Please try again.',
        recoverable: false,
      });
    },
    [i18n.language, setError, setResult],
  );

  const start = useCallback(async () => {
    cleanupConnections();
    setStarting();

    const { presetId, file, originVenueId, arrival, simulate, saveImage } = useAnalyzerStore.getState();

    const locale = i18n.language === 'id' ? 'id' : 'en';

    // Track analytics event
    track('analysis_started', {
      presetId,
      simulate,
      hasImage: Boolean(file),
      locale,
    });

    if (simulate) {
      track('simulation_toggled', { enabled: true });
    }

    // Build arrivalAt ISO timestamp from WITA hour
    const now = new Date();
    const arrivalDate = new Date(now);
    arrivalDate.setHours(arrival.hour, 0, 0, 0);
    const arrivalAt = arrivalDate.toISOString();

    const formData = new FormData();
    if (file) {
      formData.append('image', file);
    } else if (presetId) {
      formData.append('presetId', presetId);
    } else {
      setError({
        code: 'MISSING_INPUT',
        message:
          i18n.language === 'id'
            ? 'Pilih salah satu preset atau unggah foto untuk memulai.'
            : 'Select a preset or upload a photo to start.',
        recoverable: true,
      });
      return;
    }

    if (originVenueId) {
      formData.append('originVenueId', originVenueId);
    }
    formData.append('arrivalAt', arrivalAt);
    formData.append('simulate', String(simulate));
    formData.append('locale', locale);
    formData.append('saveImage', String(saveImage));

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/v1/analyses', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'margi-ai',
        },
        body: formData,
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { code?: string; message?: string };
        };
        const code = errorBody.error?.code ?? 'ANALYSIS_FAILED';
        const message =
          errorBody.error?.message ??
          (i18n.language === 'id'
            ? 'Gagal memulai analisis. Silakan coba lagi.'
            : 'Failed to start analysis. Please try again.');

        throw new ApiClientError(message, response.status, code, errorBody.error?.code);
      }

      const body = (await response.json()) as {
        analysisId: string;
        streamUrl: string;
      };

      const newId = body.analysisId;
      setStreaming(newId);

      // Open SSE connection
      const streamUrl = body.streamUrl || `/api/v1/analyses/${newId}/stream`;
      const es = new EventSource(streamUrl, { withCredentials: true });
      eventSourceRef.current = es;

      const eventTypes = ['step', 'tool_call', 'partial', 'result', 'error', 'done', 'message'];

      const handleEvent = (e: MessageEvent): void => {
        try {
          const raw = JSON.parse(e.data as string) as unknown;
          const parsed = StreamEventSchema.safeParse(raw);
          if (parsed.success) {
            const eventId = e.lastEventId || `${Date.now()}-${seqRef.current++}`;
            addEvent(eventId, parsed.data);

            if (parsed.data.type === 'done') {
              es.close();
              eventSourceRef.current = null;
            }
          }
        } catch {
          // Ignore parse errors on malformed frames
        }
      };

      for (const evType of eventTypes) {
        es.addEventListener(evType, handleEvent as EventListener);
      }

      es.onmessage = handleEvent;

      es.onerror = () => {
        errorCountRef.current += 1;
        // After 3 failed reconnections, switch to polling fallback
        if (errorCountRef.current >= 3) {
          es.close();
          eventSourceRef.current = null;
          void pollAnalysisResult(newId);
        }
      };
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError({
          code: err.code,
          message: err.message,
          recoverable: err.status !== 500,
        });
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        // User aborted intentionally
      } else {
        setError({
          code: 'CONNECTION_ERROR',
          message:
            i18n.language === 'id'
              ? 'Terjadi kendala koneksi ke server.'
              : 'Connection error while contacting server.',
          recoverable: true,
        });
      }
    }
  }, [
    cleanupConnections,
    setStarting,
    i18n.language,
    setError,
    setStreaming,
    addEvent,
    pollAnalysisResult,
  ]);

  const stop = useCallback(() => {
    cleanupConnections();
    reset();
  }, [cleanupConnections, reset]);

  return {
    start,
    stop,
    analysisId,
    status,
    events,
    sections,
    result,
    error,
    activeCardId,
    activeTab,
    setActiveCardId,
    setActiveTab,
  };
}
