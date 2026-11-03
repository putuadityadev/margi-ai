import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../../components/ui/Switch';
import { useAnalyzerStore } from '../../stores/analyzerStore';
import { useMe } from '../auth/useMe';

export function SavePhotoToggle(): ReactNode {
  const { t, i18n } = useTranslation('analyzer');
  const isId = i18n.language.startsWith('id');
  const { isAuthenticated } = useMe();
  const saveImage = useAnalyzerStore((s) => s.saveImage);
  const setSaveImage = useAnalyzerStore((s) => s.setSaveImage);

  if (!isAuthenticated) return null;

  return (
    <div className="pt-2">
      <Switch
        checked={saveImage}
        onChange={setSaveImage}
        label={
          <span className="text-xs font-medium text-ink">
            {isId ? 'Simpan foto ke riwayat akun saya' : 'Save photo to my account history'}
          </span>
        }
        description={
          <span className="text-[11px] text-graphite">
            {isId
              ? 'Tersimpan privat di akun Anda. Dapat dihapus kapan saja.'
              : 'Saved privately to your account. You can delete it at any time.'}
          </span>
        }
      />
    </div>
  );
}

