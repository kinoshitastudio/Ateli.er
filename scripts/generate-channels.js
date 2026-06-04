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

// Google Drive / Dropbox URL を SNS OGP に使える直接画像 URL に変換
function convertOgImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  // Google Drive: /file/d/[id]/ or open?id=[id]
  const gdriveM = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (gdriveM) return `https://lh3.googleusercontent.com/d/${gdriveM[1]}`;
  // Dropbox shared link → direct download URL
  if (url.includes('dropbox.com')) {
    return url
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace(/[?&]dl=0/, '').replace(/[?&]raw=0/, '');
  }
  return url;
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
      kind:    'audio',
      title:   payload.title  || '',
      artist:  payload.artist || '',
      context: [payload.description, payload.phrase].filter(Boolean).join(' — ') || payload.context || '',
      ogImage: payload.imageUrl || payload.ogImage || null,
    };
  }
  if (kind === 'url') {
    return {
      kind:    'url',
      title:   payload.title  || payload.source || '',
      context: payload.description || payload.context || '',
      ogImage: payload.ogImage || payload.imageUrl || null,
    };
  }
  if (kind === 'text') {
    // payload.text が本文（最大2000文字）、titleがタイトル、descriptionが補足
    const bodyText = [payload.text, payload.description].filter(Boolean).join('\n');
    return {
      kind:    'text',
      title:   payload.title || payload.text || '',
      artist:  payload.context || '',
      context: bodyText,
      ogImage: null,
    };
  }
  if (kind === 'url') {
    return {
      kind:    'url',
      title:   payload.title || payload.source || '',
      artist:  payload.context || payload.source || '',
      context: payload.description || '',
      ogImage: payload.ogImage || payload.imageUrl || null,
    };
  }
  if (kind === 'image') {
    return {
      kind:    'image',
      title:   payload.caption || payload.title || '',
      artist:  payload.context || '',
      context: payload.description || '',
      ogImage: payload.imageUrl || payload.ogImage || payload.url || null,
    };
  }
  return { kind, title: payload.title || '', artist: payload.context || '', context: payload.description || '', ogImage: payload.imageUrl || payload.ogImage || null };
}

