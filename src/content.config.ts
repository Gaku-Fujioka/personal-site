import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// This directory contains only prepared, published entries. Never load CMS drafts here.
const journal = defineCollection({
  loader: glob({ pattern: '*.md', base: './.journal/published/posts' }),
  schema: z.object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
    description: z.string(),
    tags: z.array(z.string()),
    cover: z.object({ src: z.string(), srcset: z.string(), width: z.number(), height: z.number(), alt: z.string(), caption: z.string() }).optional(),
  }),
});

export const collections = { journal };
