import { supabase } from './supabase';

export interface ActivityLogInput {
  user_id?: string;
  user_name?: string;
  user_role?: string;
  action_type: 'Thêm mới' | 'Cập nhật' | 'Xóa' | 'Bảo mật / Hệ thống';
  action_text: string;
  module_name: 'Inventory' | 'Orders' | 'System' | 'Auth' | 'Products' | 'Consultations' | 'Settings';
  ip_address?: string;
  details?: any;
}

export async function logActivity(input: ActivityLogInput) {
  try {
    const { error } = await supabase.from('activity_logs').insert([{
      ...input,
      ip_address: input.ip_address || 'unknown'
    }]);
    
    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    console.error('Exception logging activity:', err);
  }
}

export async function getClientIp(request: Request): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  let ip = forwarded ? forwarded.split(',')[0].trim() : (realIp || '');

  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
    try {
      // Fallback for local dev to fetch actual WAN / VPN IP
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip;
    } catch {
      ip = '127.0.0.1';
    }
  }
  
  return ip || 'unknown';
}
