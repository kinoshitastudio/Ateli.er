// Ateli.er — Share Edge Function
// Bots (Twitterbot, Discordbot, etc.) get OG-tagged HTML.
// Human browsers get a 302 redirect straight to the SPA.

const SUPABASE_URL = 'https://boaslcfdjdjaryahpged.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_063kSonhC4HBJu-Dr3kUaw_4dRD7vPi';
const APP_URL = 'https://atelistudio.com/';
const DEFAULT_OG_IMAGE = 'https://atelistudio.com/og-image.png';

const BOT_UA = /Twitterbot|facebookexternalhit|Slackbot|Discordbot|LinkedInBot|WhatsApp|TelegramBot|Pinterest|redditbot|Applebot|Googlebot|bingbot|DuckDuckBot/i;

// Same conversion logic as the client-side convertImageUrl().
function convertImageUrl(url: string): string {
  if (!url) return '';
  let m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w2000`;
  m = url.match(/[?&]id=([^&]+)/);
  if (m && url.includes('drive.google.com')) return `https://lh3.googleusercontent.com/d/${m[1]}=w2000`;
  return url;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sbGet(path: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildHtml(opts: {
  title: string;
  description: string;
  image: string;
  appHash: string;
  selfUrl: string;
}): string {
  const { title, description, image, appHash, selfUrl } = opts;
  const dest = APP_URL + appHash;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(selfUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ateli.er">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;background:#faf8f4;color:#1a1a1a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{max-width:420px;width:100%;text-align:center}
.logo{font-family:Georgia,serif;font-size:13px;letter-spacing:.18em;color:#888;margin-bottom:24px}
.title{font-size:20px;font-weight:500;line-height:1.4;margin-bottom:8px;color:#1a1a1a}
.desc{font-size:13px;color:#888;margin-bottom:32px;line-height:1.5}
.btn{display:inline-block;padding:12px 28px;border:1px solid #1a1a1a;color:#1a1a1a;text-decoration:none;font-size:13px;letter-spacing:.06em;transition:background .15s,color .15s}
.btn:hover{background:#1a1a1a;color:#faf8f4}
.hint{margin-top:16px;font-size:11px;color:#aaa;letter-spacing:.04em}
</style>
</head>
<body>
<div class="card">
  <p class="logo">Ateli.er</p>
  <p class="title">${esc(title)}</p>
  <p class="desc">${esc(description)}</p>
  <a href="${esc(dest)}" class="btn">Open in Ateli.er →</a>
  <p class="hint">redirecting…</p>
</div>
<script>window.location.replace(${JSON.stringify(dest)});</script>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const ua = req.headers.get('user-agent') || '';
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  const ownerId = url.searchParams.get('owner');

  // Compute app hash (needed for both bot and human paths).
  let appHash = '';
  if (type === 'block' && id) {
    appHash = `#b=${encodeURIComponent(id)}`;
  } else if (type === 'user' && id) {
    appHash = `#u=${encodeURIComponent(id)}`;
  } else if (type === 'channel' && ownerId) {
    appHash = id && id !== '_unkn' ? `#ch=${encodeURIComponent(id)}` : '';
  }

  // Human browsers: 302 straight to the SPA — no HTML rendering issues.
  if (!BOT_UA.test(ua)) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': APP_URL + appHash },
    });
  }

  // Bots: build OG-tagged HTML.
  const selfUrl = `https://boaslcfdjdjaryahpged.supabase.co/functions/v1/share?${url.searchParams.toString()}`;

  let title = 'Ateli.er';
  let description = '未完成のまま、そっと置いておく場所。';
  let image = DEFAULT_OG_IMAGE;

  if (type === 'block' && id) {
    const rows = await sbGet(
      `public_blocks?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
    );
    const row = Array.isArray(rows) ? rows[0] as Record<string, unknown> : null;
    if (row) {
      const p = (row.payload as Record<string, string>) || {};
      title = p.title || p.caption || `${row.kind} — Ateli.er`;
      description = (p.text as string)?.slice(0, 200)
        || p.caption
        || `by @${row.owner_handle || 'artist'} on Ateli.er`;
      if (p.imageUrl) image = convertImageUrl(p.imageUrl);
    }
  } else if (type === 'user' && id) {
    const rows = await sbGet(
      `profiles?id=eq.${encodeURIComponent(id)}&select=handle,bio,avatar_url&limit=1`
    );
    const profile = Array.isArray(rows) ? rows[0] as Record<string, string> : null;
    if (profile) {
      const handle = (profile.handle || '').replace(/^@+/, '');
      title = `@${handle} — Ateli.er`;
      description = profile.bio || '未完成のまま、そっと置いておく場所。';
      if (profile.avatar_url) image = convertImageUrl(profile.avatar_url);
    }
  } else if (type === 'channel' && ownerId) {
    const pRows = await sbGet(
      `profiles?id=eq.${encodeURIComponent(ownerId)}&select=handle,bio,avatar_url&limit=1`
    );
    const profile = Array.isArray(pRows) ? pRows[0] as Record<string, string> : null;
    const ownerHandle = profile ? (profile.handle || '').replace(/^@+/, '') : 'artist';
    if (profile?.avatar_url) image = convertImageUrl(profile.avatar_url);

    const channelFilter = (!id || id === '_unkn')
      ? `channel_id=is.null`
      : `channel_id=eq.${encodeURIComponent(id)}`;
    const imgRows = await sbGet(
      `public_blocks?${channelFilter}&owner_id=eq.${encodeURIComponent(ownerId)}&kind=eq.image&select=payload,channel_label,owner_handle&limit=1&order=ts.desc`
    );
    const imgRow = Array.isArray(imgRows) ? imgRows[0] as Record<string, unknown> : null;
    if (imgRow) {
      const p = (imgRow.payload as Record<string, string>) || {};
      if (p.imageUrl) image = convertImageUrl(p.imageUrl);
      const lbl = (imgRow.channel_label as string) || id || 'channel';
      title = `${lbl} — @${ownerHandle} — Ateli.er`;
    } else {
      const anyRows = await sbGet(
        `public_blocks?${channelFilter}&owner_id=eq.${encodeURIComponent(ownerId)}&select=channel_label,owner_handle&limit=1&order=ts.desc`
      );
      const anyRow = Array.isArray(anyRows) ? anyRows[0] as Record<string, unknown> : null;
      const lbl = (anyRow?.channel_label as string) || id || 'channel';
      title = `${lbl} — @${ownerHandle} — Ateli.er`;
    }
    description = '未完成のまま、そっと置いておく場所。';
  }

  return new Response(
    buildHtml({ title, description, image, appHash, selfUrl }),
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    }
  );
});
