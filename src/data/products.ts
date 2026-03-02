export interface Product {
    id: string;
    name: string;
    category: 'electric' | 'acoustic' | 'bass';
    categoryLabel: string;
    subtitle: string;
    price: number;
    priceFormatted: string;
    image: string;
    images: string[];
    badge: string | null;
    rating: number;
    reviews: number;
    description: string;
    longDescription: string;
    features: string[];
    specs: { label: string; value: string }[];
    relatedIds: string[];
}

export const products: Product[] = [
    {
        id: 'flysky-stratos-elite',
        name: 'FlySky Stratos Elite',
        category: 'electric',
        categoryLabel: 'Guitar Điện',
        subtitle: 'Midnight Burst',
        price: 32990000,
        priceFormatted: '32.990.000₫',
        image: '/images/product-stratos.jpg',
        images: ['/images/product-stratos.jpg', '/images/cat-electric.jpg'],
        badge: 'MỚI',
        rating: 5,
        reviews: 24,
        description: 'Âm thanh điện mạnh mẽ, thiết kế ergonomic cao cấp.',
        longDescription:
            'Trải nghiệm đỉnh cao của sự linh hoạt trong âm thanh. Được chế tác thủ công cho những nghệ sĩ hiện đại, FlySky Stratos Elite trang bị bộ Humbuckers tùy chỉnh và cần đàn gỗ phong nướng để mang lại độ vang và khả năng chơi nhạc vô song. Mỗi chi tiết được mài giũa để đảm bảo bạn có thể diễn đạt mọi sắc thái âm nhạc.',
        features: [
            'Mặt trên gỗ phong vân lửa cấp AAA',
            'Bộ thu âm Active "SkyHigh" tùy chỉnh',
            'Khóa đàn chống trượt cho sự ổn định tuyệt đối',
            'Cần đàn gỗ phong nướng chống cong vênh',
        ],
        specs: [
            { label: 'Loại thân', value: 'Solid Body' },
            { label: 'Chất liệu thân', value: 'Mahogany + Maple Cap' },
            { label: 'Cần đàn', value: 'Gỗ phong nướng (Roasted Maple)' },
            { label: 'Phím đàn', value: 'Ebony, 24 phím' },
            { label: 'Pickup', value: 'Humbucker Active "SkyHigh" (Cầu + Cổ)' },
            { label: 'Dây đàn', value: '.010 - .046' },
            { label: 'Xuất xứ', value: 'Việt Nam (Handcrafted)' },
        ],
        relatedIds: ['flysky-vintage-jazz', 'flysky-horizon-se'],
    },
    {
        id: 'flysky-dreadnought-pro',
        name: 'FlySky Dreadnought Pro',
        category: 'acoustic',
        categoryLabel: 'Guitar Acoustic',
        subtitle: 'Natural Spruce',
        price: 22500000,
        priceFormatted: '22.500.000₫',
        image: '/images/product-dreadnought.jpg',
        images: ['/images/product-dreadnought.jpg', '/images/cat-acoustic.jpg'],
        badge: null,
        rating: 4,
        reviews: 18,
        description: 'Âm thanh acoustic thuần khiết, gỗ tự nhiên cao cấp.',
        longDescription:
            'Lấy cảm hứng từ những cây đàn huyền thoại thập niên 50, FlySky Dreadnought Pro mang lại âm thanh mộc mạc, ấm áp và đầy cảm xúc. Thân đàn gỗ nguyên khối với hộp cộng hưởng tinh tế cho phép mỗi nốt nhạc toả sáng theo cách riêng biệt.',
        features: [
            'Mặt đàn Sitka Spruce nguyên khối',
            'Hông và lưng gỗ Rosewood cao cấp',
            'Cần đàn Mahogany + Phím Ebony',
            'Ngựa đàn xương bò tự nhiên',
        ],
        specs: [
            { label: 'Loại thân', value: 'Dreadnought' },
            { label: 'Mặt đàn', value: 'Sitka Spruce nguyên khối' },
            { label: 'Hông & Lưng', value: 'Indian Rosewood' },
            { label: 'Cần đàn', value: 'Mahogany, 20 phím' },
            { label: 'Phím đàn', value: 'Ebony' },
            { label: 'Ngựa đàn', value: 'Xương bò tự nhiên' },
            { label: 'Xuất xứ', value: 'Việt Nam (Handcrafted)' },
        ],
        relatedIds: ['flysky-woodland-acoustic', 'flysky-celestia-grand'],
    },
    {
        id: 'flysky-thunder-bass',
        name: 'FlySky Thunder Bass',
        category: 'bass',
        categoryLabel: 'Guitar Bass',
        subtitle: 'Dark Walnut',
        price: 27900000,
        priceFormatted: '27.900.000₫',
        image: '/images/product-thunder.jpg',
        images: ['/images/product-thunder.jpg', '/images/cat-electric.jpg'],
        badge: null,
        rating: 5,
        reviews: 12,
        description: 'Nhịp điệu trầm ấm, phù hợp mọi thể loại nhạc.',
        longDescription:
            'FlySky Thunder Bass là nền tảng nhịp điệu vững chắc cho mọi ban nhạc. Được thiết kế với thân đàn Alder nhẹ và cần đàn Maple cứng cáp, Thunder Bass mang lại âm trầm sâu, chắc và rõ ràng trong mọi dải tần.',
        features: [
            'Thân đàn Alder nhẹ, cân bằng tốt',
            'Pickup Split-Coil P-style + J-style',
            'Cần đàn Maple với phím Pao Ferro',
            'Chốt đàn nặng chống trôi mặt dây',
        ],
        specs: [
            { label: 'Số dây', value: '4 dây' },
            { label: 'Thân đàn', value: 'Alder' },
            { label: 'Cần đàn', value: 'Maple' },
            { label: 'Phím đàn', value: 'Pao Ferro, 20 phím' },
            { label: 'Pickup', value: 'P-style (cổ) + J-style (cầu)' },
            { label: 'Scale Length', value: '864mm (34")' },
            { label: 'Xuất xứ', value: 'Việt Nam (Handcrafted)' },
        ],
        relatedIds: ['flysky-groove-bass', 'flysky-stratos-elite'],
    },
    {
        id: 'flysky-vintage-jazz',
        name: 'Vintage Jazz Master',
        category: 'electric',
        categoryLabel: 'Guitar Điện',
        subtitle: 'Sunburst Gold',
        price: 54000000,
        priceFormatted: '54.000.000₫',
        image: '/images/product-vintage-jazz.jpg',
        images: ['/images/product-vintage-jazz.jpg', '/images/cat-electric.jpg'],
        badge: 'GIỚI HẠN',
        rating: 5,
        reviews: 7,
        description: 'Phiên bản giới hạn, hội tụ tinh hoa lịch sử jazz.',
        longDescription:
            'Phiên bản giới hạn Vintage Jazz Master tôn vinh thời kỳ vàng của nhạc jazz. Mỗi cây đàn được đánh số thứ tự và đi kèm chứng chỉ xác thực. Âm thanh ấm áp, ngòn ngọt đặc trưng của jazz sẽ đưa bạn trở về thời đại hoàng kim của âm nhạc.',
        features: [
            'Phiên bản giới hạn, đánh số thứ tự',
            'Mặt đàn gỗ Spruce vân lửa AAA',
            'Pickup Single-Coil P-90 vintage',
            'Phần hoàn thiện lacquer nitro xịn',
        ],
        specs: [
            { label: 'Loại thân', value: 'Semi-Hollow' },
            { label: 'Chất liệu', value: 'Maple + Spruce' },
            { label: 'Phím đàn', value: 'Rosewood, 22 phím' },
            { label: 'Pickup', value: 'P-90 Vintage (x2)' },
            { label: 'Hoàn thiện', value: 'Nitrocellulose Lacquer' },
            { label: 'Số lượng', value: 'Giới hạn 50 cây' },
            { label: 'Xuất xứ', value: 'Việt Nam (Handcrafted)' },
        ],
        relatedIds: ['flysky-stratos-elite', 'flysky-horizon-se'],
    },
    {
        id: 'flysky-horizon-se',
        name: 'FlySky Horizon SE',
        category: 'electric',
        categoryLabel: 'Guitar Điện',
        subtitle: 'Ocean Blue',
        price: 19900000,
        priceFormatted: '19.900.000₫',
        image: '/images/product-stratos.jpg',
        images: ['/images/product-stratos.jpg', '/images/cat-electric.jpg'],
        badge: 'HOT',
        rating: 4,
        reviews: 31,
        description: 'Lý tưởng cho người mới bắt đầu và nhạc sĩ nhà nghề.',
        longDescription:
            'FlySky Horizon SE là điểm khởi đầu hoàn hảo cho hành trình âm nhạc của bạn. Với thiết kế ergonomic thân thiện và âm thanh đa dụng, Horizon SE phù hợp từ người mới học đến nhạc sĩ chuyên nghiệp.',
        features: [
            'Thân đàn Basswood nhẹ',
            'Pickup SSH configuration đa dụng',
            'Tremolo 2-point floating',
            'Cần đàn Maple + Phím Indian Laurel',
        ],
        specs: [
            { label: 'Loại thân', value: 'Solid Body' },
            { label: 'Chất liệu', value: 'Basswood' },
            { label: 'Pickup', value: 'SSH (Single + Single + Humbucker)' },
            { label: 'Phím đàn', value: 'Indian Laurel, 22 phím' },
            { label: 'Tremolo', value: '2-point Floating' },
            { label: 'Dây đàn', value: '.009 - .042' },
            { label: 'Xuất xứ', value: 'Việt Nam' },
        ],
        relatedIds: ['flysky-stratos-elite', 'flysky-vintage-jazz'],
    },
    {
        id: 'flysky-woodland-acoustic',
        name: 'FlySky Woodland Acoustic',
        category: 'acoustic',
        categoryLabel: 'Guitar Acoustic',
        subtitle: 'Honey Burst',
        price: 15500000,
        priceFormatted: '15.500.000₫',
        image: '/images/product-dreadnought.jpg',
        images: ['/images/product-dreadnought.jpg', '/images/cat-acoustic.jpg'],
        badge: null,
        rating: 4,
        reviews: 22,
        description: 'Gỗ nguyên khối, hộp cộng hưởng vang rộng.',
        longDescription:
            'FlySky Woodland Acoustic mang âm thanh tự nhiên và hộp cộng hưởng rộng rãi đến từng buổi tập. Được làm từ gỗ tuyển chọn, mỗi cây đàn có vân gỗ độc đáo như một tác phẩm nghệ thuật.',
        features: [
            'Mặt đàn Cedar nguyên khối',
            'Hông & lưng Sapele vân sọc',
            'Cần đàn nhôm truss rod kép',
            'Dây đàn phosphor bronze',
        ],
        specs: [
            { label: 'Loại thân', value: 'Grand Auditorium' },
            { label: 'Mặt đàn', value: 'Western Red Cedar' },
            { label: 'Hông & Lưng', value: 'Sapele' },
            { label: 'Phím đàn', value: 'Walnut, 20 phím' },
            { label: 'Ngựa đàn', value: 'Tusq synthetic' },
            { label: 'Tuner', value: 'Die-cast chrome' },
            { label: 'Xuất xứ', value: 'Việt Nam' },
        ],
        relatedIds: ['flysky-dreadnought-pro', 'flysky-celestia-grand'],
    },
    {
        id: 'flysky-groove-bass',
        name: 'FlySky Groove Bass',
        category: 'bass',
        categoryLabel: 'Guitar Bass',
        subtitle: 'Satin Black',
        price: 18200000,
        priceFormatted: '18.200.000₫',
        image: '/images/product-thunder.jpg',
        images: ['/images/product-thunder.jpg', '/images/cat-electric.jpg'],
        badge: null,
        rating: 4,
        reviews: 9,
        description: 'Thiết kế nhỏ gọn, âm trầm sâu lắng.',
        longDescription:
            'FlySky Groove Bass nhỏ gọn và năng động, phù hợp cho mọi sân khấu từ phòng tập đến sân khấu lớn. Thiết kế cân bằng tốt giúp bạn chơi nhạc thoải mái suốt nhiều giờ liền.',
        features: [
            'Thân đàn Poplar compact',
            'Active EQ 3-band tích hợp',
            'Short scale 762mm cho tay nhỏ',
            'Pickup J-style x2 hum-cancelling',
        ],
        specs: [
            { label: 'Số dây', value: '4 dây' },
            { label: 'Scale Length', value: '762mm (30")' },
            { label: 'Thân đàn', value: 'Poplar' },
            { label: 'Pickup', value: 'J-style x2 Active' },
            { label: 'EQ', value: 'Active 3-band' },
            { label: 'Pin', value: 'PP3 9V' },
            { label: 'Xuất xứ', value: 'Việt Nam' },
        ],
        relatedIds: ['flysky-thunder-bass', 'flysky-stratos-elite'],
    },
    {
        id: 'flysky-celestia-grand',
        name: 'FlySky Celestia Grand',
        category: 'acoustic',
        categoryLabel: 'Guitar Acoustic',
        subtitle: 'Gloss Natural',
        price: 38000000,
        priceFormatted: '38.000.000₫',
        image: '/images/product-dreadnought.jpg',
        images: ['/images/product-dreadnought.jpg', '/images/cat-acoustic.jpg'],
        badge: 'CAO CẤP',
        rating: 5,
        reviews: 5,
        description: 'Đỉnh cao âm thanh acoustic, dành cho concert chuyên nghiệp.',
        longDescription:
            'FlySky Celestia Grand là đỉnh cao nghệ thuật chế tác đàn acoustic của FlySky. Dành riêng cho các nghệ sĩ biểu diễn concert chuyên nghiệp, mỗi cây đàn được mất hơn 200 giờ thủ công để hoàn thiện.',
        features: [
            'Adirondack Spruce mặt đàn tốc độ phản hồi cao',
            'Hông & lưng Brazilian Rosewood cao cấp',
            'Khảm trang trí abalone thủ công',
            'Điều chỉnh nội thất thủ công bởi luthier',
        ],
        specs: [
            { label: 'Loại thân', value: 'Jumbo' },
            { label: 'Mặt đàn', value: 'Adirondack Spruce nguyên khối' },
            { label: 'Hông & Lưng', value: 'Brazilian Rosewood' },
            { label: 'Khảm', value: 'Abalone shell' },
            { label: 'Phím đàn', value: 'Ebony, 20 phím' },
            { label: 'Thời gian chế tác', value: '200+ giờ thủ công' },
            { label: 'Xuất xứ', value: 'Việt Nam (Master Luthier)' },
        ],
        relatedIds: ['flysky-dreadnought-pro', 'flysky-woodland-acoustic'],
    },
];

export function getProductById(id: string): Product | undefined {
    return products.find((p) => p.id === id);
}

export function getRelatedProducts(ids: string[]): Product[] {
    return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
}
