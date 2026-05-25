import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { experience, techStack } from '@/lib/data';
import Link from 'next/link';
import { getAllProjects } from '@/lib/markdown';
import { TechIcon } from '@/components/TechIcon';

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations();
  const projects = getAllProjects().slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="mb-16 pt-4">
        <div>
          <div className="mb-5">
            <p className="font-mono text-xs tracking-widest text-[var(--ink-mute)] uppercase mb-3">
              {t('hero.eyebrow')}
            </p>
            <h1 className="text-4xl font-normal text-[var(--ink)] mb-2 leading-tight">
              Shaoqi Chen
            </h1>
            <p className="text-base text-[var(--ink-soft)]">{t('hero.title')}</p>
          </div>

          <div>
            <p className="text-base text-[var(--ink-soft)] leading-relaxed">
              {t('hero.description')}
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="https://github.com/shaoqichen0913"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[var(--ink-mute)] hover:text-[var(--ink)] transition-colors"
              >
                github →
              </a>
              <a
                href="mailto:shaoqichen0913@gmail.com"
                className="font-mono text-xs text-[var(--ink-mute)] hover:text-[var(--ink)] transition-colors"
              >
                email →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Timeline */}
      <section className="mb-16">
        <p className="font-mono text-xs tracking-widest text-[var(--ink-mute)] uppercase mb-6">
          {t('sections.experience')}
        </p>
        <div className="relative pl-5">
          <div className="absolute left-1.5 top-0 bottom-0 w-px bg-[var(--rule-faint)]" />
          {experience.map((item, i) => (
            <div key={i} className="relative mb-10">
              <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-[var(--ink-mute)]" />
              <p className="font-mono text-xs text-[var(--ink-mute)] mb-1">{item.period}</p>
              <h3 className="text-base font-medium text-[var(--ink)] mb-0.5">
                {locale === 'de' ? item.role.de : item.role.en}
              </h3>
              <p className="text-sm text-[var(--ink-mute)] mb-2">
                {item.company} · {item.location}
              </p>
              <p className="text-sm text-[var(--ink-soft)] mb-3 leading-relaxed">
                {locale === 'de' ? item.description.de : item.description.en}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-xs px-2 py-0.5 border border-[var(--rule-faint)] rounded text-[var(--ink-mute)]"
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
        <p className="font-mono text-xs tracking-widest text-[var(--ink-mute)] uppercase mb-6">
          {t('sections.techStack')}
        </p>
        {Object.entries(techStack).map(([category, items]) => (
          <div key={category} className="mb-6">
            <p className="font-mono text-xs text-[var(--ink-mute)] mb-2">
              {t(`techCategories.${category}`)}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-1.5 px-2.5 py-1 border border-[var(--rule-faint)] rounded-md"
                >
                  <TechIcon name={item.name} color={item.color} />
                  <span className="font-mono text-xs text-[var(--ink-soft)]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Featured Projects */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <p className="font-mono text-xs tracking-widest text-[var(--ink-mute)] uppercase">
            {t('sections.projects')}
          </p>
          <Link
            href={`/${locale}/projects`}
            className="font-mono text-xs text-[var(--ink-mute)] hover:text-[var(--ink)] transition-colors"
          >
            {t('project.viewAll')} →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((project, i) => (
            <Link
              key={project.slug}
              href={`/${locale}/projects/${project.slug}`}
              className="group block p-4 border border-[var(--rule-faint)] rounded-xl hover:border-[var(--rule)] transition-colors"
            >
              <p className="font-mono text-xs text-[var(--ink-mute)] mb-2">
                0{i + 1}
              </p>
              <h3 className="text-sm font-medium text-[var(--ink)] mb-1.5 leading-snug">
                {locale === 'de' ? project.titleDe : project.title}
              </h3>
              <p className="text-xs text-[var(--ink-soft)] mb-3 leading-relaxed line-clamp-2">
                {locale === 'de' ? project.descriptionDe : project.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="font-mono text-xs text-[var(--ink-mute)]">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-[var(--ink-mute)] group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
