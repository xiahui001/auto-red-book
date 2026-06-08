export type SupabaseAuthHealth = {
  ok: boolean;
  detail: string;
};

const SUPABASE_HEALTH_TIMEOUT_MS = 6000;

export async function getSupabaseAuthHealth(): Promise<SupabaseAuthHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      ok: false,
      detail: "Supabase Auth 环境变量未配置完整"
    };
  }

  let endpoint: URL;
  try {
    endpoint = new URL("/auth/v1/settings", url);
  } catch {
    return {
      ok: false,
      detail: "NEXT_PUBLIC_SUPABASE_URL 不是有效 URL"
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`
      },
      signal: controller.signal
    });
    const text = await response.text();
    const message = parseSupabaseMessage(text);

    if (!response.ok) {
      return {
        ok: false,
        detail: normalizeSupabaseHealthFailure(response.status, message)
      };
    }

    return {
      ok: true,
      detail: "Supabase Auth 在线可用"
    };
  } catch (error) {
    return {
      ok: false,
      detail: `Supabase Auth 在线探测失败：${error instanceof Error ? error.message : "无法连接 Supabase"}`
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseSupabaseMessage(text: string) {
  try {
    const payload = JSON.parse(text) as { message?: unknown; msg?: unknown; error_description?: unknown };
    const message = payload.message || payload.msg || payload.error_description;
    return typeof message === "string" ? message : "";
  } catch {
    return text;
  }
}

function normalizeSupabaseHealthFailure(status: number, message: string) {
  if (/exceed_storage_size_quota/i.test(message)) {
    return "Supabase 项目已恢复但仍被存储配额限制，Auth 暂不可用；请升级套餐、移除 spend cap 或清理 Supabase Storage 后重试";
  }

  if (/service .* restricted/i.test(message)) {
    return `Supabase 项目服务被限制，Auth 暂不可用：${message}`;
  }

  if (/invalid api key|jwt/i.test(message)) {
    return "Supabase Auth key 无效，请检查 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
  }

  return message ? `Supabase Auth 返回 HTTP ${status}：${message}` : `Supabase Auth 返回 HTTP ${status}`;
}
