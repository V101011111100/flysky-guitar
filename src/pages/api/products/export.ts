import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';

export const GET: APIRoute = async ({ request, cookies, url }) => {
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

    // 2. Get query params
    const format = url.searchParams.get('format') || 'full'; // full, active, lowstock
    const categoryId = url.searchParams.get('category');

    // 3. Fetch products with category
    let query = supabase
      .from('products')
      .select(`
        *,
        categories ( id, name )
      `);

    // Apply filters
    if (format === 'active') {
      query = query.eq('status', 'active');
    } else if (format === 'lowstock') {
      query = query.eq('status', 'low_stock').or('stock_quantity.lt.10');
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: products, error: dbError } = await query;

    if (dbError) throw dbError;
    if (!products || products.length === 0) {
      throw new Error('Không có sản phẩm để xuất.');
    }

    // 4. Format data with additional computed fields
    const excelData = products.map((p: any) => ({
      "SKU": p.slug,
      "Tên sản phẩm": p.name,
      "Danh mục": p.categories?.name || 'Chưa phân loại',
      "Giá bán (₫)": p.price || 0,
      "Số lượng": p.stock_quantity ?? 0,
      "Trạng thái": p.status === 'active' ? 'Hoạt động' : p.status === 'out_of_stock' ? 'Hết hàng' : (p.stock_quantity ?? 0) < 10 ? 'Sắp hết' : 'Khác',
      "Tổng giá trị": (p.price || 0) * (p.stock_quantity ?? 0),
      "Link Ảnh": p.gallery_images && p.gallery_images.length > 0 ? p.gallery_images[0] : '',
      "Mô tả": p.description || '',
      "Lưng Hông": p.spec_body || '',
      "Mặt Top": p.spec_top || '',
      "Cần Đàn": p.spec_neck || '',
      "Ngày tạo": p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '',
    }));

    // 5. Create summary sheet
    const totalProducts = products.length;
    const totalValue = products.reduce((sum: number, p: any) => sum + ((p.price || 0) * (p.stock_quantity ?? 0)), 0);
    const activeCount = products.filter((p: any) => p.status === 'active').length;
    const outOfStockCount = products.filter((p: any) => p.status === 'out_of_stock').length;

    const summaryData = [
      ['TỔNG HỢP SẢN PHẨM', ''],
      [''],
      ['Tổng sản phẩm:', totalProducts],
      ['Sản phẩm hoạt động:', activeCount],
      ['Hết hàng:', outOfStockCount],
      ['Tổng giá trị kho:', totalValue],
      [''],
      ['Ngày xuất:', new Date().toLocaleDateString('vi-VN')],
    ];

    // 6. Create Workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
    wsSummary['A1'].s = { font: { bold: true, size: 14 }, fill: { fgColor: { rgb: 'FFF48C25' } } };
    XLSX.utils.book_append_sheet(wb, wsSummary, "Tóm tắt");

    // Products sheet with styled headers
    const wsProducts = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    wsProducts['!cols'] = [
      { wch: 16 }, { wch: 35 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 18 }, { wch: 60 }, { wch: 50 }, { wch: 20 }, 
      { wch: 20 }, { wch: 20 }, { wch: 14 }
    ];

    // Freeze header row
    wsProducts['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Style header row
    const headerStyle = { 
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 11 },
      fill: { fgColor: { rgb: 'FFF48C25' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
    };
    
    const headers = Object.keys(excelData[0] || {});
    headers.forEach((_, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (wsProducts[cellRef]) {
        wsProducts[cellRef].s = headerStyle;
      }
    });

    XLSX.utils.book_append_sheet(wb, wsProducts, "Sản phẩm");

    // 7. Generate Buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 8. Build filename with format info
    const now = new Date();
    const fileDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const formatSuffix = format === 'active' ? '-hoat-dong' : format === 'lowstock' ? '-sap-het' : '';

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="flysky-products-${fileDate}${formatSuffix}.xlsx"`,
        'Cache-Control': 'no-store',
      }
    });

  } catch (err: any) {
    console.error("Export Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Lỗi xuất file' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
