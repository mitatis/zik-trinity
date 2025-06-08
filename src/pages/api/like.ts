// 将可能的 URI 编码 slug 解码为中文
function safeDecode(str: string) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

import type { APIContext } from 'astro';

export async function GET({ request, locals }: APIContext) {
  const url = new URL(request.url);
  const rawSlug = url.searchParams.get('slug');
  if (!rawSlug) return new Response('Missing slug', { status: 400 });

  const slug = safeDecode(rawSlug);
  const kv = locals.runtime.env.LIKES as KVNamespace;
  const stored = await kv.get(slug);
  const count = stored ? Number(stored) : 0;

  return new Response(JSON.stringify({ count }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST({ request, locals }: APIContext) {
  const { slug: rawSlug } = await request.json();
  if (!rawSlug) return new Response('Missing slug', { status: 400 });

  const slug = safeDecode(rawSlug);
  const kv = locals.runtime.env.LIKES as KVNamespace;
  const stored = await kv.get(slug);
  const current = stored ? Number(stored) : 0;
  const newCount = current + 1;
  await kv.put(slug, newCount.toString());

  return new Response(JSON.stringify({ count: newCount }), {
    headers: { 'Content-Type': 'application/json' },
  });
}