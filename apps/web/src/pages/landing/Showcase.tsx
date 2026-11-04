import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { motionAllowed, ScrollTrigger } from './motion';

const ITEMS = [
  { key: 'explore', to: '/app', image: 'app-explore' },
  { key: 'feed', to: '/feed', image: 'app-feed' },
  { key: 'chat', to: '/chat', image: 'app-chat' },
  { key: 'plan', to: '/app', image: 'app-plan' },
] as const;

type ItemKey = (typeof ITEMS)[number]['key'];

function Screen({
  image,
  alt,
  active,
}: {
  readonly image: string;
  readonly alt: string;
  readonly active: boolean;
}): ReactNode {
  return (
    <picture
      className={cn(
        'absolute inset-0 transition-opacity duration-700 ease-out',
        active ? 'opacity-100' : 'opacity-0',
      )}
    >
      <source type="image/avif" srcSet={`/images/${image}.avif`} />
      <img
        src={`/images/${image}.webp`}
        alt={active ? alt : ''}
        aria-hidden={!active}
        width={780}
        height={1688}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover object-top"
      />
    </picture>
  );
}

function Phone({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <div className="relative mx-auto aspect-[390/844] w-[min(300px,72vw)] overflow-hidden rounded-[2.4rem] border-[9px] border-ink bg-ink">
      {children}
    </div>
  );
}

/**
 * The four screens of the real app. On wide screens the phone sticks in place while the feature
 * list scrolls past and the screenshot cross-fades; on small screens each feature carries its
 * own phone, so nothing depends on scroll tricks.
 */
export function Showcase(): ReactNode {
  const { t } = useTranslation('landing');
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<ItemKey>('explore');

  useGSAP(
    () => {
      if (!motionAllowed()) return;
      const rows = root.current?.querySelectorAll<HTMLElement>('[data-feature]') ?? [];
      rows.forEach((row) => {
        ScrollTrigger.create({
          trigger: row,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => {
            if (self.isActive) setActive(row.dataset.feature as ItemKey);
          },
        });
      });
    },
    { scope: root },
  );

  const alt = (key: ItemKey): string =>
    t('showcase.phone', { name: t(`showcase.items.${key}.name`) });

  return (
    <section id="showcase" ref={root} className="bg-mist px-5 py-[14svh] sm:px-8">
      <div className="mx-auto max-w-[1080px]">
        <div className="max-w-[44rem]">
          <h2 className="text-[clamp(34px,5vw,76px)] font-medium leading-[1] tracking-[-0.04em]">
            {t('showcase.title')}
          </h2>
          <p className="mt-5 max-w-[32rem] text-body leading-[1.55] text-charcoal">
            {t('showcase.intro')}
          </p>
        </div>

        <div className="mt-[10svh] grid gap-y-24 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:gap-x-[6vw]">
          <ul className="space-y-24 lg:space-y-0">
            {ITEMS.map((item) => (
              <li
                key={item.key}
                data-feature={item.key}
                className="lg:flex lg:min-h-[78svh] lg:flex-col lg:justify-center"
              >
                <h3 className="max-w-[28rem] text-[clamp(26px,2.9vw,44px)] font-medium leading-[1.05] tracking-[-0.03em]">
                  {t(`showcase.items.${item.key}.title`)}
                </h3>
                <p className="mt-4 max-w-[26rem] text-body leading-[1.55] text-charcoal">
                  {t(`showcase.items.${item.key}.body`)}
                </p>
                <Link
                  to={item.to}
                  className="mt-6 inline-flex h-12 w-fit items-center gap-2 border border-ink bg-white px-5 text-body font-medium text-ink transition-colors duration-300 hover:bg-lime"
                >
                  {t(`showcase.items.${item.key}.cta`)}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                <div className="mt-10 lg:hidden">
                  <Phone>
                    <Screen image={item.image} alt={alt(item.key)} active />
                  </Phone>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <div className="sticky top-[14svh]">
              <Phone>
                {ITEMS.map((item) => (
                  <Screen
                    key={item.key}
                    image={item.image}
                    alt={alt(item.key)}
                    active={active === item.key}
                  />
                ))}
              </Phone>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
