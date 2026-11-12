import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../../styles/tour.css';
import { i18n } from '../../lib/i18n';
import { markSeen } from './tourMemory';
import { TOURS, type TourId } from './tours';

/** True when the element exists and takes up space on screen (not hidden by the layout). */
function isShown(selector: string): boolean {
  const element = document.querySelector(selector);
  return element !== null && element.getClientRects().length > 0;
}

/** The steps of a tour that can be shown right now. */
export function visibleSteps(id: TourId): DriveStep[] {
  const t = i18n.getFixedT(null, 'tour');
  return TOURS[id]
    .filter((step) => step.target === null || isShown(step.target))
    .map((step) => ({
      ...(step.target ? { element: step.target } : {}),
      popover: { title: t(`${step.copy}.title`), description: t(`${step.copy}.body`) },
    }));
}

/**
 * Runs one screen's tour on the real interface. Returns false when none of its elements is on
 * screen, so the caller can try again later. The tour counts as seen once it closes.
 */
export function runTour(id: TourId): boolean {
  const steps = visibleSteps(id);
  if (steps.length === 0) return false;
  const t = i18n.getFixedT(null, 'tour');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tour = driver({
    steps,
    animate: !reduceMotion,
    // Centre each element ourselves, instantly: sheets scroll inside their own container and a
    // smooth scroll would leave the highlight where the element used to be.
    smoothScroll: false,
    onHighlightStarted: (element) => element?.scrollIntoView({ block: 'center' }),
    showProgress: steps.length > 1,
    // driver.js fills these placeholders itself; i18next must leave them as they are.
    progressText: t('progress', { current: '{{current}}', total: '{{total}}' }),
    nextBtnText: t('next'),
    prevBtnText: t('prev'),
    doneBtnText: t('done'),
    popoverClass: 'margi-tour',
    stagePadding: 6,
    stageRadius: 0,
    overlayOpacity: 0.45,
    onDestroyed: () => markSeen(id),
  });
  tour.drive();
  return true;
}
