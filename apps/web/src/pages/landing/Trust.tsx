import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight } from 'lucide-react';
import { ForecastBars, RoutePath } from './Diagrams';
import { CheckGate } from './Illustrations';
import { gsap, motionAllowed } from './motion';

const CELL = 'flex flex-col justify-between gap-10 bg-ink p-6 sm:p-8';

/** The one dark band: why the answers can be trusted, as a bento of ruled cells with line diagrams. */
export function Trust(): ReactNode {
  const { t } = useTranslation('landing');
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!motionAllowed()) return;
      gsap.from('[data-trust-bar]', {
        scaleY: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.04,
        scrollTrigger: { trigger: '[data-trust-bar]', start: 'top 88%', once: true },
      });
      const route = root.current?.querySelector<SVGPathElement>('[data-route]');
      if (route) {
        const length = route.getTotalLength();
        gsap.fromTo(
          route,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: route, start: 'top 88%', once: true },
          },
        );
      }
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="bg-ink bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:25%_100%] px-5 py-[14svh] text-white sm:px-8"
    >
      <div className="mx-auto grid max-w-[1300px] gap-px border border-white/30 bg-white/30 lg:grid-cols-12">
        <div className={`${CELL} lg:col-span-6 lg:row-span-2`}>
          <h2 className="max-w-[34rem] text-[clamp(36px,4.8vw,76px)] font-medium leading-[0.98] tracking-[-0.045em]">
            {t('trust.title')}
          </h2>
          <div>
            <p className="max-w-[26rem] text-body leading-[1.55] text-smoke">{t('trust.intro')}</p>
            <Link
              to="/about/ai-disclosure"
              className="mt-8 inline-flex h-12 items-center gap-2 border border-lime bg-lime px-5 text-body font-medium text-ink transition-colors duration-300 hover:bg-transparent hover:text-lime"
            >
              {t('trust.link')}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className={`${CELL} lg:col-span-3`}>
          <div data-trust-bars>
            <ForecastBars label={t('trust.diagrams.forecast')} />
          </div>
          <div>
            <h3 className="text-subheading font-medium leading-[1.15] tracking-[-0.02em] text-lime">
              {t('trust.items.forecast.title')}
            </h3>
            <p className="mt-3 text-body-sm leading-[1.6] text-smoke">
              {t('trust.items.forecast.body')}
            </p>
          </div>
        </div>

        <div className={`${CELL} lg:col-span-3`}>
          <RoutePath label={t('trust.diagrams.roads')} />
          <div>
            <h3 className="text-subheading font-medium leading-[1.15] tracking-[-0.02em] text-lime">
              {t('trust.items.roads.title')}
            </h3>
            <p className="mt-3 text-body-sm leading-[1.6] text-smoke">
              {t('trust.items.roads.body')}
            </p>
          </div>
        </div>

        <div className={`${CELL} lg:col-span-6`}>
          <CheckGate className="h-20 w-auto text-white" />
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
            <h3 className="text-subheading font-medium leading-[1.15] tracking-[-0.02em] text-lime">
              {t('trust.items.ai.title')}
            </h3>
            <p className="text-body-sm leading-[1.6] text-smoke">{t('trust.items.ai.body')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
