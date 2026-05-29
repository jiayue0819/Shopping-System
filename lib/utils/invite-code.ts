const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 生成 8 位邀请码（仅老板创建店铺时使用） */
export function generateInviteCode(length = 8): string {
  let code = "";
  const random = () => crypto.getRandomValues(new Uint32Array(1))[0]!;

  for (let i = 0; i < length; i++) {
    code += INVITE_CHARS[random() % INVITE_CHARS.length];
  }
  return code;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(normalizeInviteCode(code));
}
