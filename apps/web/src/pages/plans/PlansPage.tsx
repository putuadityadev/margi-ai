import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Bookmark, Trash2 } from 'lucide-react';
import type { SavedTripPlan } from '@margi-ai/shared';
import { PageHeader } from '../../components/navigation/PageHeader';
import { Button, Spinner } from '../../components/ui';
import { AuthDialog } from '../../features/auth/AuthDialog';
import { useMe } from '../../features/auth/useMe';
import { useDeletePlan, useSavedPlans } from '../../features/trip/queries';
import { draftFromSaved } from '../../features/trip/savedPlan';
import { clockLabel } from '../../features/trip/tripText';
import { useTripStore } from '../../stores/tripStore';

/** Saved plans of the signed-in account; guests get a clear sign-in prompt instead of a dead end. */
export function PlansPage(): ReactNode {
  const { t, i18n } = useTranslation('app');
  const isId = i18n.language.startsWith('id');
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: checkingAccount } = useMe();
  const plans = useSavedPlans(isAuthenticated);
  const remove = useDeletePlan();
  const startTrip = useTripStore((state) => state.start);
  const markSaved = useTripStore((state) => state.markSaved);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const open = (plan: SavedTripPlan): void => {
    startTrip(draftFromSaved(plan), plan.situation, plan.changeLog);
    markSaved(plan.id);
    void navigate('/app/trip');
  };

  return (
    <main id="main-content" className="absolute inset-0 flex flex-col bg-parchment">
      <PageHeader title={t('plans.title')} subtitle={t('plans.subtitle')} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-3 p-4">
          {checkingAccount && (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          )}

          {!checkingAccount && !isAuthenticated && (
            <section className="space-y-4 border border-ink bg-white p-6">
              <Bookmark size={22} aria-hidden="true" />
              <h2 className="text-subheading font-medium text-ink">{t('plans.guestTitle')}</h2>
              <p className="text-body-sm text-graphite">{t('plans.guestBody')}</p>
              <Button variant="primary" onClick={() => setAuthOpen(true)} className="w-full">
                {t('plans.signIn')}
              </Button>
            </section>
          )}

          {isAuthenticated && plans.isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          )}

          {isAuthenticated && plans.isError && (
            <div role="alert" className="space-y-3 border border-ink bg-white p-5">
              <p className="text-body-sm text-ink">{t('plans.loadError')}</p>
              <Button variant="ghost" onClick={() => void plans.refetch()}>
                {t('retry')}
              </Button>
            </div>
          )}

          {isAuthenticated && plans.data?.length === 0 && (
            <section className="space-y-4 border border-ink bg-white p-6">
              <h2 className="text-subheading font-medium text-ink">{t('plans.emptyTitle')}</h2>
              <p className="text-body-sm text-graphite">{t('plans.emptyBody')}</p>
              <div className="flex gap-2">
                <Link
                  to="/app"
                  className="flex h-12 flex-1 items-center justify-center border border-ink bg-lime text-body font-medium text-ink"
                >
                  {t('plans.toExplore')}
                </Link>
                <Link
                  to="/chat"
                  className="flex h-12 flex-1 items-center justify-center border border-ink text-body text-ink"
                >
                  {t('plans.toChat')}
                </Link>
              </div>
            </section>
          )}

          <ul className="space-y-3">
            {plans.data?.map((plan) => (
              <li key={plan.id} className="flex items-stretch border border-ink bg-white">
                <button
                  type="button"
                  onClick={() => open(plan)}
                  aria-label={t('plans.open', { title: plan.title })}
                  className="min-w-0 flex-1 p-4 text-left"
                >
                  <span className="block truncate text-body font-medium text-ink">
                    {plan.title}
                  </span>
                  <span className="mt-1 block text-body-sm text-graphite">
                    {plan.stopNames.map((name) => (isId ? name.id : name.en)).join(' → ')}
                  </span>
                  <span className="mt-2 block font-mono text-caption text-graphite">
                    {clockLabel(plan.request.departAt, isId)} ·{' '}
                    {t('plans.stops', { count: plan.request.stops.length })} ·{' '}
                    {t('plans.crowd', { value: plan.metrics.crowdExposure })}
                  </span>
                </button>
                {pendingDelete === plan.id ? (
                  <div className="flex flex-none flex-col border-l border-ink">
                    <button
                      type="button"
                      onClick={() => {
                        remove.mutate(plan.id);
                        setPendingDelete(null);
                      }}
                      className="flex-1 bg-ink px-3 text-caption font-medium text-white"
                    >
                      {t('plans.confirmDelete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(null)}
                      className="flex-1 px-3 text-caption text-ink"
                    >
                      {t('plans.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(plan.id)}
                    aria-label={t('plans.delete', { title: plan.title })}
                    className="flex w-12 flex-none items-center justify-center border-l border-ash text-graphite hover:text-ink"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {remove.isError && (
            <p role="alert" className="text-body-sm text-ink">
              {t('plans.deleteError')}
            </p>
          )}
        </div>
      </div>
      <AuthDialog
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        reason={t('plans.authReason')}
      />
    </main>
  );
}
