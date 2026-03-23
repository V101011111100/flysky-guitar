CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    reviewer_name VARCHAR(255),
    reviewer_contact VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy (Xem/Đọc): Ai cũng xem được đánh giá đã duyệt
CREATE POLICY "Public reviews are viewable by everyone."
ON public.reviews FOR SELECT
USING ( status = 'approved' );

-- Insert: Ai cũng có thể insert (backend API đã xác thực)
CREATE POLICY "Anyone can insert a review."
ON public.reviews FOR INSERT
WITH CHECK ( true );

-- Admin: UPDATE (duyệt đánh giá)
CREATE POLICY "Authenticated users can update reviews."
ON public.reviews FOR UPDATE
USING ( auth.uid() IS NOT NULL );

-- Admin: DELETE (xoá đánh giá)
CREATE POLICY "Authenticated users can delete reviews."
ON public.reviews FOR DELETE
USING ( auth.uid() IS NOT NULL );

-- Thống kê index
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
