-- Khởi tạo file script để cập nhật tính năng POS, Giảm Giá, và Tồn Kho (Chạy sau khi đã chạy file create_marketing_and_discounts.sql)

-- 1. Bổ sung mã SKU cho bảng sản phẩm
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sku text UNIQUE;

-- 2. Cập nhật bảng Đơn hàng (Orders) để tương thích với POS
-- Khách mua tại quầy không có địa chỉ giao hàng
ALTER TABLE public.orders
ALTER COLUMN shipping_address DROP NOT NULL;

-- Bổ sung các cột phục vụ POS và vận chuyển
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source text DEFAULT 'online', -- 'online' hoặc 'pos'
ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS shipping_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_id uuid REFERENCES public.discounts(id),
ADD COLUMN IF NOT EXISTS discount_code text,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- ==========================================
-- TRIGGERS CHO TỰ ĐỘNG HÓA KHO VÀ GIẢM GIÁ
-- ==========================================

-- 3. Trigger: Tự động trừ kho (Inventory Deduction) khi tạo chi tiết đơn hàng mới
CREATE OR REPLACE FUNCTION public.deduct_inventory()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  -- Trừ số lượng kho của sản phẩm tương ứng với số lượng người dùng mua
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_inventory ON public.order_items;
CREATE TRIGGER trigger_deduct_inventory
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.deduct_inventory();


-- 4. Trigger: Tự động hoàn lại kho (Restore Inventory) nếu đơn hàng bị hủy
CREATE OR REPLACE FUNCTION public.restore_inventory_on_cancel()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  -- Nếu trạng thái chuyển sang 'cancelled' từ một trạng thái khác
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Join với bảng order_items để hoàn lại đúng số lượng của từng món đồ
    UPDATE public.products p
    SET stock_quantity = p.stock_quantity + oi.quantity,
        updated_at = now()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_inventory_status ON public.orders;
DROP TRIGGER IF EXISTS trigger_restore_inventory ON public.orders;

CREATE TRIGGER trigger_restore_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.restore_inventory_on_cancel();


-- 5. Trigger: Tự động cập nhật số lượt sử dụng mã giảm giá
CREATE OR REPLACE FUNCTION public.increment_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu đơn hàng có sử dụng mã giảm giá
  IF NEW.discount_id IS NOT NULL THEN
    UPDATE public.discounts
    SET used_count = used_count + 1
    WHERE id = NEW.discount_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_discount ON public.orders;
CREATE TRIGGER trigger_increment_discount
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.increment_discount_usage();
