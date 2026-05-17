// Ateli.er — Share Edge Function
// Serves OG-tagged HTML redirect pages for block / channel / user shares.
// SNS bots (Twitter, Discord, Slack) see correct og:title / og:image / og:description.
// Human visitors are redirected immediately to the SPA with the correct hash.

const SUPABASE_URL = 'https://boaslcfdjdjaryahpged.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_063kSonhC4HBJu-Dr3kUaw_4dRD7vPi';
const APP_URL = 'https://atelistudio.com/';
const DEFAULT_OG_IMAGE = 'https://atelistudio.com/og-image.png';

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
<meta http-equiv="refresh" content="0;url=${esc(dest)}">
<script>window.location.replace(${JSON.stringify(dest)});</script>
</head>
<body style="font-family:monospace;padding:40px;background:#faf8f4;color:#1a1a1a;">
<a href="${esc(dest)}" style="color:#1a1a1a;">${esc(title)} → Ateli.er ↗</a>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  const ownerId = url.searchParams.get('owner');

  let title = 'Ateli.er';
  let description = '未完成のまま、そっと置いておく場所。';
  let image = DEFAULT_OG_IMAGE;
  let appHash = '';

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
      if (p.imageUrl) image = p.imageUrl;
      appHash = `#b=${encodeURIComponent(id)}`;
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
      if (profile.avatar_url) image = profile.avatar_url;
      appHash = `#u=${encodeURIComponent(id)}`;
    }
  } else if (type === 'channel' && id && ownerId) {
    // Fetch the first block for channel label + possible image thumbnail.
    const rows = await sbGet(
      `public_blocks?channel_id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=*&limit=1&order=ts.desc`
    );
    const row = Array.isArray(rows) ? rows[0] as Record<string, unknown> : null;
    if (row) {
      const p = (row.payload as Record<string, string>) || {};
      title = `${row.channel_label || 'channel'} — @${row.owner_handle || 'artist'} — Ateli.er`;
      description = '未完成のまま、そっと置いておく場所。';
      if (p.imageUrl) image = p.imageUrl;
    }
    // Prefer owner avatar over block image for channels.
    const pRows = await sbGet(
      `profiles?id=eq.${encodeURIComponent(ownerId)}&select=avatar_url&limit=1`
    );
    const profile = Array.isArray(pRows) ? pRows[0] as Record<string, string> : null;
    if (profile?.avatar_url) image = profile.avatar_url;
    appHash = `#ch=${encodeURIComponent(id)}`;
  }

  return new Response(
    buildHtml({ title, description, image, appHash, selfUrl: req.url }),
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    }
  );
});
