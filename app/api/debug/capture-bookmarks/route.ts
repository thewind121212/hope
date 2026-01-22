import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

function isDebugCaptureAllowed(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.DEBUG_CAPTURE_ENABLED !== 'true') return false;
  const host = request.headers.get('host') ?? '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

export async function POST(request: NextRequest) {
  if (!isDebugCaptureAllowed(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const data = await request.json();
    const filePath = join(process.cwd(), 'validator-check', 'bookmarks-captured.json');
    await writeFile(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true, message: 'Data captured' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isDebugCaptureAllowed(request)) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Capturing Bookmarks...</title>
      </head>
      <body>
        <h1>Capturing your bookmarks...</h1>
        <p id="status">Loading...</p>
        <script>
          async function capture() {
            try {
              const raw = localStorage.getItem('bookmark-vault-bookmarks');
              const data = raw ? JSON.parse(raw) : { version: 1, data: [] };

              document.getElementById('status').textContent = 'Sending to server...';

              const response = await fetch('/api/debug/capture-bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });

              if (response.ok) {
                document.getElementById('status').textContent = '✅ Captured! You can close this tab now.';
              } else {
                document.getElementById('status').textContent = '❌ Error capturing data';
              }
            } catch (error) {
              document.getElementById('status').textContent = '❌ ' + error;
            }
          }
          capture();
        </script>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}
