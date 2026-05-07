# Ateli.er — User Manual (English)

> 日本語版: [USAGE.md](./USAGE.md)

---

## 0. Design Philosophy

- **The app hosts nothing**. All audio/image files live on your own Google Drive / Dropbox / iCloud / any host. Only the URL is pasted into Ateli.er.
- What's stored is **only the catalog (text, URLs, references)**.
- Structure is a two-layer **Block × Channel** model. Block has 4 kinds (audio / image / text / url); Channel groups Blocks by issue or theme.
- **Color scheme:** paper `#DCDBD5` (warm beige) + ink `#1600A2` (deep ink-blue) — Ateli.er's own key palette.

---

## 0a. Login / Signup

On first visit, the **landing screen** is shown.

### Sign up (new account)
1. Click the `Sign up` button (top right)
2. Fill three fields:
   - **invite code**
   - **email** (for magic link delivery)
   - **handle** (display name)
3. Click `— request access` → click the link in your inbox to enter

### Log in (return)
1. Click `Log in` (top right)
2. Enter **email** only
3. Click `— send magic link` → click the link in your inbox

### Settings (the `@handle ⚙` pill bottom-right)
- **avatar URL** — direct image URL (Google Drive / Dropbox share URLs work; ★Google Photos URLs do NOT work★ — see 4-B)
- Edit **handle**
- **email** is read-only
- **log out** (with confirm)

---

## 0b. Cross-Device Sync

Once logged in, your work syncs automatically between PC and iPhone.

- Every action is reflected immediately (no waiting)
- Saved safely in the background
- Logging in on another device pulls in your latest state
- Closing the tab doesn't lose your last edit

---

## 0c. Public / Explore

### Publishing a block
1. Open one of your own blocks → `edit`
2. Tick **`visibility — show on Explore`** → save
3. A `public` ink-blue pill appears on the block head; the channel item list also shows a small `public` mark

### Explore tab
From the **Explore** tab at the top of the modal:
- `— residents` — every user (`@handle` + avatar + joined ago)
- `— public blocks` — 60 most-recent public blocks across users
  - Your own blocks are not shown
  - Each card carries a `— by @handle · age` attribution

---

## 0d. Connecting another user's block

### Flow
1. Explore → click any card in `— public blocks`
2. The block opens in read-only mode
3. Click **`+ connect to my channel`**
4. Pick one of your channels
5. The block now appears in that channel with a **`— by @otherHandle`** attribution
6. Open the block again and click **`— disconnect`** to remove

### Snapshot semantics
- Connecting copies the block's content at that moment
- Even if the original author edits or removes their block, your connected copy stays
- You can disconnect and reconnect freely

---

## 0e. Cross-user Comments + Notifications

### Posting a comment
- Open a block, type in the comment composer, submit
- Comments on your own blocks and on other users' blocks are both recorded

### Receiving notifications
- When another user comments on one of your blocks, **● ink-blue dots** appear in three places:
  1. Next to the `@handle` pill at the top
  2. The **Comment tab** also shows a **●**
  3. The **`— incoming` section** at the top of the Comment tab — each unread row has a small **●**
- Click the **●** in the topbar pill to mark all as read
- Read state is per-device (intentionally — each device keeps its own)

### `— incoming` section
- Lists every cross-user comment on your blocks, newest first
- Click a row to open the source block

### Notification rule for Connected Blocks (by design)
- Comment notifications are pushed **only to the Block's author**. The user who Connected the Block to their own Channel (the curator) does **not** receive push notifications.
- Rationale: Connect is a **curate** gesture, not a claim of ownership. Comments are letters addressed to the author of the work; the curator is not the recipient.
- The curator can still **pull** — opening their own Channel surfaces all comments on Connected Blocks. They just don't get pinged.
- This is an intentional design choice aligned with Atelier's "no algorithm / human signature" principles.

---

## 1. Vocabulary & Data Model

| Term | Meaning |
|---|---|
| **Block** | Smallest unit. Kinds: audio / image / text / url |
| **Channel** | Container that groups Blocks. e.g. `Issue 00`, `Forest & Music`, `Tape Letters` |
| **state** | Channel state. `current` (active) / `future` (unpublished draft) / `past` (archived = read-only) |
| **connectedTo** | Mechanism for a Block to belong to multiple Channels (multi-attach) |
| **trace (footprint / comment)** | Short text comment. Either tied to a track or untethered |

---