// ユーザープロフィールページ
function buildUserPage({ handle, displayName, avatarUrl, bio, userId, channelCount }) {
  const name      = displayName || handle;
  const title     = `${esc(name)} — Ateli.er`;
  const desc      = esc(bio || `${name}のチャンネル。Ateli.erで音楽・動画・画像をキュレーション。`);
  const ogImage   = convertOgImageUrl(avatarUrl) || DEFAULT_OGP;
  const canonical = `${SITE_URL}/ch/${handle}/`;
  const redirect  = `${SITE_URL}/#u=${encodeURIComponent(userId)}`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<script>location.replace(${JSON.stringify(redirect)});</script>
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
</body>
</html>`;
}

// チャンネルページ（ブロックテキスト一覧込み）
function buildChannelPage({ handle, displayName, userId, channelId, channelLabel, mainPhrase, metaLine, blocks }) {
  const name      = displayName || handle;
  const title     = `${esc(channelLabel)} by ${esc(name)} — Ateli.er`;

  // ブロックからテキスト抽出
  const blockTexts = blocks.map(extractBlockText);

  // OGP画像: ogImageを持つ最初のブロック
  const ogImage = convertOgImageUrl(blockTexts.find(b => b.ogImage)?.ogImage) || DEFAULT_OGP;

  // description: mainPhrase優先、なければブロックタイトル群を連結
  const snippets = blockTexts
    .filter(b => b.title)
    .slice(0, 5)
    .map(b => b.title)
    .join(' / ');
  const desc = esc(mainPhrase
    ? mainPhrase.slice(0, 300)
    : (snippets
      ? `${channelLabel} — ${snippets}`
      : `${name}のチャンネル「${channelLabel}」。Ateli.erでキュレーションされたコレクション。`));

  const canonical = `${SITE_URL}/ch/${handle}/${channelId}/`;
  const redirect  = `${SITE_URL}/#ch=${encodeURIComponent(channelId)}`;

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
<script>location.replace(${JSON.stringify(redirect)});</script>
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
<style>body{font-family:sans-serif;background:#0e0e0c;color:#c8c5bc;margin:0;padding:2rem;max-width:600px}a{color:#a89060}h1{font-size:1.1rem;font-weight:400;margin-bottom:.25rem}.by{font-size:.8rem;opacity:.5;margin-bottom:1.5rem}</style>
</head>
<body>
<h1>${esc(channelLabel)}</h1>
<p class="by">by <a href="${SITE_URL}/ch/${esc(handle)}/">${esc(name)}</a> on Ateli.er</p>
${mainPhrase ? `<p style="font-size:.9rem;line-height:1.7;margin-bottom:1.5rem">${esc(mainPhrase)}</p>` : ''}
${metaLine ? `<p style="font-size:.8rem;opacity:.5;margin-bottom:1rem">${esc(metaLine)}</p>` : ''}
${blockListHtml}
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

// ハンドルをURLセーフなスラグに変換
function toSlug(handle) {
  return handle
    .replace(/^@+/, '')
    .replace(/\s+/g, '-')        // スペース → ハイフン
    .replace(/[^\w.\-]/g, '-')   // 英数字・.・- 以外 → ハイフン（日本語等も）
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// スキップすべきチャンネルID
const SKIP_CHANNEL_IDS = new Set(['__new__', '_unkn', '']);

async function main() {
  console.log('Fetching profiles...');
  const profiles = await fetchJSON(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,handle,display_name,avatar_url,bio&order=created_at.asc&limit=500`
  );
  console.log(`  ${profiles.length} profiles found`);

  // channels テーブルからメタデータ（label・main_phrase・meta）を取得
  console.log('Fetching channel metadata...');
  let channelMetaRows = [];
  try {
    channelMetaRows = await fetchJSON(
      `${SUPABASE_URL}/rest/v1/channels?select=id,label,main_phrase,meta,is_public&is_public=eq.true&limit=1000`
    );
  } catch (e) { console.warn('channel meta fetch failed:', e.message); }
  const channelMeta = {};
  for (const r of channelMetaRows) channelMeta[r.id] = r;
  console.log(`  ${channelMetaRows.length} channel meta rows found`);

  const sitemapUrls = [];

  // ch/ をクリーン生成
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const p of profiles) {
    const rawHandle = (p.handle || '').replace(/^@+/, '');
    const slug      = rawHandle ? toSlug(rawHandle) : p.id.slice(0, 8);
    const handle    = slug || p.id.slice(0, 8);
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

    // distinct channel_id（__new__ 等スキップ）
    const seen = new Set();
    const channels = [];
    for (const b of allBlocks) {
      if (b.channel_id && !seen.has(b.channel_id) && !SKIP_CHANNEL_IDS.has(b.channel_id)) {
        seen.add(b.channel_id);
        channels.push({ channel_id: b.channel_id, channel_label: b.channel_label });
      }
    }

    // ユーザーページ生成
    writeFile(
      path.join(OUT_DIR, handle, 'index.html'),
      buildUserPage({
        handle,
        displayName:  p.display_name || rawHandle || handle,
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
      const cmeta = channelMeta[ch.channel_id] || {};
      writeFile(
        path.join(OUT_DIR, handle, ch.channel_id, 'index.html'),
        buildChannelPage({
          handle,
          displayName:  p.display_name || rawHandle || handle,
          userId:       p.id,
          channelId:    ch.channel_id,
          channelLabel: cmeta.label || label,
          mainPhrase:   cmeta.main_phrase || '',
          metaLine:     cmeta.meta || '',
          blocks,
        })
      );
      sitemapUrls.push(`${SITE_URL}/ch/${handle}/${ch.channel_id}/`);
    }

    console.log(`  ✓ ${handle} (raw: ${rawHandle}) — ${channels.length} channels`);
  }

  // プロフィールキャッシュ（owner_id → handle/display_name）
  const profileMap = {};
  for (const p of profiles) {
    const rawH = (p.handle || '').replace(/^@+/, '');
    const slug  = rawH ? toSlug(rawH) : p.id.slice(0, 8);
    profileMap[p.id] = { slug, displayName: p.display_name || rawH };
  }

  // ── ブロック個別ページ (/b/[blockId]/) ──────────────────
  console.log('Generating block pages...');
  const B_DIR = path.join(__dirname, '..', 'b');
  if (fs.existsSync(B_DIR)) fs.rmSync(B_DIR, { recursive: true });
  fs.mkdirSync(B_DIR, { recursive: true });

  let allPublicBlocks = [];
  try {
    allPublicBlocks = await fetchJSON(
      `${SUPABASE_URL}/rest/v1/public_blocks?select=id,kind,payload,owner_id&order=ts.desc&limit=500`
    );
  } catch (e) { console.warn('all blocks fetch failed:', e.message); }

  for (const block of allPublicBlocks) {
    const bt      = extractBlockText(block);
    const owner   = profileMap[block.owner_id] || { slug: block.owner_id?.slice(0, 8) || 'unknown', displayName: 'unknown' };
    const ogImage = convertOgImageUrl(bt.ogImage) || DEFAULT_OGP;
    const title   = bt.title || `(${block.kind})`;
    const desc    = [bt.artist, bt.context].filter(Boolean).join(' — ').slice(0, 200) || `${title} — Ateli.er`;
    const canonical = `${SITE_URL}/b/${block.id}/`;
    const redirect  = `${SITE_URL}/#b=${encodeURIComponent(block.id)}`;

    const blockHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<script>location.replace(${JSON.stringify(redirect)});</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} — Ateli.er</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)} — Ateli.er">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Ateli.er">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)} — Ateli.er">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CreativeWork","name":"${esc(title)}","description":"${esc(desc)}","url":"${esc(canonical)}","author":{"@type":"Person","name":"${esc(owner.displayName)}","url":"${SITE_URL}/ch/${esc(owner.slug)}/"}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Ateli.er","item":"${SITE_URL}/"},{"@type":"ListItem","position":2,"name":"${esc(owner.displayName)}","item":"${SITE_URL}/ch/${esc(owner.slug)}/"},{"@type":"ListItem","position":3,"name":"${esc(title)}","item":"${esc(canonical)}"}]}
