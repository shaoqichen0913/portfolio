# Shaoqi Chen — Portfolio

Personal portfolio site built with Next.js 14, Tailwind CSS, and next-intl.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **i18n**: next-intl (EN + DE)
- **Content**: Markdown files with gray-matter + remark
- **Deployment**: Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/en` automatically.

Switch language: navigate to `/de` or click the language toggle in the nav.

## Project Structure

```
app/
  [locale]/
    page.tsx              # Home: hero + experience timeline + tech stack
    projects/
      page.tsx            # Projects list
      [slug]/page.tsx     # Project detail page
    blog/
      page.tsx            # Blog list
      [slug]/page.tsx     # Blog post
components/
  Nav.tsx                 # Navigation with language switcher
content/
  projects/               # One .md file per project
  blog/                   # One .md file per blog post
lib/
  data.ts                 # Experience + tech stack data
  markdown.ts             # MD parsing utilities
messages/
  en.json                 # English UI strings
  de.json                 # German UI strings
```

## Adding Content

### New Project

Create `content/projects/my-project.md` with this frontmatter:

```yaml
---
title: "Project Title"
titleDe: "Projekttitel"
description: "Short description in English"
descriptionDe: "Kurze Beschreibung auf Deutsch"
impact: "Quantified impact statement"
impactDe: "Quantifizierte Wirkungsaussage"
tags: ["Tag1", "Tag2"]
github: "https://github.com/shaoqichen0913/repo"
order: 5
architectureImage: "/images/projects/my-project-arch.png"  # optional
---

## Your markdown content here
```

### New Blog Post

Create `content/blog/my-post.md`:

```yaml
---
title: "Post Title"
titleDe: "Beitragstitel"  # optional
date: "2025-04-17"
tags: ["tag1", "tag2"]
readingTime: 5
excerpt: "One sentence summary shown in the list view."
---

## Post content here
```

## Deployment

Push to GitHub, connect repo to Vercel. Done.

```bash
git init
git add .
git commit -m "initial commit"
gh repo create portfolio --public --push
```

Then go to [vercel.com](https://vercel.com) → Import → select your repo → Deploy.