## 2. Navigation

| Action | How |
|---|---|
| Open manifesto | Top left `— manifesto` |
| **Return home** | Click the **`Ateli.er` logo** (top left) — closes all modals, returns to top |
| Your channels (4 tabs) | Top right `— traces (n)` |
| **Feed** (chronological stream of all blocks) | **Feed** tab inside the modal |
| Atelier (admin) | Top right `— atelier` ← **Block add/edit/delete here** |
| Block detail | Click on lyric / title / image in the marquee |
| Language toggle | `EN / JP` toggle (top right) |

### Going back

- Top right `← BACK` (now positioned on the LEFT, below the breadcrumb)
- Browser back button (one press = one step)
- Click the logo to skip directly home
- When entered via Feed, also shows `← back to feed` button

---

## 3. Channel Operations

### 3-1. Create a new Channel

`— atelier` → in the upload form, the **`channel`** selector → **`+ create new channel…`**.

Or, from any block's CONNECT widget: **`+ connect to`** → **`+ new channel`** (creates and connects in one step).

| Field | Content |
|---|---|
| label | Channel name (e.g. `Forest & Music`) |
| main phrase | Channel's main phrase (optional) |
| meta | Subtitle (e.g. `now playing`, `winter 2026 · drafts`) |
| lang | `mixed` / `ja` / `en` |

A newly created channel is **`state: current` by default** — ready to receive blocks immediately.

### 3-2. Edit a Channel

1. `— traces (n)` → **Channel** tab
2. Click the channel card → drill in
3. Top right `— edit` → enter edit mode
4. Edit `label` / `main phrase` / `meta` / `lang` / `state`
5. In edit mode, **block ordering** can also be changed (next section)
6. `— save` → confirm popup

### 3-3. Reorder blocks

- Edit mode shows a "block order" section
- Each row has `↑` `↓` buttons
- Clicks are **pending** (not saved immediately)
- `— save` to commit, `— cancel` to discard

### 3-4. Channel `state` (important)

| state | Meaning | Appears in upload selector? |
|---|---|---|
| **current** | Active. Accepts new blocks | ✓ |
| **future** | Draft. Accepts new blocks (shown as upcoming issue) | ✓ |
| **past** | Archive. Read-only. Weathering issues | ✗ (read-only, excluded) |

> ⚠️ If a newly created channel doesn't appear in the upload selector → its **state may be `past`**. Edit the channel and switch to `current` to restore.

### 3-5. Delete a Channel

Drill-in screen, top right **`— all delete`** → confirm popup.

Cascades:
- Blocks whose primary channel is this channel are also deleted
- Other blocks' `connectedTo` references are cleared
- Placeholder (seed) TRACKS are also deleted

### 3-6. Channel search / share

- 🔍 **Search icon**: filter blocks by title/caption/text
- ↑ **Share icon**: copy/share channel URL (`#ch=ID` format) — receiver opens it and lands directly in this channel

### 3-7. Seed Channels (preloaded)

| ID | label (default) | state |
|---|---|---|
| `-01` | Archive −01 | past |
| `00`  | Archive 00 | current |
| `01`  | Archive 01 | future |
| `ch-yoake`  | 夜更けの中庭 | current |
| `ch-studio` | Studio Notes | current |
| `ch-tape`   | Tape Letters | current |

These can be renamed and re-purposed as your own channels. Note: renaming preserves the `state`, so renaming a `past` channel doesn't make it writable.

---

## 4. Adding Blocks (4 kinds)

`— atelier` → choose one of the 4 tabs at top → fill the form → **`↳ place in channel`**.

### A. Audio Link

The core kind. Upload your audio to Drive/Dropbox first.

| Field | Content |
|---|---|
| **channel** | Where to place (state must be current/future) |
| title | Track title |
| artist | Alias |
| **audio url** | Share URL (auto-converted to direct link) |
| catchphrase | Phrase to drift in the marquee (≤40 chars) |
| tags | Comma-separated tags (auto-lowercased) |
| image url | Optional cover image URL |
| support | PayPal / Buy Me a Coffee URL |

#### Audio URL: hosting & auto-conversion

> ⚠️ **Important: Google Drive cannot serve audio.**
> Drive responses include `Cross-Origin-Resource-Policy: same-site`, which blocks audio playback from other origins (browser-level). CORS allow-list won't help — CORP is the wall. **Use Dropbox.**

