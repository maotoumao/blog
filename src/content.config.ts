import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    category: z.union([z.string(), z.array(z.string())]),
    readTime: z.string().optional(),
    displayDate: z.string().optional(),
    excerpt: z.string(),
  }),
});

export const collections = { posts };
