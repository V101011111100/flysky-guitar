import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function toCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value || 0);
}

function toDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN');
}

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const statusFilter = (url.searchParams.get('status') || 'all').trim();
    const q = (url.searchParams.get('q') || '').trim();

    let query = supabase
      .from('orders')
      .select('*, items:order_items(*, product:products(name))')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (q) {
      const safe = q.replaceAll(',', ' ');
      query = query.or(
        `order_number.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%,customer_email.ilike.%${safe}%`
      );
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    const rows = (orders || []).map((order: any) => {
      const products = (order.items || []).map((item: any) => {
        const name = item.product?.name || 'Sản phẩm không xác định';
        const qty = item.quantity || 1;
        const price = item.price_at_time || 0;
        return `${name} x${qty} (${toCurrency(price)})`;
      });

      return {
        'Mã đơn': order.order_number || '',
        'Ngày tạo': order.created_at ? toDateTime(order.created_at) : '',
        'Trạng thái': STATUS_LABELS[order.status] || order.status || '',
        'Khách hàng': order.customer_name || '',
        'Số điện thoại': order.customer_phone || '',
        'Email': order.customer_email || '',
        'Địa chỉ': order.customer_address || '',
        'Phương thức thanh toán': order.payment_method || '',
        'Tổng tiền': order.total_amount || 0,
        'Ghi chú': order.note || '',
        'Danh sách sản phẩm': products.join(' | '),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 26 },
      { wch: 36 },
      { wch: 24 },
      { wch: 18 },
      { wch: 36 },
      { wch: 90 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    const fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const now = new Date();
    const fileDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="flysky-orders-${fileDate}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Không thể xuất dữ liệu đơn hàng.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
