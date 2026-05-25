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
      <p className="font-mono text-xs tracking-widest text-[var(--ink-mute)] uppercase mb-2">
        {t('sections.projects')}
      </p>
      <h1 className="text-3xl font-normal text-[var(--ink)] mb-10">
        {locale === 'de' ? 'Projekte' : 'Projects'}
      </h1>

      <div className="space-y-4">
        {projects.map((project, i) => (
          <Link
            key={project.slug}
            href={`/${locale}/projects/${project.slug}`}
            className="group flex items-start gap-6 p-5 border border-[var(--rule-faint)] rounded-xl hover:border-[var(--rule)] transition-colors"
          >
            <span className="font-mono text-xs text-[var(--ink-mute)] mt-0.5 flex-shrink-0">
              0{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-[var(--ink)] mb-1.5">
                {locale === 'de' ? project.titleDe : project.title}
              </h2>
              <p className="text-sm text-[var(--ink-soft)] mb-3 leading-relaxed">
                {locale === 'de' ? project.descriptionDe : project.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-xs px-2 py-0.5 border border-[var(--rule-faint)] rounded text-[var(--ink-mute)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[var(--ink-mute)] group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
