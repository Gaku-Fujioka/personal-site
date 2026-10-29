import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const repo = process.env.CMS_REPO;
  const auth = process.env.CMS_AUTH_URL;
  const configured = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo ?? '') && /^https:\/\//.test(auth ?? '');
  // Only non-secret configuration is emitted. The Journal token never belongs here.
  const settings = import.meta.env.DEV ? { mode: 'local', configured: true }
    : configured ? { mode: 'github', configured: true, repo, auth, branch: process.env.JOURNAL_BRANCH || 'main' }
    : { configured: false };
  return new Response(JSON.stringify(settings), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
};
