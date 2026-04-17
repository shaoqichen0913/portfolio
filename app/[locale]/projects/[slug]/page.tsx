import { getProject, getAllProjects } from '@/lib/markdown';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export async function generateStaticParams() {
  const projects = getAllProjects();
  const locales = ['en', 'de'];
  return locales.flatMap((locale) =>
    projects.map((p) => ({ locale, slug: p.slug }))
  );
}

export default async function ProjectPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(locale);
  const { meta, contentHtml } = await getProject(slug, locale);

  return (
    <div>
      <Link
        href={`/${locale}/projects`}
        className="font-mono text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-8 inline-block"
      >
        ← {locale === 'de' ? 'zurück zu projekten' : 'back to projects'}
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl font-normal text-gray-900 dark:text-gray-100 mb-3 leading-tight">
          {locale === 'de' ? meta.titleDe : meta.title}
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 mb-5">
          {locale === 'de' ? meta.descriptionDe : meta.description}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {meta.tags.map((tag: string) => (
            <span
              key={tag}
              className="font-mono text-xs px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded text-gray-500 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {/* Architecture image placeholder */}
      {meta.architectureImage && (
        <section className="mb-10">
          <p className="font-mono text-xs tracking-widest text-gray-400 uppercase mb-4">
            {locale === 'de' ? 'architektur' : 'architecture'}
          </p>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <img
              src={meta.architectureImage}
              alt={`${meta.title} architecture diagram`}
              className="w-full"
            />
          </div>
        </section>
      )}

      {/* Impact */}
      <section className="mb-10">
        <p className="font-mono text-xs tracking-widest text-gray-400 uppercase mb-4">
          {locale === 'de' ? 'ergebnisse' : 'impact'}
        </p>
        <div className="border-l-2 border-gray-300 dark:border-gray-600 pl-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {locale === 'de' ? meta.impactDe : meta.impact}
          </p>
        </div>
      </section>

      {/* Markdown content */}
      <section className="mb-10">
        <p className="font-mono text-xs tracking-widest text-gray-400 uppercase mb-6">
          {locale === 'de' ? 'details' : 'details'}
        </p>
        <div
          className="prose text-sm"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </section>

      {/* GitHub link */}
      {meta.github && (
        <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
          <a
            href={meta.github}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            view on github →
          </a>
        </div>
      )}
    </div>
  );
}
