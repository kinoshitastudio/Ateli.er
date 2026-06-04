#!/usr/bin/env node
// generate-channels.js
// Supabase から profiles・channel_connections・public_blocks を取得し
// ch/[handle]/ と ch/[handle]/[channelId]/ に静的シェルHTMLを生成する。
// ブロックのタイトル・説明文をHTMLに含めることでGoogleが本文としてインデックスする。

const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://boaslcfdjdjaryahpged.supabase.co';
const SUPABASE_KEY = 'sb_publishable_063kSonhC4HBJu-Dr3kUaw_4dRD7vPi';
const SITE_URL     = 'https://atelistudio.com';
const DEFAULT_OGP  = `${SITE_URL}/og-image.png`;
const OUT_DIR      = path.join(__dirname, '..', 'ch');

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function fetchJSON(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`fetch error ${res.status}: ${url}`);
  return res.json();
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// payload JSON を解析してテキスト情報を抽出
function extractBlockText(block) {
  let payload = block.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (_) { payload = {}; }
  }
  payload = payload || {};

  const kind = block.kind || payload.kind || '';

  if (kind === 'audio') {
    return {
      kind: 'audio',
      title:   payload.title  || '',
      artist:  payload.artist || '',
      context: payload.context || payload.phrase || '',
      ogImage: payload.ogImage || null,
    };
  }
  if (kind === 'url') {
    return {
      kind: 'url',
      title:   payload.title  || payload.source || '',
      context: payload.description || payload.context || '',
      ogImage: payload.ogImage || null,
    };
  }
  if (kind === 'text') {
    return {
      kind: 'text',
      title:   (payload.text || '').slice(0, 120),
      context: '',
      ogImage: null,
    };
  }
  if (kind === 'image') {
    return {
      kind: 'image',
      title:   payload.caption || payload.title || '',
      context: '',
      ogImage: payload.ogImage || payload.url || null,
    };
  }
  return { kind, title: payload.title || '', context: '', ogImage: payload.ogImage || null };
}

