import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';

const projectsDir = path.join(process.cwd(), 'content/projects');
const blogDir = path.join(process.cwd(), 'content/blog');

export interface ProjectMeta {
  slug: string;
  title: string;
  titleDe: string;
  description: string;
  descriptionDe: string;
  impact: string;
  impactDe: string;
  tags: string[];
  github?: string;
  order: number;
  architectureImage?: string;
}

export interface BlogMeta {
  slug: string;
  title: string;
  titleDe?: string;
  date: string;
  tags: string[];
  readingTime?: number;
  excerpt: string;
}

export function getAllProjects(): ProjectMeta[] {
  const files = fs.readdirSync(projectsDir);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace('.md', '');
      const raw = fs.readFileSync(path.join(projectsDir, f), 'utf8');
      const { data } = matter(raw);
      return { slug, ...data } as ProjectMeta;
    })
    .sort((a, b) => a.order - b.order);
}

export async function getProject(slug: string, locale: string = 'en') {
  const raw = fs.readFileSync(path.join(projectsDir, `${slug}.md`), 'utf8');
  const { data, content } = matter(raw);
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(content);
  return {
    meta: data as ProjectMeta,
    contentHtml: processed.toString(),
    locale,
  };
}

export function getAllBlogPosts(): BlogMeta[] {
  const files = fs.readdirSync(blogDir);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace('.md', '');
      const raw = fs.readFileSync(path.join(blogDir, f), 'utf8');
      const { data } = matter(raw);
      return { slug, ...data } as BlogMeta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getBlogPost(slug: string) {
  const raw = fs.readFileSync(path.join(blogDir, `${slug}.md`), 'utf8');
  const { data, content } = matter(raw);
  // Blog posts may embed the "paper" design's raw HTML components
  // (.note, .qa, figure, .model-graph), so the pipeline allows raw HTML.
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(content);
  return {
    meta: data as BlogMeta,
    contentHtml: processed.toString(),
  };
}
