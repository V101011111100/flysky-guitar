import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

// Helper: verify admin session
async function requireAdmin(cookies: any) {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

// GET /api/blog/list — fetch posts (admin: all; public: published only)
export const GET: APIRoute = async ({ url, cookies }) => {
  const isAdmin = !!(await requireAdmin(cookies));
  const status  = url.searchParams.get('status');   // 'all' | 'draft' | 'published'
  const page    = parseInt(url.searchParams.get('page') ?? '1');
  const limit   = parseInt(url.searchParams.get('limit') ?? '20');
  const from    = (page - 1) * limit;

  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, category, status, published_at, view_count, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (!isAdmin) {
    query = query.eq('status', 'published');
  } else if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify({ posts: data, total: count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

// POST /api/blog/list — create new post (admin only)
export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (originCheck) return originCheck;

  const user = await requireAdmin(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { title, slug, excerpt, content, cover_image, category, tags, status, author_name, seo_title, seo_desc } = body;

  if (!title?.trim() || !slug?.trim()) {
    return new Response(JSON.stringify({ error: 'Tiêu đề và slug là bắt buộc.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const safeSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const published_at = status === 'published' ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: title.trim(),
      slug: safeSlug,
      excerpt: excerpt?.trim() ?? null,
      content: content ?? '',
      cover_image: cover_image?.trim() ?? null,
      category: category ?? 'Kiến thức',
      tags: tags ?? [],
      status: status ?? 'draft',
      author_name: author_name?.trim() || 'FlySky Guitar',
      seo_title: seo_title?.trim() ?? null,
      seo_desc: seo_desc?.trim() ?? null,
      published_at,
    })
    .select()
    .single();

  if (error) {
    const msg = error.code === '23505' ? 'Slug đã tồn tại. Vui lòng dùng slug khác.' : error.message;
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ post: data }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