// ユーザープロフィールページ
function buildUserPage({ handle, displayName, avatarUrl, bio, userId, channelCount }) {
  const name      = displayName || handle;
  const title     = `${esc(name)} — Ateli.er`;
  const desc      = esc(bio || `${name}のチャンネル。Ateli.erで音楽・動画・画像をキュレーション。`);
  const ogImage   = avatarUrl || DEFAULT_OGP;
  const canonical = `${SITE_URL}/ch/${handle}/`;
  const redirect  = `${SITE_URL}/#u=${encodeURIComponent(userId)}`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="profile">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:site_name" content="Ateli.er">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(ogImage)}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ProfilePage","name":"${esc(name)}","url":"${esc(canonical)}","mainEntity":{"@type":"Person","name":"${esc(name)}","identifier":"${esc(handle)}"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Ateli.er","item":"${SITE_URL}/"},{"@type":"ListItem","position":2,"name":"${esc(name)}","item":"${esc(canonical)}"}]}
</script>
<style>body{font-family:sans-serif;background:#0e0e0c;color:#c8c5bc;margin:0;padding:2rem;max-width:600px}a{color:#a89060}h1{font-size:1.1rem;font-weight:400;margin-bottom:.5rem}p{font-size:.85rem;opacity:.6;margin-bottom:1.5rem}.redirect{font-size:.75rem;opacity:.4;margin-top:2rem}</style>
</head>
<body>
<h1>${esc(name)}</h1>
${bio ? `<p>${esc(bio)}</p>` : ''}
<p>${channelCount} channel${channelCount !== 1 ? 's' : ''} on <a href="${esc(canonical)}">Ateli.er</a></p>
<p class="redirect">Redirecting to Ateli.er…</p>
<script>location.replace(${JSON.stringify(redirect)});</script>
</body>
</html>`;
}

// チャンネルページ（ブロックテキスト一覧込み）
function buildChannelPage({ handle, displayName, userId, channelId, channelLabel, blocks }) {
  const name      = displayName || handle;
  const title     = `${esc(channelLabel)} by ${esc(name)} — Ateli.er`;

  // ブロックからテキスト抽出
  const blockTexts = blocks.map(extractBlockText);

  // OGP画像: ogImageを持つ最初のブロック
  const ogImage = blockTexts.find(b => b.ogImage)?.ogImage || DEFAULT_OGP;

  // description: タイトル群を連結
  const snippets = blockTexts
    .filter(b => b.title)
    .slice(0, 5)
    .map(b => b.title)
    .join(' / ');
  const desc = esc(snippets
    ? `${channelLabel} — ${snippets}`
    : `${name}のチャンネル「${channelLabel}」。Ateli.erでキュレーションされたコレクション。`);

  const canonical = `${SITE_URL}/ch/${handle}/${channelId}/`;
  const redirect  = `${SITE_URL}/#u=${encodeURIComponent(userId)}`;

  // ブロック一覧HTML
  const blockListHtml = blockTexts.length
    ? `<ul style="list-style:none;padding:0;margin:0">${
        blockTexts.map(b => {
          const sub = [b.artist, b.context].filter(Boolean).join(' — ');
          return `<li style="padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.06)">
  <span style="font-size:.85rem">${esc(b.title || `(${b.kind})`)}</span>${sub ? `<br><span style="font-size:.75rem;opacity:.5">${esc(sub)}</span>` : ''}
</li>`;
        }).join('')
      }</ul>`
    : '<p style="opacity:.4;font-size:.8rem">No public blocks yet.</p>';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Ateli.er">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(ogImage)}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":"${esc(channelLabel)}","description":"${desc}","url":"${esc(canonical)}","author":{"@type":"Person","name":"${esc(name)}","url":"${SITE_URL}/ch/${esc(handle)}/"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Ateli.er","item":"${SITE_URL}/"},{"@type":"ListItem","position":2,"name":"${esc(name)}","item":"${SITE_URL}/ch/${esc(handle)}/"},{"@type":"ListItem","position":3,"name":"${esc(channelLabel)}","item":"${esc(canonical)}"}]}
</script>
<style>body{font-family:sans-serif;background:#0e0e0c;color:#c8c5bc;margin:0;padding:2rem;max-width:600px}a{color:#a89060}h1{font-size:1.1rem;font-weight:400;margin-bottom:.25rem}.by{font-size:.8rem;opacity:.5;margin-bottom:1.5rem}.redirect{font-size:.75rem;opacity:.4;margin-top:2rem}</style>
</head>
<body>
<h1>${esc(channelLabel)}</h1>
<p class="by">by <a href="${SITE_URL}/ch/${esc(handle)}/">${esc(name)}</a> on Ateli.er</p>
${blockListHtml}
<p class="redirect">Redirecting to Ateli.er…</p>
<script>location.replace(${JSON.stringify(redirect)});</script>
</body>
</html>`;
}

// サイトマップ生成
function buildSitemap(urls) {
  const today = new Date().toISOString().slice(0, 10);
  const items = urls.map(u =>
    `  <url>\n    <loc>${esc(u)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

async function main() {
  console.log('Fetching profiles...');
  const profiles = await fetchJSON(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,handle,display_name,avatar_url,bio&order=created_at.asc&limit=500`
  );
  console.log(`  ${profiles.length} profiles found`);

  const sitemapUrls = [];

  // ch/ をクリーン生成
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const p of profiles) {
    const rawHandle = (p.handle || '').replace(/^@+/, '');
    const handle    = rawHandle || p.id.slice(0, 8);
    if (!handle) continue;

    // public_blocks から distinct チャンネル取得（RLSで誰でも読める）
    let allBlocks = [];
    try {
      allBlocks = await fetchJSON(
        `${SUPABASE_URL}/rest/v1/public_blocks?owner_id=eq.${encodeURIComponent(p.id)}&select=channel_id,channel_label&limit=500`
      );
    } catch (e) {
      console.warn(`  blocks list fetch failed for ${handle}:`, e.message);
    }

    // distinct channel_id（channel_label は最初に出てきたものを採用）
    const seen = new Set();
    const channels = [];
    for (const b of allBlocks) {
      if (b.channel_id && !seen.has(b.channel_id)) {
        seen.add(b.channel_id);
        channels.push({ channel_id: b.channel_id, channel_label: b.channel_label });
      }
    }

    // ユーザーページ生成
    writeFile(
      path.join(OUT_DIR, handle, 'index.html'),
      buildUserPage({
        handle,
        displayName:  p.display_name,
        avatarUrl:    p.avatar_url,
        bio:          p.bio,
        userId:       p.id,
        channelCount: channels.length,
      })
    );
    sitemapUrls.push(`${SITE_URL}/ch/${handle}/`);

    // 各チャンネルページ生成
    for (const ch of channels) {
      let blocks = [];
      try {
        blocks = await fetchJSON(
          `${SUPABASE_URL}/rest/v1/public_blocks?owner_id=eq.${encodeURIComponent(p.id)}&channel_id=eq.${encodeURIComponent(ch.channel_id)}&select=kind,payload&order=sort_order.asc.nullslast,ts.asc&limit=50`
        );
      } catch (e) {
        console.warn(`  blocks fetch failed for ${handle}/${ch.channel_id}:`, e.message);
      }

      const label = ch.channel_label || ch.channel_id;
      writeFile(
        path.join(OUT_DIR, handle, ch.channel_id, 'index.html'),
        buildChannelPage({
          handle,
          displayName:  p.display_name,
          userId:       p.id,
          channelId:    ch.channel_id,
          channelLabel: label,
          blocks,
        })
      );
      sitemapUrls.push(`${SITE_URL}/ch/${handle}/${ch.channel_id}/`);
    }

    console.log(`  ✓ ${handle} (${channels.length} channels)`);
  }

  // sitemap-channels.xml
  writeFile(
    path.join(__dirname, '..', 'sitemap-channels.xml'),
    buildSitemap(sitemapUrls)
  );
  console.log(`\nDone. ${sitemapUrls.length} pages generated.`);
}

main().catch(e => { console.error(e); process.exit(1); });
