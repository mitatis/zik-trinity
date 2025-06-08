import fs from 'fs';
import path from 'path';

const filePath = path.resolve('data', 'likes.json');

// 将可能的 URI 编码 slug 解码为中文
function safeDecode(str: string) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function readLikes() {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function writeLikes(data: Record<string, number>) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const rawSlug = url.searchParams.get('slug');
  if (!rawSlug) return new Response('Missing slug', { status: 400 });

  const slug = safeDecode(rawSlug);
  const count = readLikes()[slug] ?? 0;
  return new Response(JSON.stringify({ count }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST({ request }: { request: Request }) {
  const { slug: rawSlug } = await request.json();
  if (!rawSlug) return new Response('Missing slug', { status: 400 });

  const slug = safeDecode(rawSlug);

  const data = readLikes();
  data[slug] = (data[slug] ?? 0) + 1;
  writeLikes(data);

  return new Response(JSON.stringify({ count: data[slug] }), {
    headers: { 'Content-Type': 'application/json' },
  });
}