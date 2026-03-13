import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Lấy biến môi trường R2 từ process.env (thường Astro đã load .env vào process.env trong môi trường dev/build)
// Bạn cũng có thể dùng import.meta.env nếu dùng Astro env, nhưng process.env phổ biến hơn.
const accountId = process.env.R2_ACCOUNT_ID || import.meta.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID || import.meta.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || import.meta.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || import.meta.env.R2_BUCKET_NAME || 'flysky';

let s3Client: S3Client | null = null;

if (accountId && accessKeyId && secretAccessKey) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file received' }), { status: 400 });
    }

    if (!s3Client) {
      return new Response(JSON.stringify({ success: false, error: 'R2 storage is not configured properly in .env' }), { status: 500 });
    }

    // Tên file ngẫu nhiên để tránh trùng lặp
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const finalName = `flysky-media/products/${timestamp}_${cleanName}`;

    // Lấy array buffer từ file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload lên R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: finalName,
      Body: buffer,
      ContentType: file.type || 'image/webp',
    });

    await s3Client.send(command);

    // Sử dụng R2_PUBLIC_URL đã được cấu hình trong .env
    const publicDomain = process.env.R2_PUBLIC_URL || import.meta.env.R2_PUBLIC_URL || '';
    
    if (!publicDomain) {
      return new Response(JSON.stringify({ success: false, error: 'R2_PUBLIC_URL chưa được cấu hình trong .env' }), { status: 500 });
    }

    let baseUrl = publicDomain.endsWith('/') ? publicDomain.slice(0, -1) : publicDomain;
    const publicUrl = `${baseUrl}/${finalName}`;

    return new Response(JSON.stringify({ success: true, url: publicUrl }), { status: 200 });

  } catch (error: any) {
    console.error('Lỗi upload file R2:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
