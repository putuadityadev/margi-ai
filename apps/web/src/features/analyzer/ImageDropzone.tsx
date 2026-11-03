import { useCallback, useRef, type ReactNode } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { useTranslation } from 'react-i18next';
import { Card, Button, Spinner, CameraIcon } from '../../components/ui';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { MOCK_PRESETS } from '../../mocks/data/presets';
import { cn } from '../../lib/cn';

const MAX_COMPRESSED_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImageDropzoneProps {
  readonly onFileAccepted?: (() => void) | undefined;
}

export function ImageDropzone({ onFileAccepted }: ImageDropzoneProps = {}): ReactNode {
  const { t, i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const file = useAnalyzerStore((s) => s.file);
  const previewUrl = useAnalyzerStore((s) => s.previewUrl);
  const presetId = useAnalyzerStore((s) => s.presetId);
  const isCompressing = useAnalyzerStore((s) => s.isCompressing);
  const error = useAnalyzerStore((s) => s.error);

  const setFile = useAnalyzerStore((s) => s.setFile);
  const clearImage = useAnalyzerStore((s) => s.clearImage);
  const setError = useAnalyzerStore((s) => s.setError);
  const setIsCompressing = useAnalyzerStore((s) => s.setIsCompressing);

  const selectedPreset = presetId ? MOCK_PRESETS.find((p) => p.id === presetId) : undefined;
  const displayName = file
    ? file.name
    : selectedPreset
      ? isId
        ? selectedPreset.titleId
        : selectedPreset.titleEn
      : isId
        ? 'Foto pilihan'
        : 'Selected photo';

  const processAndSetFile = useCallback(
    async (rawFile: File): Promise<void> => {
      setError(null);
      setIsCompressing(true);

      try {
        const isHeic =
          rawFile.type === 'image/heic' ||
          rawFile.name.toLowerCase().endsWith('.heic') ||
          rawFile.name.toLowerCase().endsWith('.heif');

        let fileToCompress = rawFile;

        if (isHeic) {
          try {
            fileToCompress = rawFile;
          } catch {
            setError(t('heicError'));
            setIsCompressing(false);
            return;
          }
        }

        let compressedFile: File;
        try {
          compressedFile = await imageCompression(fileToCompress, {
            maxWidthOrHeight: 1024,
            fileType: 'image/webp',
            initialQuality: 0.82,
            maxSizeMB: 5,
            useWebWorker: typeof Worker !== 'undefined',
          });
        } catch {
          compressedFile = fileToCompress;
        }

        if (compressedFile.size > MAX_COMPRESSED_SIZE_BYTES) {
          setError(t('fileTooLarge'));
          setIsCompressing(false);
          return;
        }

        const objectUrl =
          typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(compressedFile)
            : '';

        setFile(compressedFile, objectUrl);
        onFileAccepted?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : t('invalidFileType');
        setError(message);
      } finally {
        setIsCompressing(false);
      }
    },
    [onFileAccepted, setError, setFile, setIsCompressing, t],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]): void => {
      if (fileRejections.length > 0) {
        setError(t('invalidFileType'));
        return;
      }

      const firstFile = acceptedFiles[0];
      if (firstFile) {
        void processAndSetFile(firstFile);
      }
    },
    [processAndSetFile, setError, t],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic', '.heif'],
    },
    maxFiles: 1,
    noClick: !!previewUrl,
  });

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <Card tone="white" className="p-4 sm:p-5 border border-ash rounded-none">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative aspect-[16/10] w-full sm:w-44 overflow-hidden rounded-none bg-ash/30 shrink-0">
              <img
                src={previewUrl}
                alt={displayName}
                width={320}
                height={200}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left w-full min-w-0">
              <div>
                <span className="text-eyebrow font-medium uppercase tracking-[0.1em] text-graphite">
                  {isId ? 'Foto Siap Diperiksa' : 'Ready to Check'}
                </span>
                <h3 className="text-body font-medium text-ink mt-0.5 truncate">{displayName}</h3>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                <input {...getInputProps()} ref={fileInputRef} className="sr-only" />
                <Button variant="ghost" size="sm" onClick={open} className="border border-ash rounded-none">
                  {t('changePhoto')}
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearImage}
                  className="text-graphite hover:text-ink"
                >
                  {t('removePhoto')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div>
          <input {...getInputProps()} aria-label={t('uploadTab')} />
          <div
            {...getRootProps()}
            role="button"
            tabIndex={0}
            aria-label={t('uploadTab')}
            className={cn(
              'group relative flex flex-col items-center justify-center p-7 sm:p-10 text-center rounded-none border-2 border-dashed transition-all cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
              isDragActive && !isDragReject && 'border-ink bg-parchment',
              isDragReject && 'border-charcoal bg-ash/20',
              !isDragActive && 'border-ash hover:border-ink bg-parchment/70',
            )}
          >
            {isCompressing ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <Spinner size="lg" />
                <p className="text-body-sm font-medium text-ink">{t('compressing')}</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-xs">
                <div className="mx-auto w-12 h-12 rounded-none bg-white border border-ink flex items-center justify-center text-ink group-hover:scale-105 transition-transform">
                  <CameraIcon size={22} />
                </div>
                <div>
                  <div className="text-body font-medium text-ink">{t('dropzoneTitle')}</div>
                  <p className="mt-1 text-xs text-graphite leading-relaxed">
                    {t('dropzoneSubtitle')}
                  </p>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center rounded-none bg-white border border-ash px-4 py-1.5 text-xs font-medium text-ink group-hover:border-ink transition-colors">
                    {t('dropzoneText')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-none bg-charcoal text-parchment text-xs font-medium border border-stone flex items-center justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-stone hover:text-white ml-2 cursor-pointer"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
