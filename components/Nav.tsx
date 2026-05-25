'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function Nav({ locale }: { locale: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const otherLocale = locale === 'en' ? 'de' : 'en';
  const switchPath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const isActive = (segment: string) => pathname.includes(segment);
  const linkClass = (active: boolean) =>
    `font-mono text-[11px] tracking-[0.08em] uppercase document-link ${
      active ? 'document-link-active' : ''
    }`;

  return (
    <header className="document-chrome flex items-center justify-between gap-8">
      <Link
        href={`/${locale}`}
        className="font-mono text-[12px] tracking-[0.1em] uppercase document-link text-[var(--ink)]"
      >
        shaoqi.chen
      </Link>

      <nav className="flex items-center gap-5">
        <Link
          href={`/${locale}`}
          className={linkClass(pathname === `/${locale}`)}
        >
          {t('about')}
        </Link>
        <Link
          href={`/${locale}/projects`}
          className={linkClass(isActive('/projects'))}
        >
          {t('projects')}
        </Link>
        <Link
          href={`/${locale}/blog`}
          className={linkClass(isActive('/blog'))}
        >
          {t('blog')}
        </Link>

        <Link
          href={switchPath}
          className="font-mono text-[11px] tracking-[0.08em] uppercase document-link ml-1"
        >
          {otherLocale.toUpperCase()}
        </Link>
      </nav>
    </header>
  );
}
