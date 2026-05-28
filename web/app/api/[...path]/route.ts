export const dynamic = 'force-dynamic';

const BACKEND = process.env.MCP_SERVER_URL || 'http://localhost:3100';
const TIMEOUT = 900000; // 15 min

async function handleRequest(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  const url = new URL(req.url);
  const queryStr = url.search;
  const backendUrl = `${BACKEND}/api/${pathStr}${queryStr}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = await req.text();
      (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
    const response = await fetch(backendUrl, fetchOptions);
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const status = (err instanceof Error && err.name === 'AbortError') ? 504 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;
export const PATCH = handleRequest;
