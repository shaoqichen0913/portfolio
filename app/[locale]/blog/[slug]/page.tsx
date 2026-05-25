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
    <div className="blog-post-shell">
      <Link
        href={`/${locale}/blog`}
        className="font-mono text-xs text-gray-400 hover:text-[#b8341a] transition-colors mb-10 inline-block"
      >
        ← {locale === 'de' ? 'zurück zum blog' : 'back to blog'}
      </Link>

      <article className="blog-paper blog-article">
        <header>
          <div className="crumb">blog / {slug}</div>
          <div className="post-meta">
            {meta.date}
            {meta.readingTime && ` · ${meta.readingTime} min read`}
          </div>
          <h1>{locale === 'de' && meta.titleDe ? meta.titleDe : meta.title}</h1>
          {meta.excerpt && <p className="lede">{meta.excerpt}</p>}
          {meta.tags?.length > 0 && (
            <div className="post-tags">
              {meta.tags.map((tag: string) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </article>
    </div>
  );
}