##### Dropbox (recommended)
1. Upload → right-click → **Copy link**
   `https://www.dropbox.com/scl/fi/.../song.mp3?rlkey=...&dl=0`
2. Paste it. Internally converted to `dl.dropboxusercontent.com/...?raw=1`

##### iCloud
- iCloud Drive file → Share menu → **Copy link**
- No conversion logic yet. Streaming behavior unverified
- If it fails, switch to Dropbox

##### Direct link (your own server)
- Paste as-is. No conversion needed.

---

### B. Image Link

Movie stills, texture photos, image essays from elsewhere — independent blocks that can drift on their own.

| Field | Content |
|---|---|
| **image url** | Direct image URL (Drive/Dropbox share URLs accepted) |
| caption | Brief description like `berlin, march · wet pavement` |
| source | `photo by ___` / `from ___ article` |

#### Image URL conversion

##### Google Drive
- Input: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- Internal conversion: `https://lh3.googleusercontent.com/d/FILE_ID=w2000`
- Reason: legacy `uc?id=...` is unreliable in `<img>` (redirects, CORS). `lh3.googleusercontent.com` (Drive thumbnailer) is stable.

##### Dropbox
- Input: `https://www.dropbox.com/s/xxx/img.jpg?dl=0`
- Conversion: `https://dl.dropboxusercontent.com/s/xxx/img.jpg?raw=1`

##### Google Photos (★ NOT supported ★)
- Input: shared links like `https://photos.app.goo.gl/...`
- ❌ **Will not work**. Reasons:
  - Share link points to a viewer page, not the image itself
  - No public API to derive a stable direct image URL
  - CORS / hotlink protection blocks `<img src>` loading
- **Workaround**: re-upload the image to Drive and use the Drive share link

→ Floats in the main image lane. Click for fullscreen preview.

---

### C. Text

Pure text, not music. Lyric fragments, notes, quotes.

| Field | Content |
|---|---|
| text | ~240 chars |
| style | **lyric** (drifts in phrase lane) / **prose** (channel only) |

- `lyric` → italic in the phrase lane on the home view
- `prose` → not on home view, channel detail only

→ Click opens a text modal with full content.

---

### D. External URL

note articles, Wikipedia, film capture pages, your own other sites.

| Field | Content |
|---|---|
| url | The target URL |
| title | How you want it to read in the courtyard |
| source | `note.com` / personal blog / etc. |

→ Drifts in the phrase lane as `title  source ↗`. Click opens externally in a new tab.

---

## 5. Edit / Delete Blocks

### 5-1. Edit a single block

1. Click the block → Block Modal opens
2. Top right `— edit` → inline edit form
3. `— save` → confirm popup

All fields can be edited. Re-pasted URLs are re-converted.

The audio block's `process` field is **free-form textarea** for the production process (recording environment, atmosphere, decisions).

### 5-2. Delete a single block

1. Block Modal top right `— delete`
2. Confirm popup → OK
3. The block disappears; its trace ties demote to "untethered"

### 5-3. Bulk delete (within Channel drill-in)

1. `— traces` → Channel tab → click the target channel
2. Check the **checkboxes** on the left of each row
3. Click `— delete selected (N)`
4. Confirm popup

### 5-4. Delete an entire channel

Drill-in `— all delete` removes the channel itself and all its blocks. Different from bulk delete to avoid confusion.

---

## 6. Listener Operations (post-publish experience)

### 6-1. Playback

- Click a phrase / title / image in the marquee → **Block Modal** opens with playback
- The bottom player **only appears while audio is playing**. Blocks without `audioUrl` (external links, images) don't show the player
- Player controls: ⏮ play/pause ⏭ ⏹ (SVG icons)
- The player UI is **inverted (ink background + paper text)** for visual contrast

### 6-2. Leave a comment (trace)

**A. Inline (recommended):**
- Block Modal has a `— comments on this block` section with an inline input
- Type → `↳ leave` or Enter → confirm popup → posted
- Works for audio / image / text

**B. Bottom-left slit (PC only):**
- If a track is playing, comment is tied to it
- Hidden on mobile (use inline)

### 6-3. Your channels (4 tabs)

Top right `— traces (n)`:
- **Channel**: grid of your channels
- **Feed**: cross-channel chronological stream (grouped by channel)
- **Comment**: list of your traces (grouped by track)
- **Upload**: new block form + Sync

---

## 7. Where Data Lives

