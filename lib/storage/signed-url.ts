import { createClient } from "@/lib/supabase/server";
import { getPaymentProofBucket } from "@/lib/storage/payment-proof";
import { getRefundProofBucket } from "@/lib/storage/refund-proof";

async function getStoredSignedUrl(
  storedUrl: string | null,
  bucket: string
): Promise<string | null> {
  if (!storedUrl) return null;

  let path = storedUrl;
  if (storedUrl.startsWith(`${bucket}/`)) {
    path = storedUrl.slice(bucket.length + 1);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** payment_proof_url 存为 bucket/path，解析后生成签名 URL */
export async function getPaymentProofSignedUrl(storedUrl: string | null) {
  return getStoredSignedUrl(storedUrl, getPaymentProofBucket());
}

export async function getRefundProofSignedUrl(storedUrl: string | null) {
  return getStoredSignedUrl(storedUrl, getRefundProofBucket());
}
