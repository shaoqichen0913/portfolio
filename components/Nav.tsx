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

  return (
    <header className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between mb-8">
      <Link href={`/${locale}`} className="font-mono text-sm tracking-wider text-gray-800 dark:text-gray-200 hover:opacity-70 transition-opacity">
        shaoqi.chen
      </Link>

      <nav className="flex items-center gap-6">
        <Link
          href={`/${locale}`}
          className={`font-mono text-xs tracking-wide transition-colors ${
            pathname === `/${locale}` ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('about')}
        </Link>
        <Link
          href={`/${locale}/projects`}
          className={`font-mono text-xs tracking-wide transition-colors ${
            isActive('/projects') ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('projects')}
        </Link>
        <Link
          href={`/${locale}/blog`}
          className={`font-mono text-xs tracking-wide transition-colors ${
            isActive('/blog') ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('blog')}
        </Link>

        <Link
          href={switchPath}
          className="font-mono text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-gray-500 dark:text-gray-400 hover:border-gray-400 transition-colors ml-2"
        >
          {otherLocale.toUpperCase()}
        </Link>

      </nav>
    </header>
  );
}
