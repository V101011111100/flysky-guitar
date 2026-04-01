import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';
import { ensureSameOrigin } from '../../../lib/security';

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return base || 'item';
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const originCheck = ensureSameOrigin(request);
  if (!originCheck.ok) return originCheck.response;

  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return new Response(JSON.stringify({ success: false, error: 'File quá lớn. Giới hạn 10MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls') && !lowerName.endsWith('.csv')) {
      return new Response(JSON.stringify({ success: false, error: 'Định dạng file không hợp lệ.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const wsname = wb.SheetNames[0];

    if (!wsname) {
      return new Response(JSON.stringify({ success: false, error: 'File Excel không có sheet dữ liệu.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ws = wb.Sheets[wsname];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

    if (!rows.length) {
      return new Response(JSON.stringify({ success: false, error: 'File không có dữ liệu để nhập.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate và format rows
    const validRows: Array<{ original: any; formatted: any; errors: string[] }> = [];
    const skippedRows: Array<{ rowIndex: number; reason: string }> = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const errors: string[] = [];
      const productName = String(row['Tên sản phẩm'] || '').trim();

      if (!productName) {
        skippedRows.push({ rowIndex: idx + 2, reason: 'Tên sản phẩm trống' });
        continue;
      }

      // Validate SKU uniqueness
      const sku = String(row['SKU'] || '').trim();
      const slug = sku ? slugify(sku) : slugify(productName || `product-${Date.now()}-${idx}`);

      // Check price format
      const priceVal = toNumber(row['Giá bán'], 0);
      if (!row['Giá bán'] || priceVal < 0) {
        errors.push('Giá bán không hợp lệ');
      }

      // Check stock format
      const stockVal = toNumber(row['Số lượng'], 0);
      if (row['Số lượng'] && stockVal < 0) {
        errors.push('Số lượng không hợp lệ');
      }

      const formatted = {
        name: productName,
        sku: sku || slug,
        category: String(row['Danh mục'] || '').trim() || 'Khác',
        price: Math.max(0, priceVal),
        stock: Math.max(0, Math.floor(stockVal)),
        image: String(row['Link Ảnh'] || row['Hình Ảnh'] || '').trim() || '(không có)',
        description: String(row['Mô tả'] || '').trim() || '(trống)',
      };

      validRows.push({
        original: row,
        formatted,
        errors,
      });
    }

    // Return preview data (first 10 rows)
    const previewRows = validRows.slice(0, 10);

    return new Response(
      JSON.stringify({
        success: true,
        totalRows: rows.length,
        validRows: validRows.length,
        skippedCount: skippedRows.length,
        errorCount: validRows.filter(r => r.errors.length > 0).length,
        preview: previewRows.map(r => ({
          formatted: r.formatted,
          errors: r.errors,
        })),
        skippedDetails: skippedRows.slice(0, 5), // Show first 5 skipped rows
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (err: any) {
    console.error('Preview Error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Lỗi xử lý file.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
