import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 同源代理：浏览器只请求 Vercel 的 https://.../api/backend/*，
 * 由服务端转发到 ANALYZER_BACKEND_URL（可为 http://VPS:3000），避免 Mixed Content。
 */
function upstreamBase(): string | null {
  const u = process.env.ANALYZER_BACKEND_URL?.trim().replace(/\/$/, "");
  return u || null;
}

export async function GET(
  req: NextRequest,
  context: { params: { path: string[] } },
) {
  const base = upstreamBase();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "ANALYZER_BACKEND_URL is not set. Configure it in Vercel (server-side) when using NEXT_PUBLIC_API_BASE_URL=/api/backend",
      },
      { status: 503 },
    );
  }

  const segments = context.params.path ?? [];
  const pathSeg = segments.join("/");
  const target = `${base}/${pathSeg}${req.nextUrl.search}`;

  let res: Response;
  try {
    res = await fetch(target, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch (e) {
    return NextResponse.json(
      { error: `upstream fetch failed: ${String(e)}` },
      { status: 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type":
        res.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}
