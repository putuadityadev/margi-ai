import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import { gsap, motionAllowed } from './motion';

/** The thesis in one paragraph; each word lights up as the visitor scrolls through it. */
export function Statement(): ReactNode {
  const { t } = useTranslation('landing');
  const root = useRef<HTMLElement>(null);
  const words = t('statement.text').split(' ');

  useGSAP(
    () => {
      if (!motionAllowed()) return;
      gsap.fromTo(
        '[data-word]',
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: {
            trigger: root.current,
            start: 'top 72%',
            end: 'bottom 58%',
            scrub: 0.6,
          },
        },
      );
    },
    { scope: root, dependencies: [words.length] },
  );

  return (
    <section ref={root} className="bg-white px-5 py-[20svh] sm:px-8">
      <p className="mx-auto max-w-[1100px] text-[clamp(28px,4.6vw,68px)] font-medium leading-[1.08] tracking-[-0.035em] text-ink">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} data-word className="inline-block">
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
    </section>
  );
}
