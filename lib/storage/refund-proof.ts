const BUCKET =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET_REFUND ?? "refund-proofs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function getRefundProofBucket() {
  return BUCKET;
}

export function validateRefundProofFile(file: File): string | null {
  if (!file.size) return "请选择退款凭证截图";
  if (file.size > MAX_BYTES) return "图片不能超过 5MB";
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "仅支持 JPG、PNG、WebP、GIF 格式";
  }
  return null;
}

export function buildRefundProofPath(
  shopId: string,
  ownerId: string,
  fileName: string
) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? ext
    : "jpg";
  return `${shopId}/${ownerId}/${Date.now()}.${safeExt}`;
}
