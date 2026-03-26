import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { ensureSameOrigin } from '../../../lib/security';

async function requireAdmin(cookies: any) {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

// GET /api/blog/post?id=... or ?slug=...
export const GET: APIRoute = async ({ url, cookies }) => {
  const id   = url.searchParams.get('id');
  const slug = url.searchParams.get('slug');

  if (!id && !slug) {
    return new Response(JSON.stringify({ error: 'Cần cung cấp id hoặc slug.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const isAdmin = !!(await requireAdmin(cookies));

  let query = supabase.from('blog_posts').select('*');
  if (id)   query = query.eq('id', id);
  if (slug) query = query.eq('slug', slug);

  if (!isAdmin) query = query.eq('status', 'published');

  const { data, error } = await query.single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Không tìm thấy bài viết.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Increment view count for public reads
  if (!isAdmin && data.status === 'published') {
    await supabase.from('blog_posts').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', data.id);
  }

  return new Response(JSON.stringify({ post: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// PUT /api/blog/post — update post (admin only)
export const PUT: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (originCheck) return originCheck;

  const user = await requireAdmin(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { id, title, slug, excerpt, content, cover_image, category, tags, status, author_name, seo_title, seo_desc } = body;

  if (!id) return new Response(JSON.stringify({ error: 'Thiếu id bài viết.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  // Fetch current record to preserve published_at if already set
  const { data: existing } = await supabase.from('blog_posts').select('status, published_at').eq('id', id).single();
  const wasPublished = existing?.status === 'published';
  const published_at = status === 'published' && !wasPublished
    ? new Date().toISOString()
    : existing?.published_at ?? null;

  const safeSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') : undefined;

  const updates: Record<string, any> = {
    ...(title        !== undefined && { title: title.trim() }),
    ...(safeSlug     !== undefined && { slug: safeSlug }),
    ...(excerpt      !== undefined && { excerpt: excerpt?.trim() ?? null }),
    ...(content      !== undefined && { content }),
    ...(cover_image  !== undefined && { cover_image: cover_image?.trim() ?? null }),
    ...(category     !== undefined && { category }),
    ...(tags         !== undefined && { tags }),
    ...(status       !== undefined && { status, published_at }),
    ...(author_name  !== undefined && { author_name: author_name?.trim() }),
    ...(seo_title    !== undefined && { seo_title: seo_title?.trim() ?? null }),
    ...(seo_desc     !== undefined && { seo_desc: seo_desc?.trim() ?? null }),
  };

  const { data, error } = await supabase.from('blog_posts').update(updates).eq('id', id).select().single();

  if (error) {
    const msg = error.code === '23505' ? 'Slug đã tồn tại. Vui lòng dùng slug khác.' : error.message;
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ post: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// DELETE /api/blog/post — delete post (admin only)
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (originCheck) return originCheck;

  const user = await requireAdmin(cookies);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { id } = body;

  if (!id) return new Response(JSON.stringify({ error: 'Thiếu id bài viết.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const { error } = await supabase.from('blog_posts').delete().eq('id', id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
