export type AdminFeatureKey =
  | 'dashboard'
  | 'pos'
  | 'media'
  | 'inventory'
  | 'orders'
  | 'shipping'
  | 'consultations'
  | 'reviews'
  | 'blog'
  | 'brand'
  | 'reports'
  | 'seo'
  | 'newsletter'
  | 'permissions'
  | 'activity-log'
  | 'settings'
  | 'products';

export const ADMIN_FEATURES: Array<{ key: AdminFeatureKey; label: string; description: string }> = [
  { key: 'dashboard', label: 'Bảng điều khiển', description: 'Trang tổng quan admin' },
  { key: 'pos', label: 'POS', description: 'Bán hàng tại quầy' },
  { key: 'media', label: 'Thư viện Media', description: 'Quản lý ảnh và tệp media' },
  { key: 'inventory', label: 'Kho hàng', description: 'Quản lý tồn kho' },
  { key: 'orders', label: 'Đơn hàng', description: 'Quản lý đơn hàng' },
  { key: 'shipping', label: 'Vận chuyển', description: 'Quản lý đơn vị vận chuyển và tracking' },
  { key: 'consultations', label: 'Khách hàng', description: 'Quản lý khách hàng/lead' },
  { key: 'reviews', label: 'Đánh giá', description: 'Duyệt và xử lý review' },
  { key: 'blog', label: 'Blog', description: 'Quản lý bài viết blog' },
  { key: 'brand', label: 'Thương hiệu', description: 'Chỉnh nội dung thương hiệu/about' },
  { key: 'reports', label: 'Báo cáo', description: 'Xem báo cáo doanh thu, hoạt động' },
  { key: 'seo', label: 'SEO & Marketing', description: 'Cấu hình SEO và chiến dịch marketing' },
  { key: 'newsletter', label: 'Newsletter Editor', description: 'Quản lý template email/newsletter' },
  { key: 'permissions', label: 'Phân quyền', description: 'Quản trị quyền theo tài khoản' },
  { key: 'activity-log', label: 'Nhật ký hoạt động', description: 'Xem log hệ thống' },
  { key: 'settings', label: 'Cài đặt', description: 'Cấu hình hệ thống' },
  { key: 'products', label: 'Sản phẩm', description: 'Quản lý sản phẩm' },
];

export const ADMIN_FEATURE_KEYS = ADMIN_FEATURES.map((f) => f.key);

export type AdminPermissionMap = Record<string, AdminFeatureKey[]>;

function toEmailKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getRootAdminEmails(): Set<string> {
  const configured = String(import.meta.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => toEmailKey(entry))
    .filter((entry): entry is string => Boolean(entry));

  if (configured.length > 0) {
    return new Set(configured);
  }

  // Backward-compatible fallback for legacy deployments.
  return new Set(['admin@flyskyguitar.com']);
}

export function parseAdminPermissionMap(rawValue: unknown): AdminPermissionMap {
  if (!rawValue) return {};

  let parsed: unknown = rawValue;
  if (typeof rawValue === 'string') {
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const out: AdminPermissionMap = {};
  for (const [rawEmail, rawFeatures] of Object.entries(parsed as Record<string, unknown>)) {
    const emailKey = toEmailKey(rawEmail);
    if (!emailKey) continue;

    if (!Array.isArray(rawFeatures)) {
      out[emailKey] = [];
      continue;
    }

    const features = rawFeatures
      .filter((f): f is string => typeof f === 'string')
      .map((f) => f.trim())
      .filter((f): f is AdminFeatureKey => ADMIN_FEATURE_KEYS.includes(f as AdminFeatureKey));

    out[emailKey] = Array.from(new Set(features));
  }

  return out;
}

export function getDefaultFeatureSet(): Set<AdminFeatureKey> {
  return new Set(ADMIN_FEATURE_KEYS);
}

export function isRootAdminEmail(email: unknown): boolean {
  const key = toEmailKey(email);
  if (!key) return false;
  return getRootAdminEmails().has(key);
}

export function enforceRootAdminFullAccess(map: AdminPermissionMap): AdminPermissionMap {
  const out: AdminPermissionMap = { ...map };
  const full = [...ADMIN_FEATURE_KEYS];

  for (const adminEmail of getRootAdminEmails()) {
    out[adminEmail] = full;
  }

  return out;
}

export function getAllowedFeaturesForUser(map: AdminPermissionMap, email: string): Set<AdminFeatureKey> {
  const key = toEmailKey(email);
  if (!key) return getDefaultFeatureSet();

  if (isRootAdminEmail(key)) {
    // Root admins always retain full access regardless of saved map.
    return getDefaultFeatureSet();
  }

  const explicit = map[key];
  if (!explicit) {
    // Missing entry means backward-compatible full access.
    return getDefaultFeatureSet();
  }

  return new Set(explicit);
}

export function hasAdminFeature(map: AdminPermissionMap, email: string, feature: AdminFeatureKey): boolean {
  return getAllowedFeaturesForUser(map, email).has(feature);
}

export function getFeatureForAdminPath(pathname: string): AdminFeatureKey | null {
  if (pathname === '/admin') return 'dashboard';
  if (pathname.startsWith('/admin/pos')) return 'pos';
  if (pathname.startsWith('/admin/media')) return 'media';
  if (pathname.startsWith('/admin/inventory')) return 'inventory';
  if (pathname.startsWith('/admin/orders')) return 'orders';
  if (pathname.startsWith('/admin/shipping')) return 'shipping';
  if (pathname.startsWith('/admin/consultations')) return 'consultations';
  if (pathname.startsWith('/admin/reviews')) return 'reviews';
  if (pathname.startsWith('/admin/blog')) return 'blog';
  if (pathname.startsWith('/admin/brand')) return 'brand';
  if (pathname.startsWith('/admin/reports')) return 'reports';
  if (pathname.startsWith('/admin/seo')) return 'seo';
  if (pathname.startsWith('/admin/newsletter-editor')) return 'newsletter';
  if (pathname.startsWith('/admin/permissions')) return 'permissions';
  if (pathname.startsWith('/admin/activity-log')) return 'activity-log';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  if (pathname.startsWith('/admin/products')) return 'products';

  return null;
}

export function getFeatureForApiPath(pathname: string): AdminFeatureKey | null {
  if (pathname.startsWith('/api/seo/')) return 'seo';
  if (pathname === '/api/get-templates' || pathname.startsWith('/api/templates/')) return 'newsletter';
  if (pathname.startsWith('/api/blog/')) return 'blog';
  if (pathname.startsWith('/api/orders/')) return 'orders';
  if (pathname.startsWith('/api/products/')) return 'products';
  if (pathname.startsWith('/api/settings/') || pathname.startsWith('/api/payment-settings')) return 'settings';
  if (pathname.startsWith('/api/admin/shipping/')) return 'shipping';
  if (pathname.startsWith('/api/admin/reviews/')) return 'reviews';
  if (pathname.startsWith('/api/admin/sessions')) return 'settings';
  if (pathname.startsWith('/api/admin/activity-log')) return 'activity-log';
  if (pathname.startsWith('/api/admin/permissions')) return 'permissions';
  if (pathname.startsWith('/api/admin/users')) return 'permissions';

  return null;
}