When logged in, your blocks / channels / comments are synced to the cloud (cross-device).
Anything done while logged out (or offline) is held in your browser temporarily, and reconciled with the cloud the next time you sign in.

### Backup
- Migrating to another browser or device just needs you to log in
- For an emergency backup, use **Sync URL** (next section) for a manual export / import

---

## 8. Cross-device Sync (Sync URL — emergency backup)

Manual way to copy data between PC ↔ mobile. The normal cross-device sync (via login) covers most cases; Sync URL is here for emergency backup.

### Use it

**On the source device:**
1. `— atelier` (Upload tab) → top section `— sync to another device`
2. Click `→ generate sync url` → long URL displayed
3. `↳ copy` or `↳ share` to grab the URL
4. Send via AirDrop / email / etc.

**On the target device:**
1. Open the URL in Safari
2. Confirm dialog → OK
3. Current data is overwritten, page reloads
4. Same channels & blocks are now visible

### Caution
- **"Whoever syncs last wins"** — if you edit independently on both devices, one side's changes are lost
- The normal logged-in auto-sync covers daily use; Sync URL is for emergency backup

### Manual paste import

`↳ paste sync url` button in Upload pane to manually paste a URL.

---

## 9. Deep links

Block / channel share URLs are deep-linkable:
- Block: `<...>/Ateli.er/index.html#b=<blockId>`
- Channel: `<...>/Ateli.er/index.html#ch=<channelId>`

Receivers opening the URL automatically land on the corresponding modal/drill-in (250ms delay for app initialization).

---

## 10. Tags

- Tags are **auto-lowercased** on save (`Berlin` / `BERLIN` / `berlin` → all `berlin`)
- Inputs: comma-separated in the `tags` / `context` field
- Tag suggestions in the edit form: click to add, click again to remove (`×` indicator on active tags)
- Bottom phrase lane (Row 3 on home) shows all live `#tags` — click any tag → Tag modal listing all blocks with it

---

## 11. Connect (cross-channel)

A block can belong to multiple channels.
- The first channel is **PRIMARY** and cannot be detached (use × on others)
- `+ connect to` opens a picker showing other channels
- Picker excludes `state: past` channels (read-only)
- `+ new channel` button at the end creates and connects in one step
- Disconnecting an existing connection requires a confirm; toast confirms `${channel} から切断しました`

---

## 12. Known Constraints / Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Drive audio URL doesn't play | Drive's CORP blocks external playback. **Use Dropbox** (spec-level, not bypassable) |
| Drive image URL doesn't load | Legacy `uc?id=` is unstable. Latest version auto-converts to `lh3.googleusercontent.com` |
| Google Photos share URL doesn't load | Photos share links point to a viewer page, not the image. No `<img>` access. **Workaround: re-upload to Drive and use the Drive share link** |
| iCloud URL doesn't play | Move to Drive/Dropbox |
| Marquee stops after reload | iOS Safari battery saver. Scroll/tap to wake |
| Tapping the slit zooms on iPhone | Fixed (16px input font + viewport `user-scalable=no`) |
| Upload fails | localStorage quota. Delete unused blocks from Your Blocks |
| Image won't display | Try opening the URL directly. Some hosts have CORS limits |
| New channel not in upload | state may be `past`. Edit → switch to `current` |

---

## 13. Cheatsheet

```
[Logo click] → home
[— atelier]  → block add
[— traces]   → Channel / Feed / Comment / Upload
[— feed]     → Feed tab directly
[← BACK]     → one step back (browser back also works)

[Add block]
  channel: target (state=current/future only)
  title / artist / catchphrase / tags / image / support / url ...
  ↳ place in channel

[Edit block]   Block Modal → — edit → — save (confirm)
[Delete block] Block Modal → — delete (confirm)
[Share block]  Block Modal → ↑ share (clipboard / Web Share)
[Bulk delete]  Channel drill-in → checkboxes → — delete selected (N)
[Delete channel] Channel drill-in → — all delete

[Edit channel] Channel tab → click card → — edit
  label / main phrase / meta / lang / state
  + block order (↑↓ in edit mode, save to commit)

[Sync] — atelier (Upload) → — sync to another device
  → generate sync url → copy → open on other device

[Connect]
  Block Modal → CONNECT section → + connect to → choose channel or + new channel
  Disconnect: × on non-primary pills → confirm
```

---

> "When a musician used it as their own personal archive, it accidentally became the best medium."
> — kinoshita studio
