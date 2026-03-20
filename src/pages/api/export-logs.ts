import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'Tháng này';
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  
  let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
  
  const now = new Date();
  if (period === 'Hôm nay') {
    query = query.gte('created_at', new Date(now.setHours(0,0,0,0)).toISOString());
  } else if (period === 'Tháng này') {
    query = query.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
  } else if (period === '7 ngày qua' || period === 'Tuần này') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    query = query.gte('created_at', d.toISOString());
  } else if (period === '30 ngày qua') {
    const d = new Date(); d.setDate(d.getDate() - 30);
    query = query.gte('created_at', d.toISOString());
  } else if (period === 'Custom' && startParam && endParam) {
    const customEnd = new Date(endParam);
    customEnd.setHours(23, 59, 59, 999);
    query = query.gte('created_at', new Date(startParam).toISOString()).lte('created_at', customEnd.toISOString());
  }

  const { data } = await query;
  const logs = data || [];

  // Thêm BOM (Byte Order Mark) để Excel nhận diện chữ UTF-8 tiếng Việt
  const BOM = '\uFEFF';

  const csvRows = [
    ['ID', 'Thời gian', 'Người dùng', 'Vai trò', 'Hành động', 'Chi tiết', 'Module', 'IP_Address']
  ];
  
  logs.forEach(log => {
    csvRows.push([
      log.id,
      new Date(log.created_at).toLocaleString('vi-VN'),
      `"${(log.user_name || 'Hệ thống').replace(/"/g, '""')}"`,
      `"${(log.user_role || '').replace(/"/g, '""')}"`,
      `"${log.action_type.replace(/"/g, '""')}"`,
      `"${(log.action_text || '').replace(/"/g, '""')}"`,
      log.module_name,
      log.ip_address || ''
    ]);
  });
  
  const csvString = BOM + csvRows.map(row => row.join(',')).join('\n');
  
  return new Response(csvString, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="activity_logs.csv"'
    }
  });
};
