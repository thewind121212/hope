import { NextResponse } from 'next/server';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const FETCH_TIMEOUT = 5000;
const MAX_BODY_SIZE = 1024 * 1024;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BookmarkVault/1.0',
      },
    });
    clearTimeout(id);
    return response;
  } catch {
    clearTimeout(id);
    throw new Error('Fetch timeout');
  }
}

function resolveUrl(raw: string | null, baseUrl: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned) return null;

  // Reduce mixed-content failures when app runs on https.
  const upgraded = cleaned.startsWith('http://')
    ? `https://${cleaned.slice('http://'.length)}`
    : cleaned;

  try {
    return new URL(upgraded, baseUrl).toString();
  } catch {
    return upgraded;
  }
}

function parseMetaTags(html: string): {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
} {
  const metaMap = new Map<string, string>();
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const keyMatch = tag.match(/(?:property|name)=["']([^"']+)["']/i);
    const contentMatch = tag.match(/content=["']([^"']*)["']/i);
    if (!keyMatch || !contentMatch) continue;

    const key = keyMatch[1].trim().toLowerCase();
    const value = contentMatch[1].trim();
    if (!key || !value) continue;

    if (!metaMap.has(key)) {
      metaMap.set(key, value);
    }
  }

  const title =
    metaMap.get('og:title') ??
    metaMap.get('twitter:title') ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
    null;

  const description =
    metaMap.get('og:description') ??
    metaMap.get('twitter:description') ??
    metaMap.get('description') ??
    null;

  const image = metaMap.get('og:image') ?? metaMap.get('twitter:image') ?? null;
  const siteName = metaMap.get('og:site_name') ?? metaMap.get('application-name') ?? null;

  return { title, description, image, siteName };
}

async function extractFavicon(
  html: string,
  url: string
): Promise<string | null> {
  const linkMatch = html.match(
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i
  );
  if (linkMatch && linkMatch[1]) {
    return resolveUrl(linkMatch[1], url);
  }

  try {
    const hostname = new URL(url).hostname;
    return `https://${hostname}/favicon.ico`;
  } catch {
    return null;
  }
}

function truncate(str: string | null, maxLength: number): string | null {
  if (!str) return null;
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter required' },
      { status: 400 }
    );
  }

  if (!isValidUrl(url)) {
    return NextResponse.json(
      { error: 'Invalid URL' },
      { status: 400 }
    );
  }

  try {
    const response = await fetchWithTimeout(url, FETCH_TIMEOUT);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'Not an HTML page' },
        { status: 400 }
      );
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const html = decoder.decode(buffer.slice(0, MAX_BODY_SIZE));

    const { title, description, image, siteName } = parseMetaTags(html);
    const faviconUrl = await extractFavicon(html, url);

    return NextResponse.json({
      faviconUrl,
      siteName: truncate(siteName, 100),
      previewTitle: truncate(title, 200),
      previewDescription: truncate(description, 500),
      ogImageUrl: resolveUrl(image, url),
      lastFetchedAt: Date.now(),
      status: 'success',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    );
  }
}
