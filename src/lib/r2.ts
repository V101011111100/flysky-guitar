import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Lấy credentials từ biến môi trường
const accountId = import.meta.env.R2_ACCOUNT_ID;
const accessKeyId = import.meta.env.R2_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.R2_SECRET_ACCESS_KEY;
export const bucketName = import.meta.env.R2_BUCKET_NAME || 'flysky';
export const publicUrl = import.meta.env.R2_PUBLIC_URL || `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`;

// Khởi tạo S3 Client kết nối tới R2
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

/**
 * Upload một file (Buffer hoặc File) lên Cloudflare R2
 * @param fileData Dữ liệu file (Buffer hoặc Uint8Array)
 * @param fileName Tên file (bao gồm cả extension)
 * @param contentType Loại MIME của file (VD: 'image/png')
 * @param folder Thư mục trên R2 (mặc định: 'uploads')
 * @returns { url: string, path: string } Đường dẫn ảnh đã upload thành công
 */
export async function uploadToR2(
  fileData: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  folder: string = 'uploads'
) {
  try {
    // R2 không dùng cấu trúc thư mục thực sự, nó là một phần của tên file (Prefix)
    const fileKey = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    console.log(`Bắt đầu upload file ${fileKey} lên R2...`);

    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: fileData,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(uploadParams);
    await r2Client.send(command);

    console.log(`Upload thành công: ${fileKey}`);

    // Trả về full URL để frontend có thể lưu r2 key và public url
    return {
      url: `${publicUrl}/${fileKey}`,
      path: fileKey,
    };
  } catch (error) {
    console.error('Lỗi khi upload lên Cloudflare R2:', error);
    throw error;
  }
}

/**
 * Lấy danh sách tệp từ Cloudflare R2
 * @param prefix Tiền tố (thư mục) để lọc tệp
 */
export async function listR2Files(prefix: string = 'flysky-media/') {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });
    
    const response = await r2Client.send(command);
    
    if (!response.Contents) return [];
    
    return response.Contents.map((item: any) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      url: `${publicUrl}/${item.Key}`,
    }));
  } catch (error) {
    console.error('Lỗi khi lấy danh sách file từ R2:', error);
    throw error;
  }
}

/**
 * Xóa một tệp khỏi Cloudflare R2
 * @param fileKey Key (đường dẫn) của tệp trên R2
 */
export async function deleteFromR2(fileKey: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });
    await r2Client.send(command);
    console.log(`Xóa thành công: ${fileKey}`);
    return true;
  } catch (error) {
    console.error('Lỗi khi xóa file trên R2:', error);
    throw error;
  }
}
