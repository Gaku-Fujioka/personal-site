import { getCollection, type CollectionEntry } from 'astro:content';
import tags from '../data/journal-tags.json';

export type JournalPost = CollectionEntry<'journal'>;
export const journalTags = tags;
export const journalDate = (date: string) => date.replace(/-/g, '.');
export const tagLabel = (id: string) => tags.find(tag => tag.id === id)?.label ?? id;
export async function getJournalPosts() {
  const posts = await getCollection('journal');
  return posts.sort((a, b) => b.data.publishedAt.localeCompare(a.data.publishedAt) || a.id.localeCompare(b.id));
}
export function getUsedTags(posts: JournalPost[]) {
  return tags.filter(tag => posts.some(post => post.data.tags.includes(tag.id)));
}
