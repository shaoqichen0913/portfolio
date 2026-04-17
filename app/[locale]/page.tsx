import { useTranslations } from 'next-intl';
import { experience, techStack } from '@/lib/data';
import Link from 'next/link';
import { getAllProjects } from '@/lib/markdown';
import { TechIcon } from '@/components/TechIcon';

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations();
  const projects = getAllProjects().slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="mb-16 pt-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-3">
              {t('hero.eyebrow')}
            </p>
            <h1 className="text-4xl font-normal text-gray-900 dark:text-gray-100 mb-2 leading-tight">
              Shaoqi Chen
            </h1>
            <p className="text-base text-gray-500 dark:text-gray-400 mb-4">{t('hero.title')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl">
              {t('hero.description')}
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="https://github.com/shaoqichen0913"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                github →
              </a>
              <a
                href="mailto:shaoqichen0913@gmail.com"
                className="font-mono text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                email →
              </a>
            </div>
          </div>
          <div className="hidden sm:flex w-16 h-16 rounded-full border border-gray-200 dark:border-gray-700 items-center justify-center font-serif text-xl text-gray-400 dark:text-gray-500 flex-shrink-0">
            SC
          </div>
        </div>
      </section>

      {/* Experience Timeline */}
      <section className="mb-16">
        <p className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-6">
          {t('sections.experience')}
        </p>
        <div className="relative pl-5">
          <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
          {experience.map((item, i) => (
            <div key={i} className="relative mb-10">
              <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
              <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mb-1">{item.period}</p>
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-0.5">
                {locale === 'de' ? item.role.de : item.role.en}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {item.company} · {item.location}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                {locale === 'de' ? item.description.de : item.description.en}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-xs px-2 py-0.5 border border-gray-200 dark:border-gray-700 rounded text-gray-500 dark:text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-16">
        <p className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-6">
          {t('sections.techStack')}
        </p>
        {Object.entries(techStack).map(([category, items]) => (
          <div key={category} className="mb-6">
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mb-2">
              {t(`techCategories.${category}`)}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 dark:border-gray-700 rounded-md"
                >
                  <TechIcon name={item.name} color={item.color} />
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Featured Projects */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <p className="font-mono text-xs tracking-widest text-gray-400 dark:text-gray-500 uppercase">
            {t('sections.projects')}
          </p>
          <Link
            href={`/${locale}/projects`}
            className="font-mono text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {t('project.viewAll')} →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((project, i) => (
            <Link
              key={project.slug}
              href={`/${locale}/projects/${project.slug}`}
              className="group block p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mb-2">
                0{i + 1}
              </p>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5 leading-snug">
                {locale === 'de' ? project.titleDe : project.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed line-clamp-2">
                {locale === 'de' ? project.descriptionDe : project.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="font-mono text-xs text-gray-400 dark:text-gray-500">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-gray-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
