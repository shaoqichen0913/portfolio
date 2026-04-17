import { getBlogPost, getAllBlogPosts } from '@/lib/markdown';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  const locales = ['en', 'de'];
  return locales.flatMap((locale) =>
    posts.map((p) => ({ locale, slug: p.slug }))
  );
}

export default async function BlogPostPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(locale);
  const { meta, contentHtml } = await getBlogPost(slug);

  return (
    <div>
      <Link
        href={`/${locale}/blog`}
        className="font-mono text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-8 inline-block"
      >
        ← {locale === 'de' ? 'zurück zum blog' : 'back to blog'}
      </Link>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{meta.date}</span>
          {meta.readingTime && (
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              · {meta.readingTime} min read
            </span>
          )}
        </div>
        <h1 className="text-3xl font-normal text-gray-900 dark:text-gray-100 mb-4 leading-tight">
          {locale === 'de' && meta.titleDe ? meta.titleDe : meta.title}
        </h1>
        <div className="flex gap-2">
          {meta.tags.map((tag: string) => (
            <span key={tag} className="font-mono text-xs text-gray-400 dark:text-gray-500">
              #{tag}
            </span>
          ))}
        </div>
      </header>

      <div
        className="prose text-sm"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
}
