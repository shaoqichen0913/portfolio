import { useTranslations } from 'next-intl';
import { getAllBlogPosts } from '@/lib/markdown';
import Link from 'next/link';

export default function BlogPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations();
  const posts = getAllBlogPosts();

  return (
    <div>
      <p className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
        {t('sections.blog')}
      </p>
      <h1 className="text-3xl font-normal text-gray-900 dark:text-gray-100 mb-10">
        {locale === 'de' ? 'Artikel' : 'Writing'}
      </h1>

      <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/${locale}/blog/${post.slug}`}
            className="group flex items-start justify-between gap-6 py-5 hover:opacity-70 transition-opacity"
          >
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                {locale === 'de' && post.titleDe ? post.titleDe : post.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-2">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{post.date}</span>
                {post.readingTime && (
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                    {post.readingTime} {t('blog.readingTime')}
                  </span>
                )}
                <div className="flex gap-1.5">
                  {post.tags.map((tag) => (
                    <span key={tag} className="font-mono text-xs text-gray-400 dark:text-gray-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <span className="text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-1">
              →
            </span>
          </Link>
        ))}

        {posts.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 font-mono">
            {locale === 'de' ? 'Bald verfügbar...' : 'Coming soon...'}
          </p>
        )}
      </div>
    </div>
  );
}
