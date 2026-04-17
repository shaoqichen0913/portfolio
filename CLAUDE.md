# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test suite is configured.

## Architecture

Next.js 14 App Router portfolio with EN/DE internationalization via `next-intl`.

**Routing**: All user-facing pages live under `app/[locale]/`. The root `app/page.tsx` redirects to `/en`. `middleware.ts` handles locale detection and redirects for all non-asset routes. Supported locales: `en`, `de`.

**i18n**: `i18n.ts` configures `next-intl` — it loads `messages/{locale}.json` per request. UI strings go in `messages/en.json` and `messages/de.json`. Content that is locale-specific (project titles, descriptions, blog titles) uses bilingual frontmatter fields (`title`/`titleDe`, `description`/`descriptionDe`, etc.) rather than separate message files.

**Content**: Markdown files in `content/projects/` and `content/blog/` are the source of truth for projects and blog posts. `lib/markdown.ts` exposes `getAllProjects()`, `getProject(slug, locale)`, `getAllBlogPosts()`, and `getBlogPost(slug)` — these read from the filesystem at build/request time using `gray-matter` + `remark`. Projects are sorted by `order` frontmatter; blog posts by `date` descending.

**Static data**: Experience timeline and tech stack are hardcoded in `lib/data.ts` (not markdown). Locale switching for these is done inline in the component (`locale === 'de' ? item.role.de : item.role.en`).

**Layout**: `app/[locale]/layout.tsx` wraps all pages with `NextIntlClientProvider` and the `Nav` component. `Nav.tsx` includes the language switcher.

## Adding Content

**New project** — create `content/projects/<slug>.md` with frontmatter:
```yaml
title, titleDe, description, descriptionDe, impact, impactDe, tags[], github?, order, architectureImage?
```

**New blog post** — create `content/blog/<slug>.md` with frontmatter:
```yaml
title, titleDe?, date (YYYY-MM-DD), tags[], readingTime?, excerpt
```

## Known Issues

- `i18n.ts` triggers a `next-intl` warning: `getRequestConfig` should explicitly return `locale`. Fix: add `locale` to the returned object.
- Next.js 14.2.3 has a known security vulnerability — upgrade when possible.
