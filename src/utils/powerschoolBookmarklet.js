/**
 * src/utils/powerschoolBookmarklet.js
 *
 * Provides the PowerSchool automated photo macro and draggable browser bookmark.
 * Safely extracts student portraits, packages them in-memory into a single `student_photos.zip`
 * (zero external CDN dependencies, 100% offline & CSP-safe), provides a live floating HUD
 * rendered inside valid frame bodies (bypassing <frameset> display bugs) with progress tracking
 * and an immediate Cancel button.
 */

export const POWERSCHOOL_PHOTO_SCRIPT = `(async function () {
  console.log("PowerSchool Photo Macro starting...");

  function getAllFrames(win, depth = 0, maxDepth = 6, acc = []) {
    acc.push(win);
    if (depth >= maxDepth) return acc;
    let frames;
    try { frames = win.frames; } catch (e) { return acc; }
    for (let i = 0; i < frames.length; i++) {
      try { const child = frames[i]; child.document; getAllFrames(child, depth + 1, maxDepth, acc); } catch (e) { }
    }
    return acc;
  }

  function getUniqueRosterLinks(doc) {
    if (!doc) return [];
    const allA = Array.from(doc.querySelectorAll('a'))
      .filter(a => a.textContent.includes(',') && a.textContent.trim().length > 3 && a.textContent.trim().length < 60);

    const seen = new Set();
    const unique = [];
    for (const a of allA) {
      const cleanName = a.textContent.replace(/default\\s+student\\s+screen/i, '').split('\\n')[0].replace(/\\s+/g, ' ').trim().toLowerCase();
      const frnMatch = (a.href || '').match(/frn=([^&]+)/i);
      const key = frnMatch ? frnMatch[1] : cleanName;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(a);
      }
    }
    return unique;
  }

  const allFrames = getAllFrames(window);
  let menuFrame = null, menuLinks = [];
  for (const f of allFrames) {
    let doc; try { doc = f.document; } catch (e) { continue; }
    const links = getUniqueRosterLinks(doc);
    if (links.length > menuLinks.length) { menuLinks = links; menuFrame = f; }
  }

  // ── Find valid host document (must be a real <BODY>, not a <FRAMESET>) ──
  function getHostDoc() {
    if (menuFrame) {
      try {
        if (menuFrame.document?.body && menuFrame.document.body.tagName === 'BODY') {
          return menuFrame.document;
        }
      } catch (e) {}
    }
    for (const f of allFrames) {
      try {
        if (f.document?.body && f.document.body.tagName === 'BODY') {
          return f.document;
        }
      } catch (e) {}
    }
    try {
      if (document.body && document.body.tagName === 'BODY') return document;
    } catch (e) {}
    return null;
  }

  const hostDoc = getHostDoc();
  let isCancelled = false;
  const collectedPhotos = [];

  // Protect against accidental tab closing or navigation while running
  const topWin = (window.top || window);
  function handleBeforeUnload(e) {
    e.preventDefault();
    e.returnValue = 'Photo download is in progress. Leaving will stop the download.';
    return e.returnValue;
  }
  try {
    topWin.addEventListener('beforeunload', handleBeforeUnload);
  } catch (e) {}

  function cleanupUnload() {
    try {
      topWin.removeEventListener('beforeunload', handleBeforeUnload);
    } catch (e) {}
  }

  // ── Floating Live HUD in Menu Frame ──────────────────────────────────
  let hud = null;
  if (hostDoc && hostDoc.body) {
    const prev = hostDoc.getElementById('ct-ps-hud');
    if (prev) prev.remove();

    hud = hostDoc.createElement('div');
    hud.id = 'ct-ps-hud';
    hud.style.cssText = [
      'position: fixed',
      'top: 6px',
      'left: 6px',
      'right: 6px',
      'z-index: 2147483647',
      'background: #0f172a',
      'color: #f8fafc',
      'padding: 10px 12px',
      'border-radius: 8px',
      'box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.2)',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size: 11px',
      'box-sizing: border-box',
      'line-height: 1.35',
      'transition: all 0.2s ease'
    ].join(';');

    try {
      hostDoc.body.style.paddingTop = '110px';
    } catch (e) {}

    hostDoc.body.appendChild(hud);
  }

  function updateHud({ title, studentName = '', status = '', percent = null, showCancel = true, isDone = false, customActions = null }) {
    // Update browser tab title as a secondary indicator
    try {
      if (percent !== null) {
        (window.top || window).document.title = \`[\${percent}%] 📸 Photo Macro\`;
      } else if (isDone) {
        (window.top || window).document.title = '✅ Photos Done!';
      }
    } catch (e) {}

    if (!hud) return;
    hud.innerHTML = \`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-weight:700;font-size:12px;color:#38bdf8;display:flex;align-items:center;gap:4px;">
          📸 <span>\${title}</span>
        </span>
        \${showCancel ? '<button id="ct-hud-cancel" style="background:#ef4444;color:#ffffff;border:none;border-radius:4px;padding:3px 7px;font-size:10px;font-weight:700;cursor:pointer;">Cancel</button>' : '<button id="ct-hud-close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;">&times;</button>'}
      </div>
      \${studentName ? \`<div style="font-weight:600;color:#f8fafc;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;">\${studentName}</div>\` : ''}
      <div style="color:#94a3b8;font-size:10px;margin-bottom:4px;">\${status}</div>
      \${percent !== null ? \`
        <div style="background:#334155;border-radius:999px;height:5px;overflow:hidden;margin-bottom:4px;">
          <div style="background:#38bdf8;height:100%;width:\${Math.min(100, Math.max(0, percent))}%;transition:width 0.2s ease;"></div>
        </div>
      \` : ''}
      <div id="ct-hud-actions"></div>
    \`;

    const cancelBtn = hud.querySelector('#ct-hud-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        isCancelled = true;
        cancelBtn.disabled = true;
        cancelBtn.innerText = 'Stopping...';
      };
    }

    const closeBtn = hud.querySelector('#ct-hud-close');
    if (closeBtn) closeBtn.onclick = () => { hud.remove(); hud = null; };

    if (customActions) {
      const actionsEl = hud.querySelector('#ct-hud-actions');
      if (actionsEl) customActions(actionsEl);
    }

    if (isDone) {
      setTimeout(() => { if (hud) { hud.style.opacity = '0'; setTimeout(() => hud?.remove(), 400); } }, 9000);
    }
  }

  updateHud({ title: "Photo Macro", status: "Scanning roster...", percent: 5 });

  // ── Pure JS Zero-Dependency ZIP Builder (STORE format for JPEGs) ──
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    return (crc ^ (-1)) >>> 0;
  }

  function buildZipBlob(files) {
    const parts = [];
    const cdEntries = [];
    let offset = 0;

    for (const f of files) {
      const nameBytes = new TextEncoder().encode(f.name);
      const data = f.data;
      const crc = crc32(data);
      const size = data.length;

      // Local Header (30 bytes + name)
      const lh = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0, true);
      lv.setUint16(8, 0, true); // STORE
      lv.setUint32(10, 0, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      parts.push(lh, data);

      // Central Directory Entry (46 bytes + name)
      const cd = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint32(12, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      cdEntries.push(cd);

      offset += lh.length + data.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const c of cdEntries) {
      parts.push(c);
      cdSize += c.length;
    }

    // End of Central Directory (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdOffset, true);
    ev.setUint16(20, 0, true);
    parts.push(eocd);

    return new Blob(parts, { type: 'application/zip' });
  }

  function triggerDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    (hostDoc?.body || document.body).appendChild(a);
    a.click();
    (hostDoc?.body || document.body).removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  // ── Scraper Helpers ───────────────────────────────────────────────
  function getPath(src) {
    try { return new URL(src, location.href).pathname; } catch (e) { return (src || '').split('?')[0]; }
  }
  function isThumb(img) { return /ph_thumb$/i.test(getPath(img.src)); }
  function isFullPhoto(img) { const p = getPath(img.src); return /ph$/i.test(p) && !/ph_thumb$/i.test(p); }

  const EXCLUDE_RE = /iep|alert|icon|logo|flag|badge|warn|spacer|banner/i;
  function isExcludedFallback(img) {
    return EXCLUDE_RE.test(img.alt || '') || EXCLUDE_RE.test(img.src || '') || EXCLUDE_RE.test(img.className || '');
  }

  async function waitForRealPhoto(cf, originalImgs, thumbArea, timeoutMs = 3000, intervalMs = 150) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (isCancelled) return null;
      let doc;
      try { doc = cf.document; } catch (e) { return null; }
      const imgs = Array.from(doc.querySelectorAll('img'));
      const byUrl = imgs.find(img => isFullPhoto(img) && img.complete && img.naturalWidth > 0);
      if (byUrl) return byUrl;
      await new Promise(r => setTimeout(r, intervalMs));
    }
    try {
      const imgs = Array.from(cf.document.querySelectorAll('img'));
      const newOnes = imgs.filter(img => !originalImgs.includes(img) && !isExcludedFallback(img) && img.complete && img.naturalWidth > 0);
      if (newOnes.length > 0) {
        newOnes.sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
        return newOnes[0];
      }
      const candidates = imgs.filter(img => !isExcludedFallback(img) && img.complete && (img.naturalWidth * img.naturalHeight) > thumbArea * 2);
      candidates.sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
      return candidates[0] || null;
    } catch (e) { return null; }
  }

  // ── Adaptive Frame Polling with Student Validation ───────────────
  async function waitForStudentContentFrame(previousId, expectedLastName = '', timeoutMs = 4500, intervalMs = 100) {
    const start = Date.now();
    const cleanLastName = expectedLastName.trim().toLowerCase();
    while (Date.now() - start < timeoutMs) {
      if (isCancelled) return null;
      const frames = getAllFrames(window);
      for (const f of frames) {
        if (f === menuFrame) continue;
        try {
          const bodyText = f.document?.body?.innerText || '';
          const match = bodyText.match(/\\b1\\d{8}\\b/);
          if (!match) continue;
          const currentId = match[0];

          const nameMatches = Boolean(cleanLastName && bodyText.toLowerCase().includes(cleanLastName));

          // If we have a previousId, the frame MUST have transitioned to a new student ID
          // (prevents dropping siblings or consecutive students sharing the same last name)
          const idChanged = previousId ? (currentId !== previousId) : true;

          // For student 0 (no previousId), require name match to avoid reading whatever student
          // was on screen before the bookmarklet started (with a 2s safety fallback)
          const initialValid = !previousId ? (nameMatches || !cleanLastName || (Date.now() - start > 2000)) : true;

          if (idChanged && initialValid) {
            const imgs = f.document?.querySelectorAll('img') || [];
            if (imgs.length > 0) {
              return { frame: f, id: currentId };
            }
          }
        } catch (e) {
          // Frame navigation can throw temporary access errors; retry
        }
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return null;
  }

  if (!menuFrame || menuLinks.length === 0) {
    console.error("No menu frame or student links found.");
    cleanupUnload();
    updateHud({
      title: "Photo Macro",
      status: "❌ No roster found. Navigate to your class roster page.",
      showCancel: false,
      isDone: true
    });
    return;
  }

  console.log(\`Found \${menuLinks.length} student links\`);
  updateHud({
    title: "Photo Macro",
    status: \`Found \${menuLinks.length} students. Starting...\`,
    percent: 8,
    showCancel: true
  });

  const downloadedIds = new Set();
  let skippedDup = 0, failed = 0;
  let lastSeenId = null;

  for (let i = 0; i < menuLinks.length; i++) {
    if (isCancelled) break;

    const links = getUniqueRosterLinks(menuFrame.document);
    const link = links[i] || menuLinks[i];
    if (!link) { failed++; continue; }
    const rawName = link.textContent.trim();
    const name = rawName.replace(/default\\s+student\\s+screen/i, '').split('\\n')[0].replace(/\\s+/g, ' ').trim();
    const lastName = name.includes(',') ? name.split(',')[0].trim() : name.split(' ')[0].trim();
    const pct = Math.round(((i + 1) / menuLinks.length) * 100);

    updateHud({
      title: "Photo Macro",
      studentName: \`[\${i + 1}/\${menuLinks.length}] \${name}\`,
      status: \`\${collectedPhotos.length} photos ready in ZIP\`,
      percent: pct,
      showCancel: true
    });
    console.log(\`\\n[\${i + 1}/\${menuLinks.length}] \${name}\`);

    try {
      link.click();

      // Poll until the frame loads with the new student's data (adaptive, no fixed wait)
      const detected = await waitForStudentContentFrame(lastSeenId, lastName, 4500, 100);
      if (isCancelled) break;

      if (!detected) {
        console.warn(\`  Content frame did not update or student ID not found for \${name}\`);
        failed++;
        continue;
      }

      const cf = detected.frame;
      const studentId = detected.id;
      lastSeenId = studentId;

      console.log(\`  ID: \${studentId}\`);

      if (downloadedIds.has(studentId)) {
        console.log(\`  Already downloaded, skipping\`);
        skippedDup++;
        continue;
      }

      // Small settle buffer to ensure DOM click handlers and layout are stable
      await new Promise(r => setTimeout(r, 150));
      if (isCancelled) break;

      const originalImgs = Array.from(cf.document.querySelectorAll('img'));
      let thumbImg = originalImgs.find(img => isThumb(img));
      if (!thumbImg) thumbImg = originalImgs.find(img => /photo/i.test(img.alt || '') && !isExcludedFallback(img));
      if (!thumbImg) thumbImg = originalImgs.find(img => !isExcludedFallback(img) && img.naturalWidth > 40 && img.naturalHeight > 40);
      if (!thumbImg) {
        console.warn("  No photo thumbnail found");
        failed++;
        continue;
      }

      const thumbArea = thumbImg.naturalWidth * thumbImg.naturalHeight;
      thumbImg.click();
      const larger = await waitForRealPhoto(cf, originalImgs, thumbArea, 3000, 150);
      if (isCancelled) break;

      let finalImg = thumbImg;
      if (larger) finalImg = larger;

      // Fetch photo into ArrayBuffer
      try {
        const resp = await fetch(finalImg.src);
        const arrayBuf = await resp.arrayBuffer();
        collectedPhotos.push({
          name: \`\${studentId}.jpg\`,
          data: new Uint8Array(arrayBuf)
        });
        downloadedIds.add(studentId);
        console.log(\`  Added \${studentId}.jpg to zip package (\${collectedPhotos.length} total)\`);
      } catch (fetchErr) {
        console.error("  Failed to fetch image data:", fetchErr);
        failed++;
      }

      try { cf.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true })); } catch (e) { }
      await new Promise(r => setTimeout(r, 400));

    } catch (e) {
      console.error(\`  Error: \${e.message}\`);
      failed++;
    }
  }

  // ── Handling Cancellation or Completion ───────────────────────────
  cleanupUnload();

  if (isCancelled) {
    if (collectedPhotos.length > 0) {
      updateHud({
        title: "Cancelled",
        status: \`Stopped. \${collectedPhotos.length} photos captured so far.\`,
        showCancel: false,
        isDone: false,
        customActions: (el) => {
          el.innerHTML = \`
            <div style="display:flex;gap:4px;margin-top:4px;">
              <button id="ct-save-partial" style="background:#38bdf8;color:#0f172a;border:none;border-radius:4px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;">Download \${collectedPhotos.length} Photos (ZIP)</button>
              <button id="ct-discard" style="background:#334155;color:#f8fafc;border:none;border-radius:4px;padding:4px 6px;font-size:10px;cursor:pointer;">Close</button>
            </div>
          \`;
          el.querySelector('#ct-save-partial').onclick = () => {
            const blob = buildZipBlob(collectedPhotos);
            triggerDownload(blob, 'student_photos_partial.zip');
            hud?.remove();
          };
          el.querySelector('#ct-discard').onclick = () => {
            hud?.remove();
          };
        }
      });
    } else {
      updateHud({
        title: "Cancelled",
        status: "Stopped. No photos were captured.",
        showCancel: false,
        isDone: true
      });
    }
    return;
  }

  // Finished all students!
  if (collectedPhotos.length > 0) {
    updateHud({
      title: "Packing ZIP...",
      status: \`Packaging \${collectedPhotos.length} photos into student_photos.zip...\`,
      percent: 100,
      showCancel: false
    });

    const zipBlob = buildZipBlob(collectedPhotos);
    triggerDownload(zipBlob, 'student_photos.zip');

    const skippedOrMissing = menuLinks.length - collectedPhotos.length;
    const summaryStatus = skippedOrMissing > 0
      ? \`Downloaded \${collectedPhotos.length} of \${menuLinks.length} photos in student_photos.zip (\${skippedOrMissing} had no photo or were skipped). Drop it into Classroom Tracker.\`
      : \`Downloaded all \${collectedPhotos.length} photos in student_photos.zip! Drop it into Classroom Tracker.\`;

    updateHud({
      title: "All Done! 🎉",
      status: summaryStatus,
      percent: 100,
      showCancel: false,
      isDone: true
    });
  } else {
    updateHud({
      title: "Photo Macro",
      status: \`Completed scan, but no photos could be matched (Failed: \${failed}).\`,
      showCancel: false,
      isDone: true
    });
  }
})();`;

/**
 * Minified javascript: URL suitable for draggable browser bookmarklets.
 */
export const POWERSCHOOL_BOOKMARKLET_HREF = `javascript:${encodeURIComponent(POWERSCHOOL_PHOTO_SCRIPT)}`;

/**
 * Helper to copy text to clipboard with modern navigator.clipboard and fallback.
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Fallback below
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}
