import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getAllBlogPosts } from '@/lib/markdown';
import Link from 'next/link';

export default function BlogPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations();
  const posts = getAllBlogPosts();

  return (
    <div className="blog-paper blog-index">
      <p className="index-kicker">{t('sections.blog')}</p>
      <h1>{locale === 'de' ? 'Artikel' : 'Writing'}</h1>

      <div>
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/${locale}/blog/${post.slug}`}
            className="post-entry"
          >
            <div className="min-w-0">
              <h2 className="entry-title">
                {locale === 'de' && post.titleDe ? post.titleDe : post.title}
              </h2>
              <p className="entry-excerpt line-clamp-2">{post.excerpt}</p>
              <div className="entry-meta">
                <span>{post.date}</span>
                {post.readingTime && (
                  <span>
                    {post.readingTime} {t('blog.readingTime')}
                  </span>
                )}
                {post.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </div>
            <span className="entry-arrow">→</span>
          </Link>
        ))}

        {posts.length === 0 && (
          <p className="empty">
            {locale === 'de' ? 'Bald verfügbar...' : 'Coming soon...'}
          </p>
        )}
      </div>
    </div>
  );
}