</script>
<style>body{font-family:sans-serif;background:#0e0e0c;color:#c8c5bc;margin:0;padding:2rem;max-width:600px}a{color:#a89060}h1{font-size:1.1rem;font-weight:400;margin-bottom:.25rem}.by{font-size:.8rem;opacity:.5;margin-bottom:1rem}.body-text{font-size:.85rem;line-height:1.8;opacity:.8;margin-bottom:1rem;white-space:pre-wrap}</style>
</head>
<body>
<h1>${esc(title)}</h1>
<p class="by">by <a href="${SITE_URL}/ch/${esc(owner.slug)}/">${esc(owner.displayName)}</a> on Ateli.er</p>
${bt.context ? `<p class="body-text">${esc(bt.context)}</p>` : ''}
${bt.artist ? `<p style="font-size:.8rem;opacity:.5">${esc(bt.artist)}</p>` : ''}
</body>
</html>`;

    writeFile(path.join(B_DIR, block.id, 'index.html'), blockHtml);
    sitemapUrls.push(canonical);
  }
  console.log(`  ✓ ${allPublicBlocks.length} block pages generated`);

  // ── Courtyard ページ ──────────────────────────────────────
  console.log('Generating courtyard page...');
  let courtyardBlocks = [];
  try {
    courtyardBlocks = await fetchJSON(
      `${SUPABASE_URL}/rest/v1/public_blocks?select=kind,payload,owner_id&order=ts.desc&limit=60`
    );
  } catch (e) { console.warn('courtyard blocks fetch failed:', e.message); }

  const courtyardItems = courtyardBlocks
    .map(extractBlockText)
    .filter(b => b.title);

  const courtyardListHtml = courtyardItems.length
    ? `<ul style="list-style:none;padding:0;margin:0">${
        courtyardItems.map(b => {
          const sub = [b.artist, b.context].filter(Boolean).join(' — ').slice(0, 120);
          return `<li style="padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="font-size:.85rem">${esc(b.title)}</span>${sub ? `<br><span style="font-size:.75rem;opacity:.5">${esc(sub)}</span>` : ''}</li>`;
        }).join('')
      }</ul>`
    : '';

  const courtyardOgImage = courtyardItems.find(b => b.ogImage)?.ogImage || DEFAULT_OGP;
  const courtyardHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Courtyard — Ateli.er | 木下スタジオ（木下貴博 / 滋賀）</title>
<meta name="description" content="アルゴリズムもタイムラインもない、静かな中庭。誰かが丁寧に選んだ音楽・テキスト・画像が、ただ静かに積み重なっている場所。滋賀・琵琶湖を拠点に木下 貴博（木下スタジオ）が開発したAteli.erのCourtyardへようこそ。">
<meta name="keywords" content="Ateli.er,Courtyard,中庭,アルゴリズムなし,キュレーション,音楽,木下スタジオ,木下貴博,滋賀,琵琶湖,Kinoshita Studio">
<link rel="canonical" href="${SITE_URL}/courtyard/">
<meta property="og:title" content="Courtyard — Ateli.er">
<meta property="og:description" content="アルゴリズムもタイムラインもない、静かな中庭。誰かが丁寧に選んだものが、ただ積み重なっている。">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}/courtyard/">
<meta property="og:image" content="${esc(courtyardOgImage)}">
<meta property="og:site_name" content="Ateli.er">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Courtyard — Ateli.er">
<meta name="twitter:description" content="アルゴリズムもタイムラインもない、静かな中庭。">
<meta name="twitter:image" content="${esc(courtyardOgImage)}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":"Courtyard — Ateli.er","description":"アルゴリズムもタイムラインもない、静かな中庭。誰かが丁寧に選んだ音楽・テキスト・画像が積み重なる場所。","url":"${SITE_URL}/courtyard/","author":{"@type":"Person","name":"木下 貴博","alternateName":"Takahiro Kinoshita","url":"https://kinoshita.studio/about.html","worksFor":{"@type":"Organization","name":"木下スタジオ","url":"https://kinoshita.studio/"}}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Ateli.er","item":"${SITE_URL}/"},{"@type":"ListItem","position":2,"name":"Courtyard","item":"${SITE_URL}/courtyard/"}]}
</script>
<style>body{font-family:sans-serif;background:#0e0e0c;color:#c8c5bc;margin:0;padding:2rem;max-width:640px}a{color:#a89060}h1{font-size:1.1rem;font-weight:400;margin-bottom:.5rem}p{font-size:.85rem;line-height:1.8;margin-bottom:1rem;opacity:.7}.section{margin:2rem 0}.redirect{font-size:.75rem;opacity:.4;margin-top:2rem}</style>
</head>
<body>
<h1>Courtyard — Ateli.er</h1>
<div class="section">
<p>アルゴリズムも、タイムラインも、バズもない。<br>ただ静かに、誰かのチャンネルが並んでいる場所。</p>
<p>音楽の断片、書きかけの文章、ふと撮ったままの写真——未完成のままで置いておける、小さな中庭。キュレーションは、創作だと思う。何を選び、何を並べるか、それ自体が表現だ。</p>
<p>次の投稿を促す通知もなく、エンゲージメントを計測する数字もない。ただ、誰かが丁寧に選んだものが、静かに積み重なっている。琵琶湖のそばで、この中庭を育てている。</p>
<p style="opacity:.5;font-size:.8rem">by 木下 貴博 / <a href="https://kinoshita.studio/">木下スタジオ</a> · 滋賀・琵琶湖</p>
</div>
${courtyardListHtml}
<p class="redirect">Redirecting to Ateli.er Courtyard…</p>
<script>location.replace("${SITE_URL}/#tab=courtyard");</script>
</body>
</html>`;

  writeFile(path.join(__dirname, '..', 'courtyard', 'index.html'), courtyardHtml);
  sitemapUrls.push(`${SITE_URL}/courtyard/`);
  console.log(`  ✓ courtyard (${courtyardItems.length} items)`);

  // ── Explore ページ ────────────────────────────────────────
  console.log('Generating explore page...');
  const exploreUserListHtml = profiles
    .filter(p => (p.handle || '').replace(/^@+/, ''))
    .map(p => {
      const rawH = (p.handle || '').replace(/^@+/, '');
      const slug  = rawH ? toSlug(rawH) : p.id.slice(0, 8);
      const name  = p.display_name || rawH;
      return `<li style="padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.06)"><a href="${SITE_URL}/ch/${esc(slug)}/" style="color:#a89060;text-decoration:none">${esc(name)}</a>${p.bio ? `<br><span style="font-size:.75rem;opacity:.5">${esc(p.bio.slice(0, 80))}</span>` : ''}</li>`;
    }).join('');

  const exploreHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Explore — Ateli.er | 木下スタジオ（木下貴博 / 滋賀）</title>
<meta name="description" content="Ateli.erのユーザーとチャンネルを探索する。アルゴリズムなし、数字なし。感性でつながる静かなキュレーターたちのコレクション。滋賀・木下 貴博（木下スタジオ）開発。">
<meta name="keywords" content="Ateli.er,Explore,キュレーション,音楽,コレクション,木下スタジオ,木下貴博,滋賀,琵琶湖,Kinoshita Studio">
<link rel="canonical" href="${SITE_URL}/explore/">
<meta property="og:title" content="Explore — Ateli.er">
<meta property="og:description" content="感性でつながるキュレーターたちのコレクションを探索する。アルゴリズムなし、数字なし。">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}/explore/">
<meta property="og:image" content="${DEFAULT_OGP}">
<meta property="og:site_name" content="Ateli.er">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Explore — Ateli.er">
<meta name="twitter:description" content="感性でつながるキュレーターたちのコレクションを探索する。">
<meta name="twitter:image" content="${DEFAULT_OGP}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":"Explore — Ateli.er","description":"感性でつながるキュレーターたちのコレクションを探索する。アルゴリズムなし、数字なし。","url":"${SITE_URL}/explore/","author":{"@type":"Person","name":"木下 貴博","alternateName":"Takahiro Kinoshita","url":"https://kinoshita.studio/about.html","worksFor":{"@type":"Organization","name":"木下スタジオ","url":"https://kinoshita.studio/"}}}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Ateli.er","item":"${SITE_URL}/"},{"@type":"ListItem","position":2,"name":"Explore","item":"${SITE_URL}/explore/"}]}
</script>
<style>body{font-family:sans-serif;background:#0e0e0c;color:#c8c5bc;margin:0;padding:2rem;max-width:640px}a{color:#a89060}h1{font-size:1.1rem;font-weight:400;margin-bottom:.5rem}p{font-size:.85rem;line-height:1.8;margin-bottom:1rem;opacity:.7}.section{margin:2rem 0}.redirect{font-size:.75rem;opacity:.4;margin-top:2rem}</style>
</head>
<body>
<h1>Explore — Ateli.er</h1>
<div class="section">
<p>感性でつながるキュレーターたちのコレクション。</p>
<p>いいね数もフォロワー数も前面に出さない。ユーザーが見るのは、他者の数字ではなく、他者の選択そのものだ。音楽でも、動画でも、画像でも、テキストでも——自分が「これだ」と思ったものを、チャンネルに積み上げていく。</p>
<p style="opacity:.5;font-size:.8rem">by 木下 貴博 / <a href="https://kinoshita.studio/">木下スタジオ</a> · 滋賀・琵琶湖</p>
</div>
<ul style="list-style:none;padding:0;margin:0">${exploreUserListHtml}</ul>
<p class="redirect">Redirecting to Ateli.er Explore…</p>
<script>location.replace("${SITE_URL}/#tab=explore");</script>
</body>
</html>`;

  writeFile(path.join(__dirname, '..', 'explore', 'index.html'), exploreHtml);
  sitemapUrls.push(`${SITE_URL}/explore/`);
  console.log(`  ✓ explore (${profiles.length} users)`);

  // sitemap-channels.xml
  writeFile(
    path.join(__dirname, '..', 'sitemap-channels.xml'),
    buildSitemap(sitemapUrls)
  );
  console.log(`\nDone. ${sitemapUrls.length} pages generated.`);
}

main().catch(e => { console.error(e); process.exit(1); });
