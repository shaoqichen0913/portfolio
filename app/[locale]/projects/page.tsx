import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { getAllProjects } from '@/lib/markdown';
import Link from 'next/link';

export default function ProjectsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations();
  const projects = getAllProjects();

  return (
    <div>
      <p className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2">
        {t('sections.projects')}
      </p>
      <h1 className="text-3xl font-normal text-gray-900 dark:text-gray-100 mb-10">
        {locale === 'de' ? 'Projekte' : 'Projects'}
      </h1>

      <div className="space-y-4">
        {projects.map((project, i) => (
          <Link
            key={project.slug}
            href={`/${locale}/projects/${project.slug}`}
            className="group flex items-start gap-6 p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            <span className="font-mono text-xs text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0">
              0{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                {locale === 'de' ? project.titleDe : project.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                {locale === 'de' ? project.descriptionDe : project.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-xs px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded text-gray-400 dark:text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
