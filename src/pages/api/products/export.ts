import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Auth check
    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");

    if (!accessToken || !refreshToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (authError || !authData.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Fetch all products with their category names
    const { data: products, error: dbError } = await supabase
      .from('products')
      .select(`
        *,
        categories ( name )
      `);

    if (dbError) throw dbError;

    // 3. Format data for Excel
    const excelData = products.map((p: any) => ({
      "SKU": p.slug,
      "Tên sản phẩm": p.name,
      "Danh mục": p.categories?.name || 'Chưa phân loại',
      "Giá bán": p.price || 0,
      "Số lượng": p.status === 'out_of_stock' ? 0 : 50, // Mock
      "Hình Ảnh": p.main_image_url || '',
      "Mô tả": p.description || '',
      "Lưng Hông": p.spec_body || '',
      "Mặt Top": p.spec_top || '',
      "Cần Đàn": p.spec_neck || '',
    }));

    // 4. Create Workbook and Sheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wscols = [
      { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, 
      { wch: 10 }, { wch: 100 }, { wch: 60 }
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products Export");

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 5. Return File response
    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="flysky_export.xlsx"',
      }
    });

  } catch (err: any) {
    console.error("Export Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
