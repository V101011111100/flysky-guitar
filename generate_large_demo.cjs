const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const baseData = [
  {
    "SKU": "FS-G001",
    "Tên sản phẩm": "Classic Studio Wood A+",
    "Danh mục": "Đàn Guitar",
    "Giá bán": 15000000,
    "Số lượng": 85,
    "Link Ảnh": "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Đàn guitar thùng truyền thống chất liệu gỗ Studio Wood A+."
  },
  {
    "SKU": "FS-G002",
    "Tên sản phẩm": "Acoustic Custom Dark Limited",
    "Danh mục": "Đàn Guitar",
    "Giá bán": 22000000,
    "Số lượng": 15,
    "Link Ảnh": "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Dòng Acoustic phiên bản giới hạn với màu sơn Dark Limited siêu độc."
  },
  {
    "SKU": "FS-E001",
    "Tên sản phẩm": "Electric Flame Maple Standard",
    "Danh mục": "Đàn Guitar Điện",
    "Giá bán": 18500000,
    "Số lượng": 30,
    "Link Ảnh": "https://images.unsplash.com/photo-1564186763535-ebbba092658a?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Guitar điện mặt top Flame Maple tiêu chuẩn."
  },
  {
    "SKU": "FS-A102",
    "Tên sản phẩm": "Bộ dây Elixir Acoustic Nanoweb",
    "Danh mục": "Phụ kiện",
    "Giá bán": 450000,
    "Số lượng": 120,
    "Link Ảnh": "https://images.unsplash.com/photo-1610486847844-04661001dfa5?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Bộ dây đàn Acoustic cao cấp phủ Nanoweb chống gỉ sét."
  },
  {
    "SKU": "FS-A103",
    "Tên sản phẩm": "Dây đàn D'Addario Phosphor",
    "Danh mục": "Phụ kiện",
    "Giá bán": 250000,
    "Số lượng": 50,
    "Link Ảnh": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Dây đàn acoustic đồng Phosphor ấm áp truyền thống."
  },
  {
    "SKU": "FS-A105",
    "Tên sản phẩm": "Capo Guitar Hợp kim kẽm",
    "Danh mục": "Phụ kiện",
    "Giá bán": 180000,
    "Số lượng": 200,
    "Link Ảnh": "https://images.unsplash.com/photo-1550291652-6ea9114a47b1?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Capo kẹp liền mạch, lò xo siêu bền bỉ."
  },
  {
    "SKU": "FS-A106",
    "Tên sản phẩm": "Bao đàn Guitar 3 Lớp Bọc",
    "Danh mục": "Phụ kiện",
    "Giá bán": 350000,
    "Số lượng": 45,
    "Link Ảnh": "https://images.unsplash.com/photo-1549487961-f06e6bf764f6?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Bao đàn dày dặn chống sốc tốt."
  },
  {
    "SKU": "FS-A107",
    "Tên sản phẩm": "Dây đeo Guitar Da Bò Khắc Lazer",
    "Danh mục": "Phụ kiện",
    "Giá bán": 420000,
    "Số lượng": 20,
    "Link Ảnh": "https://images.unsplash.com/photo-1628163539563-04dc32c25ae9?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Dây đeo da bò sáp khắc hoa văn Vintage êm ái."
  },
  {
    "SKU": "FS-W042",
    "Tên sản phẩm": "Phôi Gỗ Tuyết Tùng Cedar A+",
    "Danh mục": "Gỗ & Vật liệu",
    "Giá bán": 2500000,
    "Số lượng": 5,
    "Link Ảnh": "https://images.unsplash.com/photo-1617300713706-03f434255cf0?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Mặt phôi gỗ Cedar chất lượng cao nhập khẩu."
  },
  {
    "SKU": "FS-W043",
    "Tên sản phẩm": "Indian Rosewood Master Grade",
    "Danh mục": "Gỗ & Vật liệu",
    "Giá bán": 4500000,
    "Số lượng": 2,
    "Link Ảnh": "https://images.unsplash.com/photo-1502014822147-1aa9ba6ceeed?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Bộ gỗ cẩm lai Ấn Độ làm lưng hông đẳng cấp."
  },
  {
    "SKU": "FS-M001",
    "Tên sản phẩm": "Máy lọc không khí bảo vệ gỗ",
    "Danh mục": "Khác",
    "Giá bán": 1250000,
    "Số lượng": 8,
    "Link Ảnh": "https://images.unsplash.com/photo-1596484552834-6a58f840f1dc?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Máy lọc bảo vệ độ ẩm ổn định cho phòng chứa đàn.",
    "Lưng Hông": "",
    "Mặt Top": "",
    "Cần Đàn": ""
  },
  {
    "SKU": "FS-M002",
    "Tên sản phẩm": "Đồng hồ đo độ ẩm điện tử",
    "Danh mục": "Khác",
    "Giá bán": 250000,
    "Số lượng": 30,
    "Link Ảnh": "https://images.unsplash.com/photo-1634128221889-82edcfd10787?auto=format&fit=crop&w=400&q=80",
    "Mô tả": "Công cụ theo dõi độ ẩm cho đàn mộc bảo vệ rạn nứt.",
    "Lưng Hông": "",
    "Mặt Top": "",
    "Cần Đàn": ""
  }
];

// Generate 48 items
const data = [];
for (let i = 1; i <= 4; i++) {
  baseData.forEach((item, index) => {
    data.push({
      ...item,
      "SKU": `${item.SKU}-V${i}`,
      "Tên sản phẩm": `${item["Tên sản phẩm"]} (Phiên bản ${i})`,
      "Số lượng": Math.floor(Math.random() * 50) + 2,
      // Modify specs dynamically for guitars
      "Lưng Hông": item["Danh mục"].includes('Guitar') ? `${['Mahogany', 'Rosewood', 'Koa', 'Maple', 'Walnut'][index % 5]} nguyên miếng` : '',
      "Mặt Top": item["Danh mục"].includes('Guitar') ? `${['Sitka Spruce', 'Cedar', 'Englemann Spruce', 'Adirondack Spruce'][index % 4]} AAA` : '',
      "Cần Đàn": item["Danh mục"].includes('Guitar') ? `${['Mahogany 1 mảnh', 'Maple C Shape', 'Walnut chữ V', 'Rosewood D Shape'][index % 4]} với truss rod` : '',
    });
  });
}

// Create worksheet
const ws = XLSX.utils.json_to_sheet(data);

// Adjust column widths manually
const wscols = [
  { wch: 15 }, // SKU
  { wch: 40 }, // Tên sản phẩm
  { wch: 20 }, // Danh mục
  { wch: 15 }, // Giá bán
  { wch: 10 }, // Số lượng
  { wch: 100 }, // Link Ảnh
  { wch: 60 }, // Mô tả
  { wch: 30 }, // Lưng Hông
  { wch: 30 }, // Mặt Top
  { wch: 30 }, // Cần Đàn
];
ws['!cols'] = wscols;

// Create workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_San_Pham");

// Write to file
const filePath = path.join(__dirname, 'flysky_demo_products_v4.xlsx');
XLSX.writeFile(wb, filePath);

console.log(`Demo Excel file created successfully at: ${filePath}`);
