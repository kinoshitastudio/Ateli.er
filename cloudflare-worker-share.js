// Ateli.er — Share Cloudflare Worker
// Route: atelistudio.com/s?type=block&id=xxx  (or type=user / type=channel)
// Bots  → OG-tagged HTML (fetches data from Supabase)
// Human → 302 redirect to atelistudio.com/#b=xxx

const SUPABASE_URL = 'https://boaslcfdjdjaryahpged.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_063kSonhC4HBJu-Dr3kUaw_4dRD7vPi';
const APP_URL = 'https://atelistudio.com/';
const DEFAULT_OG_IMAGE = 'https://atelistudio.com/og-image.png';

const BOT_UA = /Twitterbot|facebookexternalhit|Slackbot|Discordbot|LinkedInBot|WhatsApp|TelegramBot|Pinterest|redditbot|Applebot|Googlebot|bingbot|DuckDuckBot/i;

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

function buildHtml({ title, description, image, appHash, selfUrl }) {
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
</head>
<body>
<script>window.location.replace(${JSON.stringify(dest)});</script>
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

    if (!BOT_UA.test(ua)) {
      return Response.redirect(APP_URL + appHash, 302);
    }

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
        description = (p.text || '').slice(0, 200) || p.caption || `by @${row.owner_handle || 'artist'} on Ateli.er`;
        if (p.imageUrl) image = convertOgImageUrl(p.imageUrl);
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
      buildHtml({ title, description, image, appHash, selfUrl }),
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  },
};
