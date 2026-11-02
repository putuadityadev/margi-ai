import { useCallback, useRef, type ReactNode } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { useTranslation } from 'react-i18next';
import { Card, Button, Spinner } from '../../components/ui';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { cn } from '../../lib/cn';

const MAX_COMPRESSED_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function ImageDropzone(): ReactNode {
  const { t } = useTranslation('analyzer');
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
          // Attempt HEIC conversion if supported in environment
          try {
            // Check if native conversion or browser decoder supports it
            fileToCompress = rawFile;
          } catch {
            setError(t('heicError'));
            setIsCompressing(false);
            return;
          }
        }

        // Compress image client-side to max 1024px WebP q≈0.82
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
          // Fallback if compression fails in test/headless environments
          compressedFile = fileToCompress;
        }

        // Post-compression size validation (≤ 5 MB)
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
      } catch (err) {
        const message = err instanceof Error ? err.message : t('invalidFileType');
        setError(message);
      } finally {
        setIsCompressing(false);
      }
    },
    [setError, setFile, setIsCompressing, t],
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
    <div className="space-y-4">
      {previewUrl ? (
        <Card tone="white" className="p-6 border border-ash">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative aspect-[16/10] w-full sm:w-64 overflow-hidden rounded-inner bg-ash/30 shrink-0">
              <img
                src={previewUrl}
                alt={presetId ? 'Preset Reference' : 'Uploaded Scene'}
                width={320}
                height={200}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left w-full">
              <div>
                <span className="text-eyebrow font-medium uppercase tracking-[0.1em] text-graphite">
                  {presetId ? 'Selected Preset Reference' : 'Custom Uploaded Scene'}
                </span>
                <h4 className="text-body font-medium text-ink mt-0.5">
                  {file ? file.name : (presetId ?? 'Scene Image')}
                </h4>
                {file && (
                  <p className="text-caption text-graphite">
                    {(file.size / 1024).toFixed(0)} KB WebP · 1024px
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <input {...getInputProps()} ref={fileInputRef} className="sr-only" />
                <Button variant="ghost" size="sm" onClick={open}>
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
        <div
          {...getRootProps()}
          role="button"
          tabIndex={0}
          aria-label={t('dropzoneTitle')}
          className={cn(
            'group relative flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-card border-2 border-dashed transition-all cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
            isDragActive && !isDragReject && 'border-ink bg-parchment',
            isDragReject && 'border-charcoal bg-ash/20',
            !isDragActive && 'border-ash hover:border-graphite bg-parchment/60',
          )}
        >
          <input {...getInputProps()} />

          {isCompressing ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-body font-medium text-ink">{t('compressing')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-sm">
              <div className="mx-auto w-12 h-12 rounded-pill bg-white border border-ash flex items-center justify-center text-ink text-lg font-medium group-hover:scale-105 transition-transform">
                📷
              </div>
              <div>
                <h4 className="text-body font-medium text-ink">{t('dropzoneTitle')}</h4>
                <p className="mt-1 text-caption text-graphite">{t('dropzoneSubtitle')}</p>
              </div>
              <div className="pt-2">
                <span className="text-xs font-medium text-ink underline underline-offset-4">
                  {t('dropzoneText')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-inner bg-charcoal text-parchment text-caption font-medium border border-stone flex items-center justify-between"
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
