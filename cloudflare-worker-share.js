// Ateli.er — Share Cloudflare Worker
// Route: atelistudio.com/s?type=block&id=xxx  (or type=user / type=channel)
//
// Strategy: serve OG-tagged HTML to EVERYONE.
// - Search engine bots (Googlebot etc.): no JS redirect → /s URLs get indexed.
// - SNS bots (LINE, iMessage, Notion, Discord, etc.): don't execute JS → OG tags work.
// - Human visitors: JS redirect → SPA opens instantly.

const SUPABASE_URL = 'https://boaslcfdjdjaryahpged.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_063kSonhC4HBJu-Dr3kUaw_4dRD7vPi';
const APP_URL = 'https://atelistudio.com/';
const DEFAULT_OG_IMAGE = 'https://atelistudio.com/og-image.png';

// Search engine bots: skip JS redirect so they index the /s URL itself.
const SEARCH_BOT = /Googlebot|bingbot|DuckDuckBot|YandexBot|Baiduspider|AhrefsBot|SemrushBot/i;

function convertImageUrl(url) {
  if (!url) return '';
  let m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w2000`;
  m = url.match(/[?&]id=([^&]+)/);
  if (m && url.includes('drive.google.com')) return `https://lh3.googleusercontent.com/d/${m[1]}=w2000`;
  return url;
}

// OG image variant: force landscape 1200×630 crop so portrait images fill the
// full width of Twitter/OG summary_large_image cards instead of leaving blank bars.
function convertOgImageUrl(url) {
  if (!url) return '';
  let m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200-h630-c`;
  m = url.match(/[?&]id=([^&]+)/);
  if (m && url.includes('drive.google.com')) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200-h630-c`;
  // lh3 URLs already converted (from previous call) — rewrite the size param
  m = url.match(/^(https:\/\/lh3\.googleusercontent\.com\/d\/[^=]+)/);
  if (m) return `${m[1]}=w1200-h630-c`;
  return url;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sbGet(path) {
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

function buildHtml({ title, description, image, appHash, selfUrl, includeRedirect }) {
  const dest = APP_URL + appHash;
  const redirectScript = includeRedirect
    ? `<script>window.location.replace(${JSON.stringify(dest)});</script>`
    : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="canonical" href="${esc(selfUrl)}">
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
${redirectScript}
</body>
</html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get('user-agent') || '';
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    const ownerId = url.searchParams.get('owner');

    let appHash = '';
    if (type === 'block' && id) {
      appHash = `#b=${encodeURIComponent(id)}`;
    } else if (type === 'user' && id) {
      appHash = `#u=${encodeURIComponent(id)}`;
    } else if (type === 'channel' && ownerId) {
      appHash = id && id !== '_unkn' ? `#ch=${encodeURIComponent(id)}` : '';
    }

    const isSearchBot = SEARCH_BOT.test(ua);
    // selfUrl: request.url is always the atelistudio.com URL in Cloudflare Worker
    const selfUrl = request.url;

    let title = 'Ateli.er';
    let description = '未完成のまま、そっと置いておく場所。';
    let image = DEFAULT_OG_IMAGE;

    if (type === 'block' && id) {
      const rows = await sbGet(`public_blocks?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row) {
        const p = row.payload || {};
        title = p.title || p.caption || `${row.kind} — Ateli.er`;
        description = (p.description || p.text || p.caption || `by @${row.owner_handle || 'artist'} on Ateli.er`).slice(0, 200);
        if (p.ogImage) image = convertOgImageUrl(p.ogImage);
        else if (p.imageUrl) image = convertOgImageUrl(p.imageUrl);
      }
    } else if (type === 'user' && id) {
      const rows = await sbGet(`profiles?id=eq.${encodeURIComponent(id)}&select=handle,bio,avatar_url&limit=1`);
      const profile = Array.isArray(rows) ? rows[0] : null;
      if (profile) {
        const handle = (profile.handle || '').replace(/^@+/, '');
        title = `@${handle} — Ateli.er`;
        description = profile.bio || '未完成のまま、そっと置いておく場所。';
        if (profile.avatar_url) image = convertOgImageUrl(profile.avatar_url);
      }
    } else if (type === 'channel' && ownerId) {
      const pRows = await sbGet(`profiles?id=eq.${encodeURIComponent(ownerId)}&select=handle,bio,avatar_url&limit=1`);
      const profile = Array.isArray(pRows) ? pRows[0] : null;
      const ownerHandle = profile ? (profile.handle || '').replace(/^@+/, '') : 'artist';
      if (profile?.avatar_url) image = convertImageUrl(profile.avatar_url);

      const channelFilter = (!id || id === '_unkn') ? 'channel_id=is.null' : `channel_id=eq.${encodeURIComponent(id)}`;
      const imgRows = await sbGet(
        `public_blocks?${channelFilter}&owner_id=eq.${encodeURIComponent(ownerId)}&kind=eq.image&select=payload,channel_label&limit=1&order=ts.desc`
      );
      const imgRow = Array.isArray(imgRows) ? imgRows[0] : null;
      if (imgRow) {
        const p = imgRow.payload || {};
        if (p.imageUrl) image = convertOgImageUrl(p.imageUrl);
        title = `${imgRow.channel_label || id || 'channel'} — @${ownerHandle} — Ateli.er`;
      } else {
        const anyRows = await sbGet(
          `public_blocks?${channelFilter}&owner_id=eq.${encodeURIComponent(ownerId)}&select=channel_label&limit=1&order=ts.desc`
        );
        const anyRow = Array.isArray(anyRows) ? anyRows[0] : null;
        title = `${anyRow?.channel_label || id || 'channel'} — @${ownerHandle} — Ateli.er`;
      }
      description = '未完成のまま、そっと置いておく場所。';
    }

    return new Response(
      buildHtml({ title, description, image, appHash, selfUrl, includeRedirect: !isSearchBot }),
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': isSearchBot ? 'public, max-age=3600' : 'public, max-age=300',
        },
      }
    );
  },
};
