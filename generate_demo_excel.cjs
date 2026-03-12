const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const data = [
  {
    "SKU": "FS-G001",
    "Tên sản phẩm": "Classic Studio Wood A+",
    "Danh mục": "Đàn Guitar",
    "Giá bán": 15000000,
    "Số lượng": 85,
    "Link Ảnh": "https://lh3.googleusercontent.com/aida-public/AB6AXuARF7Hz_VbgAMgHUmozowd2ldnCFltYaOAP8il3pjr1xP3yqqdYYxtgbfPM0TPPQcpTqod1miuXgQgBIDHEDD8rjLfp8KkFzyTiVxoqSHNrcJu9RZ3V1u0QNT9BC-lCwUeUDm0BJRlKMntvf6rG_s-PYK5KPtXIDv9m5FiKlkJzyKgFoYQheq8CpyyxE3gSmHOeorrPLCNlBSMRu2uypG_ysgXtCMtu4N47kWzK7Fls3_hlienxHHwE4jKlHojopMhL3PTaieTebKOG",
    "Mô tả": "Đàn guitar thùng truyền thống chất liệu gỗ Studio Wood A+."
  },
  {
    "SKU": "FS-G002",
    "Tên sản phẩm": "Acoustic Custom Dark Limited",
    "Danh mục": "Đàn Guitar",
    "Giá bán": 22000000,
    "Số lượng": 15,
    "Link Ảnh": "https://lh3.googleusercontent.com/aida-public/AB6AXuAFbhbNCcMkMuxVX4d8LdISaehQlTcCJNwDClfmxYbI1ntXjFSWrtvk0t2ZeNOZ3CpvPvY9eQlGD-xwu5PmKU2-PeCEJmjnqDFdqo4QMqvtJBFL3lipAqSfZ07riDcJ9DMFwsLgerbBybTg9DlgC9Q8K1rvOtMJ1KLEsLbRax_7DgqOQ8NkCkXQhOTQ-3wUWQBAz49X7fiNxtJ64qK-ITCLqG67GgInAiIgy89HMRMk5B6RKtGsOv6TQAfpD0m3JMick7whC5858W4U",
    "Mô tả": "Dòng Acoustic phiên bản giới hạn với màu sơn Dark Limited siêu độc."
  },
  {
    "SKU": "FS-E001",
    "Tên sản phẩm": "Electric Flame Maple Standard",
    "Danh mục": "Đàn Guitar Điện",
    "Giá bán": 18500000,
    "Số lượng": 30,
    "Link Ảnh": "https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?auto=format&fit=crop&q=80",
    "Mô tả": "Guitar điện mặt top Flame Maple tiêu chuẩn."
  },
  {
    "SKU": "FS-A102",
    "Tên sản phẩm": "Bộ dây Elixir Acoustic Nanoweb (11-52)",
    "Danh mục": "Phụ kiện",
    "Giá bán": 450000,
    "Số lượng": 120,
    "Link Ảnh": "https://lh3.googleusercontent.com/aida-public/AB6AXuAiQgoiAoTzLE72T6yQzNNBO8f7NsHPMO9D9LBTz2K5bKLTITvn7zkOsHPGTDMi3dA1ep3a0BpLv6wr_huQO-8A9S-xDosSc-Pkjxgv5-us_l7Kt9B0AONpmd17MyJrcVCdWUE629wunWalhvtUDciimWXt1N2tKLgVbnzITwT3tzgmScXFjUqrjFXb16Ylu31wBHhqoRVw0uYiWIj45RCWUd5UAsW50o-pRBiV-qiE0i2tPITM4zmXjKWxvbb3NqtwaSQ5TulnWnzS",
    "Mô tả": "Bộ dây đàn Acoustic cao cấp phủ Nanoweb chống gỉ sét."
  },
  {
    "SKU": "FS-A103",
    "Tên sản phẩm": "Dây đàn D'Addario Phosphor Bronze EJ16",
    "Danh mục": "Phụ kiện",
    "Giá bán": 250000,
    "Số lượng": 50,
    "Link Ảnh": "https://images.unsplash.com/photo-1610486847844-04661001dfa5?auto=format&fit=crop&q=80",
    "Mô tả": "Dây đàn acoustic đồng Phosphor ấm áp truyền thống."
  },
  {
    "SKU": "FS-A105",
    "Tên sản phẩm": "Capo Guitar Hợp kim kẽm Đen nhánh",
    "Danh mục": "Phụ kiện",
    "Giá bán": 180000,
    "Số lượng": 200,
    "Link Ảnh": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80",
    "Mô tả": "Capo kẹp liền mạch, lò xo siêu bền bỉ."
  },
  {
    "SKU": "FS-A106",
    "Tên sản phẩm": "Bao đàn Guitar Acoustic 3 Lớp Bọc Đệm",
    "Danh mục": "Phụ kiện",
    "Giá bán": 350000,
    "Số lượng": 45,
    "Link Ảnh": "https://images.unsplash.com/photo-1549487961-f06e6bf764f6?auto=format&fit=crop&q=80",
    "Mô tả": "Bao đàn dày dặn chống sốc tốt."
  },
  {
    "SKU": "FS-A107",
    "Tên sản phẩm": "Dây đeo Guitar Da Bò Khắc Lazer",
    "Danh mục": "Phụ kiện",
    "Giá bán": 420000,
    "Số lượng": 20,
    "Link Ảnh": "https://images.unsplash.com/photo-1628163539563-04dc32c25ae9?auto=format&fit=crop&q=80",
    "Mô tả": "Dây đeo da bò sáp khắc hoa văn Vintage êm ái."
  },
  {
    "SKU": "FS-W042",
    "Tên sản phẩm": "Phôi Gỗ Tuyết Tùng Cedar A+",
    "Danh mục": "Gỗ & Vật liệu",
    "Giá bán": 2500000,
    "Số lượng": 5,
    "Link Ảnh": "https://lh3.googleusercontent.com/aida-public/AB6AXuDHITn6ZoRi66nuewRoh_P2iWh90HzxMsdK6Z29wPOhBR5DefZGrYyX4zQGUNkNFjSYbx9X2dUV5QTeyAirAA0zv0NzagJTTJ32i1CQScbJzXnhA9U-P9BVHWx48NFvUPn93NWVDU075Jk9IJQFXFku4C4iM55oreE6cx-b7n8hqhAMzbE_vYd16Oka_KwlIOfCct5fBQI9IhRfEPaCk_VpdAzAqGxqy9rThKHubVoqR6fKm5kho2TPNL1ruKqlMv-HQP-XOkLpo-a7",
    "Mô tả": "Mặt phôi gỗ Cedar chất lượng cao nhập khẩu."
  },
  {
    "SKU": "FS-W043",
    "Tên sản phẩm": "Back & Sides Indian Rosewood Master Grade",
    "Danh mục": "Gỗ & Vật liệu",
    "Giá bán": 4500000,
    "Số lượng": 2,
    "Link Ảnh": "https://images.unsplash.com/photo-1502014822147-1aa9ba6ceeed?auto=format&fit=crop&q=80",
    "Mô tả": "Bộ gỗ cẩm lai Ấn Độ làm lưng hông đẳng cấp nhất."
  },
  {
    "SKU": "FS-W045",
    "Tên sản phẩm": "Phôi Gỗ Sitka Spruce AAA",
    "Danh mục": "Gỗ & Vật liệu",
    "Giá bán": 1800000,
    "Số lượng": 15,
    "Link Ảnh": "https://images.unsplash.com/photo-1617300713706-03f434255cf0?auto=format&fit=crop&q=80",
    "Mô tả": "Phôi thông sitka châu Mỹ cho âm sắc sáng rực rỡ."
  },
  {
    "SKU": "FS-M001",
    "Tên sản phẩm": "Máy lọc không khí bảo vệ gỗ",
    "Danh mục": "Khác",
    "Giá bán": 1250000,
    "Số lượng": 8,
    "Link Ảnh": "https://images.unsplash.com/photo-1596484552834-6a58f840f1dc?auto=format&fit=crop&q=80",
    "Mô tả": "Máy lọc bảo vệ độ ẩm ổn định cho phòng chứa đàn."
  },
  {
    "SKU": "FS-M002",
    "Tên sản phẩm": "Đồng hồ đo độ ẩm điện tử",
    "Danh mục": "Khác",
    "Giá bán": 250000,
    "Số lượng": 30,
    "Link Ảnh": "https://images.unsplash.com/photo-1634128221889-82edcfd10787?auto=format&fit=crop&q=80",
    "Mô tả": "Công cụ theo dõi độ ẩm cho đàn mộc bảo vệ rạn nứt."
  },
  {
    "SKU": "FS-G008",
    "Tên sản phẩm": "Travel Mini Acoustic 3/4",
    "Danh mục": "Đàn Guitar",
    "Giá bán": 8500000,
    "Số lượng": 14,
    "Link Ảnh": "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&q=80",
    "Mô tả": "Guitar Mini với kích thước 3/4 chuyên dụng để du lịch."
  },
  {
    "SKU": "FS-G011",
    "Tên sản phẩm": "Grand Auditorium Koa Supreme",
    "Danh mục": "Đàn Guitar",
    "Giá bán": 35000000,
    "Số lượng": 3,
    "Link Ảnh": "https://images.unsplash.com/photo-1611095973763-414019e72400?auto=format&fit=crop&q=80",
    "Mô tả": "Toàn thân bằng gỗ Koa Hawaii rực rỡ và quý hiếm."
  }
];

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
  { wch: 60 }  // Mô tả
];
ws['!cols'] = wscols;

// Create workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_San_Pham");

// Write to file
const filePath = path.join(__dirname, 'flysky_demo_products_v2.xlsx');
XLSX.writeFile(wb, filePath);

console.log(`Demo Excel file created successfully at: ${filePath}`);
