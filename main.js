// Highlight active nav link based on current page
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === page);
  });

  // Measure nav height for mobile TOC positioning
  const siteNav = document.querySelector('.site-nav');
  if (siteNav) {
    const setNavH = () => document.documentElement.style.setProperty('--nav-h', siteNav.offsetHeight + 'px');
    setNavH();
    window.addEventListener('resize', setNavH);
  }

  // Read page: build TOC and load chapters
  const tocList = document.getElementById('toc-list');
  const chapterContent = document.getElementById('chapter-content');
  const progressBar = document.getElementById('reading-progress');

  // TOC toggle
  const tocToggle = document.getElementById('toc-toggle');
  const tocPanel = document.getElementById('toc-panel');
  const TOC_BREAKPOINT = 1110;
  if (tocToggle && tocPanel) {
    // Auto-collapse on narrow viewports
    if (window.innerWidth <= TOC_BREAKPOINT) {
      tocPanel.classList.add('hidden');
    }
    tocToggle.addEventListener('click', () => {
      tocPanel.classList.toggle('hidden');
    });
  }

  if (tocList && chapterContent) {
    initReader(tocList, chapterContent);

    // Reading progress bar — listen on both reader div and window to cover all layouts
    if (progressBar) {
      const reader = chapterContent.closest('.reader');
      const updateProgress = () => {
        let progress = 0;
        if (reader && reader.scrollHeight > reader.clientHeight) {
          progress = (reader.scrollTop / (reader.scrollHeight - reader.clientHeight)) * 100;
        } else {
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (scrollHeight > 0) progress = (window.scrollY / scrollHeight) * 100;
        }
        progressBar.style.width = Math.min(progress, 100) + '%';
      };
      if (reader) reader.addEventListener('scroll', updateProgress);
      window.addEventListener('scroll', updateProgress);
    }
  }

  // ── Glitch swap effect ──
  document.querySelectorAll('.glitch-swap[data-alt]').forEach(el => {
    const CHANCE = el.dataset.chance !== undefined ? parseFloat(el.dataset.chance) : 1/20;
    if (Math.random() > CHANCE) return;

    const original = el.innerHTML;
    const alt = el.dataset.alt;
    const GLITCH_DUR = 300;

    // Start showing the alt text
    el.innerHTML = alt;

    // After 2s of being visible on screen, glitch into the original
    let visibleTime = 0;
    let lastFrame = null;
    let triggered = false;

    function tick(timestamp) {
      if (triggered) return;

      const rect = el.getBoundingClientRect();
      const onScreen = rect.top < window.innerHeight * 0.8 && rect.bottom > 0;

      if (onScreen) {
        if (lastFrame) visibleTime += timestamp - lastFrame;
        lastFrame = timestamp;
      } else {
        lastFrame = null;
      }

      if (visibleTime >= 1000) {
        triggered = true;
        el.classList.add('glitching');
        setTimeout(() => { el.innerHTML = original; }, 150);
        setTimeout(() => { el.innerHTML = alt; }, 300);
        setTimeout(() => { el.innerHTML = original; }, 450);
        setTimeout(() => { el.innerHTML = alt; }, 500);
        setTimeout(() => {
          el.innerHTML = original;
          el.classList.remove('glitching');
        }, GLITCH_DUR + 350);
        return;
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
});

async function initReader(tocList, chapterContent) {
  // Build TOC entirely from chapters.json — no probing, no pre-fetching
  let data = { parts: {}, chapters: [] };
  try {
    const res = await fetch('chapters/chapters.json');
    if (res.ok) data = await res.json();
  } catch { /* no metadata file */ }

  const partConfig = data.parts || {};

  const chapters = (data.chapters || []).map(ch => {
    // Determine part from explicit meta, or auto-assign from part ranges
    let part = ch.part || 1;
    if (!ch.part && partConfig) {
      for (const [key, cfg] of Object.entries(partConfig)) {
        if (cfg.range && ch.number >= cfg.range[0] && ch.number <= cfg.range[1]) {
          part = Number(key);
          break;
        }
      }
    }
    return {
      part,
      number: ch.number,
      name: ch.name || `Chapter ${ch.number}`,
      tip: ch.tip || '',
      image: ch.image || '',
      file: `GTIchap${ch.number}.docx`
    };
  });

  if (chapters.length === 0) {
    chapterContent.innerHTML = '<p>No chapters found.</p>';
    return;
  }

  // Group by part
  const parts = {};
  chapters.forEach(ch => {
    const key = String(ch.part);
    if (!parts[key]) parts[key] = [];
    parts[key].push(ch);
  });

  // Build TOC
  if (data.book) {
    const bookLi = document.createElement('li');
    bookLi.className = 'toc-book';
    const bookTitle = document.createElement('span');
    bookTitle.textContent = data.book;
    bookLi.appendChild(bookTitle);
    tocList.appendChild(bookLi);
  }

  const sortedPartKeys = Object.keys(parts).sort((a, b) => Number(a) - Number(b));
  let firstLink = null;

  sortedPartKeys.forEach(partKey => {
    const partLi = document.createElement('li');
    partLi.className = 'toc-part';

    const partTitle = document.createElement('span');
    const cfg = partConfig[partKey];
    partTitle.textContent = cfg?.title || `Part ${partKey}`;
    partLi.appendChild(partTitle);

    const chapterUl = document.createElement('ul');

    parts[partKey].forEach(ch => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'toc-link';
      a.innerHTML = `<strong>${ch.number}</strong>&emsp;${escapeHtml(ch.name)}`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
        a.classList.add('active');
        loadChapter(ch, chapterContent, chapters);
      });
      li.appendChild(a);
      chapterUl.appendChild(li);

      if (!firstLink) firstLink = { link: a, chapter: ch };
    });

    partLi.appendChild(chapterUl);
    tocList.appendChild(partLi);
  });

  // No auto-load — wait for user to select a chapter
}

async function loadChapter(chapter, container, chapters) {
  const imageHtml = chapter.image
    ? `<div class="chapter-image-wrap"><img class="chapter-image" src="${escapeAttr(chapter.image)}" alt="" onload="this.classList.add('loaded')"></div>`
    : '';
  const tipHtml = chapter.tip
    ? `<p class="chapter-tip">${escapeHtml(chapter.tip)}</p>`
    : '';
  container.innerHTML = `
    <div class="chapter-header">
      ${imageHtml}
      ${tipHtml}
      <span class="chapter-number">${escapeHtml(String(chapter.number))}</span>
      <span class="chapter-name">${escapeHtml(chapter.name)}</span>
      <hr class="chapter-divider">
    </div>
    <div class="chapter-body-placeholder">
      <p class="reader-loading-dots loading-dots">Loading</p>
    </div>`;

  try {
    const res = await fetch('chapters/' + chapter.file);
    if (!res.ok) throw new Error('Not found');
    const arrayBuffer = await res.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    const temp = document.createElement('div');
    temp.innerHTML = result.value;

    // Auto-extract front matter from the docx HTML:
    // Pattern: [optional image] [optional italic tip] <h1>number</h1> <h1>name</h1> [body...]
    let extractedImage = chapter.image || '';
    let extractedTip = chapter.tip || '';
    let extractedName = chapter.name;

    // Walk leading elements before and including the h1 tags, extract info, remove them
    let foundNumberH1 = false;
    let foundNameH1 = false;
    while (temp.firstElementChild) {
      const el = temp.firstElementChild;
      const tag = el.tagName.toLowerCase();
      const text = el.textContent.trim();

      // Already found both h1s — stop stripping
      if (foundNameH1) break;

      // Remove empty elements
      if (text === '' || text === '\u00a0') { el.remove(); continue; }

      // Image (logo embedded in docx) — extract src if we don't have one from config
      if (tag === 'img' || el.querySelector('img')) {
        if (!extractedImage) {
          const img = tag === 'img' ? el : el.querySelector('img');
          if (img) extractedImage = img.getAttribute('src') || '';
        }
        el.remove();
        continue;
      }

      // Heading — chapter number or chapter name
      if (/^h[1-6]$/.test(tag)) {
        if (!foundNumberH1) {
          foundNumberH1 = true;
        } else {
          extractedName = text;
          foundNameH1 = true;
        }
        el.remove();
        continue;
      }

      // Paragraph before the h1s — likely a tip/epigraph (usually italic)
      if (tag === 'p' && !foundNumberH1) {
        if (!extractedTip) extractedTip = text;
        el.remove();
        continue;
      }

      // If we haven't found the h1s yet, keep stripping unknown front matter
      if (!foundNumberH1) { el.remove(); continue; }

      // Past the number h1 but before the name h1 — skip
      if (foundNumberH1 && !foundNameH1) { el.remove(); continue; }

      break;
    }

    // Replace the loading placeholder with the chapter body, keeping the header
    const placeholder = container.querySelector('.chapter-body-placeholder');
    if (placeholder) {
      const body = document.createElement('div');
      body.className = 'chapter-body chapter-body-fadein';
      body.innerHTML = temp.innerHTML;
      placeholder.replaceWith(body);
      requestAnimationFrame(() => body.classList.add('visible'));
    }

    // CYOA: add interactive choice links for choose-your-own-adventure chapters
    processCYOA(container, chapters);

    // Insert font-size controls at top of chapter
    initFontSizeControls(container);

    // Insert next-chapter button at the bottom
    if (chapters) {
      const idx = chapters.findIndex(c => c.number === chapter.number);
      if (idx >= 0 && idx < chapters.length - 1) {
        const next = chapters[idx + 1];
        const btn = document.createElement('button');
        btn.className = 'next-chapter-btn';
        btn.textContent = `Next: ${next.number} \u2014 ${next.name}`;
        btn.addEventListener('click', () => {
          // Update TOC active state
          document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
          const tocLinks = document.querySelectorAll('.toc-link');
          tocLinks.forEach(l => {
            if (l.querySelector('strong')?.textContent === String(next.number)) {
              l.classList.add('active');
            }
          });
          loadChapter(next, container, chapters);
        });
        container.appendChild(btn);
      }
    }

    container.scrollTop = 0;
    container.closest('.reader')?.scrollTo(0, 0);
  } catch {
    container.innerHTML = '<p class="reader-placeholder">Chapter not available yet.</p>';
  }
}

// ── Font-size adjustment for chapter text ──
const FONT_SIZE_KEY = 'gti-reader-font-size';
const FONT_MIN = 0.8;
const FONT_MAX = 1.8;
const FONT_STEP = 0.05;
const FONT_DEFAULT = 1.065;

function getStoredFontSize() {
  const val = parseFloat(localStorage.getItem(FONT_SIZE_KEY));
  return (val >= FONT_MIN && val <= FONT_MAX) ? val : FONT_DEFAULT;
}

function initFontSizeControls(container) {
  const body = container.querySelector('.chapter-body');
  if (!body) return;

  // Apply stored size
  let size = getStoredFontSize();
  body.style.fontSize = size + 'rem';

  // Remove any existing controls (chapter reload)
  container.querySelector('.font-size-controls')?.remove();

  const bar = document.createElement('div');
  bar.className = 'font-size-controls';

  const btnDec = document.createElement('button');
  btnDec.className = 'font-btn-decrease';
  btnDec.textContent = 'A';
  btnDec.title = 'Decrease font size';

  const label = document.createElement('span');
  label.className = 'font-size-label';
  const pct = () => Math.round((size / FONT_DEFAULT) * 100) + '%';
  label.textContent = pct();

  const btnInc = document.createElement('button');
  btnInc.className = 'font-btn-increase';
  btnInc.textContent = 'A';
  btnInc.title = 'Increase font size';

  const update = (newSize) => {
    size = Math.round(Math.max(FONT_MIN, Math.min(FONT_MAX, newSize)) * 100) / 100;
    body.style.fontSize = size + 'rem';
    label.textContent = pct();
    localStorage.setItem(FONT_SIZE_KEY, size);
  };

  btnDec.addEventListener('click', () => update(size - FONT_STEP));
  btnInc.addEventListener('click', () => update(size + FONT_STEP));

  bar.append(btnDec, label, btnInc);
  container.insertBefore(bar, container.firstChild);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// ── Choose-Your-Own-Adventure interactive links ──
function processCYOA(container, chapters) {
  const body = container.querySelector('.chapter-body');
  if (!body) return;

  const allEls = [...body.querySelectorAll('p')];
  const choicePattern = /^([A-Z])\)\s/;

  // Auto-detect: only activate if there are enough letter+) patterns
  const matchingEls = allEls.filter(el => choicePattern.test(el.textContent.trim()));
  if (matchingEls.length < 5) return;

  // Group by letter
  const byLetter = {};
  matchingEls.forEach(el => {
    const letter = el.textContent.trim().match(choicePattern)[1];
    if (!byLetter[letter]) byLetter[letter] = [];
    byLetter[letter].push(el);
  });

  // For each letter: longest paragraph = content section (anchor), rest = choice links
  for (const [letter, els] of Object.entries(byLetter)) {
    let longest = els[0];
    els.forEach(el => {
      if (el.textContent.length > longest.textContent.length) longest = el;
    });

    longest.id = `choice-${letter}`;
    longest.classList.add('cyoa-anchor');
    // Restore the large section-letter formatting lost in docx→HTML conversion
    // Walk to the first text node (works regardless of mammoth's <em>/<strong> wrapping)
    {
      const walker = document.createTreeWalker(longest, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode();
      if (textNode) {
        const m = textNode.textContent.match(/^([A-Z])\)\s*/);
        if (m) {
          const span = document.createElement('span');
          span.className = 'cyoa-section-letter';
          span.textContent = m[1] + ')';
          const rest = document.createTextNode(' ' + textNode.textContent.slice(m[0].length));
          textNode.parentNode.replaceChild(rest, textNode);
          rest.parentNode.insertBefore(span, rest);
        }
      }
    }

    els.forEach(el => {
      if (el === longest) return;
      el.classList.add('cyoa-choice');
      el.addEventListener('click', () => {
        const target = document.getElementById(`choice-${letter}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.classList.add('cyoa-highlight');
          setTimeout(() => target.classList.remove('cyoa-highlight'), 1500);
        }
      });
    });
  }

  // "GO TO CHAPTER XX" links
  allEls.forEach(el => {
    const match = el.textContent.trim().match(/GO TO CHAPTER (\d+)/i);
    if (!match) return;
    const chapNum = parseInt(match[1]);
    el.classList.add('cyoa-goto');
    el.addEventListener('click', () => {
      const ch = chapters.find(c => c.number === chapNum);
      if (ch) {
        document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.toc-link').forEach(l => {
          if (l.querySelector('strong')?.textContent === String(chapNum)) l.classList.add('active');
        });
        loadChapter(ch, container, chapters);
      }
    });
  });
}

// ── Background asset lazy loader ──
(function lazyLoadBGs() {
  const bgAssets = [
    { selector: '.bg-bottom', src: 'images/bgs/grievelayers/staticgrievebottom.png' },
    { selector: '.bg-sky',    src: 'images/bgs/grievelayers/seamlessskytrans.png' },
    { selector: '.bg-top',    src: 'images/bgs/grievelayers/staticgrievetop.png' },
  ];

  function loadAndDecode(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        if (img.decode) img.decode().then(() => resolve(img)).catch(() => resolve(img));
        else resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  const bgPromises = bgAssets.map(asset => {
    const el = document.querySelector(asset.selector);
    if (!el) return Promise.resolve(null);
    return loadAndDecode(asset.src).then(img => img ? { el, src: asset.src } : null);
  });

  // On index, also preload pariah so it's ready before the fade-in
  const pariahCanvas = document.getElementById('pariah-canvas');
  const pariahPromise = pariahCanvas
    ? loadAndDecode('images/bgs/grievelayers/pariah.png')
    : Promise.resolve(null);

  Promise.all([...bgPromises, pariahPromise]).then(results => {
    const pariahImg = results[results.length - 1];
    const bgResults = results.slice(0, bgPromises.length);

    // Apply backgrounds while still hidden
    bgResults.forEach(r => { if (r) r.el.style.backgroundImage = `url('${r.src}')`; });

    // Wait two frames for browser to composite before revealing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll('.bg-layer').forEach(el => el.classList.add('loaded'));
        setTimeout(() => initPariah(pariahImg), 1000);
        initFireflies();
      });
    });
  });
})();

// ── Pariah apparition (homepage only) ──
function initPariah(img) {
  const canvas = document.getElementById('pariah-canvas');
  if (!canvas || !img) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const CHANCE = 1.0; // 100% for testing — change to 0.03 for 3%

  (function run() {
    if (Math.random() > CHANCE) return;

    // Smaller size (65% of original calc), positioned between 10%-40% of screen height
    const scale = (0.3 + Math.random() * 0.4) * (H * 0.35) / img.height * 0.65;
    const iw = img.width * scale;
    const ih = img.height * scale;

    // Random horizontal flip — natural left is flip=1, facing right is flip=-1
    const flip = Math.random() < 0.5 ? -1 : 1;
    // Movement direction: natural image faces left, so flip=1 → move left, flip=-1 → move right
    const moveDir = -flip;
    const MOVE_SPEED = 15; // pixels per second

    // Start position: between 10% and 40% of screen height, random x
    let posX = Math.random() * (W - iw);
    const minY = H * 0.10;
    const maxY = H * 0.40 - ih;
    let posY = minY + Math.random() * (maxY - minY);

    // Spark particles — half trail behind/around, half rush backward from the tail
    const sparks = [];
    const SPARK_COUNT = 200;
    const behindDir = -moveDir;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const isTailRush = i >= SPARK_COUNT / 2;
      if (isTailRush) {
        // Tail exhaust sparks — shot out backward fast
        sparks.push({
          ox: behindDir * (iw * 0.3 + Math.random() * iw * 0.2),
          oy: (Math.random() - 0.5) * ih * 0.5,
          vx: behindDir * (3 + Math.random() * 5),
          vy: (Math.random() - 0.5) * 1.5,
          r: 0.2 + Math.random() * 0.5,
          life: 0.5 + Math.random() * 0.8,
          color: Math.random() < 0.5
            ? [20, 24, 82]    // midnight blue
            : [230, 225, 240], // pearl
          phase: Math.random() * Math.PI * 2,
          flicker: 6 + Math.random() * 12,
        });
      } else {
        // Ambient sparks around/behind the ship
        const behindSpread = (0.3 + Math.random() * 0.7) * iw * 0.6 * behindDir;
        const vertSpread = (Math.random() - 0.5) * ih * 0.8;
        sparks.push({
          ox: behindSpread + (Math.random() - 0.5) * iw * 0.3,
          oy: vertSpread,
          vx: behindDir * (0.5 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 1,
          r: 0.3 + Math.random() * 0.7,
          life: 0.6 + Math.random() * 0.8,
          color: Math.random() < 0.5
            ? [20, 24, 82]    // midnight blue
            : [230, 225, 240], // pearl
          phase: Math.random() * Math.PI * 2,
          flicker: 4 + Math.random() * 8,
        });
      }
    }

    // Nose position in world space: the leading edge in movement direction
    // moveDir=-1 means moving left → nose is left edge (posX), moveDir=1 → nose is right edge (posX+iw)
    const spawnNoseX = moveDir < 0 ? posX : posX + iw;
    const spawnNoseY = posY + ih / 2;

    // Single sky ripple wave from nose
    const spawnCx = spawnNoseX;
    const spawnCy = spawnNoseY;
    const skyRipple = {
      maxRadius: Math.max(W, H) * 0.9,
      speed: 150, // px per second expansion
    };

    // Portal burst — firework rush of sparks outward from spawn point
    const PORTAL_DURATION = 3.5;
    const portalParticles = [];
    const PORTAL_PARTICLE_COUNT = 150;
    for (let i = 0; i < PORTAL_PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 180; // outward speed — varied for depth
      portalParticles.push({
        angle: angle,
        speed: speed,
        drag: 0.92 + Math.random() * 0.06, // deceleration per frame
        r: 0.3 + Math.random() * 1.0,
        life: 0.5 + Math.random() * 1.0, // how long this spark lives (seconds)
        born: Math.random() * 0.3, // staggered start for burst feel
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 5 + Math.random() * 15, // slight downward drift
        color: Math.random() < 0.3
          ? [140, 130, 200] // lavender
          : Math.random() < 0.5
            ? [20, 24, 82]    // midnight blue
            : [230, 225, 240], // pearl
        flicker: 6 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Small ripple rings near the ship
    const ripples = [];
    for (let i = 0; i < 3; i++) {
      ripples.push({
        ox: (Math.random() - 0.5) * iw * 0.3,
        oy: (Math.random() - 0.5) * ih * 0.3,
        radius: 0,
        maxRadius: Math.max(iw, ih) * (0.5 + Math.random() * 0.5),
        speed: 0.4 + Math.random() * 0.3,
        delay: i * 0.12,
      });
    }

    const FADE_IN = 3.0;
    let startTime = null;

    function draw(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      posX += moveDir * MOVE_SPEED * (1 / 60);

      const cx = posX + iw / 2;
      const cy = posY + ih / 2;

      if (posX < -iw - 100 || posX > W + 100) {
        ctx.clearRect(0, 0, W, H);
        return;
      }

      ctx.clearRect(0, 0, W, H);

      const alpha = Math.min(elapsed / FADE_IN, 1) * 1.0;

      // ── Portal burst at spawn point ──
      if (elapsed < PORTAL_DURATION) {
        const portalAlpha = elapsed < 0.3
          ? elapsed / 0.3
          : elapsed > PORTAL_DURATION - 1
            ? (PORTAL_DURATION - elapsed)
            : 1;

        // Dark core — the rift itself
        const coreRadius = Math.max(iw, ih) * 0.15;
        const coreFade = elapsed > 1.5 ? Math.max(0, 1 - (elapsed - 1.5) / 1.5) : 1;
        if (coreFade > 0) {
          const darkGrad = ctx.createRadialGradient(spawnCx, spawnCy, 0, spawnCx, spawnCy, coreRadius * 3);
          darkGrad.addColorStop(0, `rgba(0, 0, 0, ${coreFade * 1.0})`);
          darkGrad.addColorStop(0.3, `rgba(5, 5, 20, ${coreFade * 0.8})`);
          darkGrad.addColorStop(0.7, `rgba(20, 18, 50, ${coreFade * 0.3})`);
          darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.beginPath();
          ctx.arc(spawnCx, spawnCy, coreRadius * 3, 0, Math.PI * 2);
          ctx.fillStyle = darkGrad;
          ctx.fill();

          // Bright flash at the center on initial burst
          if (elapsed < 0.6) {
            const flashAlpha = (1 - elapsed / 0.6) * 1.0;
            const flashGrad = ctx.createRadialGradient(spawnCx, spawnCy, 0, spawnCx, spawnCy, coreRadius * 1.5);
            flashGrad.addColorStop(0, `rgba(200, 190, 255, ${flashAlpha})`);
            flashGrad.addColorStop(0.5, `rgba(140, 120, 220, ${flashAlpha * 0.4})`);
            flashGrad.addColorStop(1, 'rgba(100, 80, 180, 0)');
            ctx.beginPath();
            ctx.arc(spawnCx, spawnCy, coreRadius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = flashGrad;
            ctx.fill();
          }
        }

        // Firework burst particles rushing outward
        for (const p of portalParticles) {
          const pt = elapsed - p.born;
          if (pt < 0) continue;
          if (pt > p.life + 1.5) continue; // dead spark

          // Position: outward rush with drag and gravity
          const dragFactor = Math.pow(p.drag, pt * 60);
          const px = spawnCx + p.vx * pt * dragFactor;
          const py = spawnCy + p.vy * pt * dragFactor + p.gravity * pt * pt;

          // Fade out as life expires
          const lifeFrac = Math.min(pt / p.life, 1);
          const pAlpha = portalAlpha * (1 - lifeFrac * lifeFrac) * 1.0;
          if (pAlpha <= 0) continue;

          // Flicker
          const flick = Math.sin(pt * p.flicker + p.phase);
          const flickMod = 0.5 + 0.5 * Math.max(0, flick);

          // Sharp spark dot
          ctx.beginPath();
          ctx.arc(px, py, p.r * (1 - lifeFrac * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${pAlpha * flickMod})`;
          ctx.fill();

          // White-hot core on bright sparks
          if (p.color[0] > 150 && p.r > 0.5) {
            ctx.beginPath();
            ctx.arc(px, py, p.r * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${pAlpha * flickMod * 1.0})`;
            ctx.fill();
          }
        }
      }

      // ── Single sky ripple wave from spawn point ──
      {
        const radius = elapsed * skyRipple.speed;
        if (radius < skyRipple.maxRadius) {
          const progress = radius / skyRipple.maxRadius;
          const ripAlpha = (1 - progress) * 0.3;
          if (ripAlpha > 0) {
            ctx.beginPath();
            ctx.arc(spawnCx, spawnCy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(120, 180, 230, ${ripAlpha})`;
            ctx.lineWidth = 2 + (1 - progress) * 5;
            ctx.stroke();
          }
        }
      }

      // ── Draw pariah image with organic nose-to-tail reveal ──
      ctx.save();
      ctx.globalAlpha = Math.min(alpha, 1.0);
      ctx.translate(cx, cy);
      ctx.scale(flip, 1);

      // In flipped space, nose is always at -iw/2 (left), tail at +iw/2 (right)
      const revealFrac = Math.min(elapsed / FADE_IN, 1);
      const revealEdgeX = -iw / 2 + iw * revealFrac;
      const margin = ih * 0.6; // how far the jagged edge extends

      // Build organic clip path with wavering edge
      ctx.beginPath();
      ctx.moveTo(-iw / 2 - 10, -ih / 2 - 20);
      // Straight top to near the reveal edge
      ctx.lineTo(revealEdgeX - margin * 0.3, -ih / 2 - 20);
      // Jagged/organic reveal edge from top to bottom
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = (-ih / 2 - 20) + (ih + 40) * t;
        // Use sin waves at different frequencies seeded by elapsed for organic movement
        const wobble = Math.sin(t * 7.3 + elapsed * 1.2) * margin * 0.25
                     + Math.sin(t * 13.1 + elapsed * 0.8) * margin * 0.15
                     + Math.sin(t * 3.7 + elapsed * 2.0) * margin * 0.1;
        ctx.lineTo(revealEdgeX + wobble, y);
      }
      // Close back along the bottom
      ctx.lineTo(-iw / 2 - 10, ih / 2 + 20);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();

      // ── Glow along the organic reveal edge ──
      if (revealFrac < 1) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(flip, 1);
        const glowAlpha = alpha * (1 - revealFrac * 0.5) * 1.2;
        const glowSpread = ih * 0.35;
        // Draw glow dots along the same wavy edge
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const y = (-ih / 2 - 20) + (ih + 40) * t;
          const wobble = Math.sin(t * 7.3 + elapsed * 1.2) * margin * 0.25
                       + Math.sin(t * 13.1 + elapsed * 0.8) * margin * 0.15
                       + Math.sin(t * 3.7 + elapsed * 2.0) * margin * 0.1;
          const ex = revealEdgeX + wobble;
          const grad = ctx.createRadialGradient(ex, y, 0, ex, y, glowSpread);
          grad.addColorStop(0, `rgba(220, 210, 255, ${glowAlpha * 1.0})`);
          grad.addColorStop(0.3, `rgba(180, 170, 240, ${glowAlpha * 0.5})`);
          grad.addColorStop(1, 'rgba(140, 120, 220, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(ex - glowSpread, y - glowSpread * 0.6, glowSpread * 2, glowSpread * 1.2);
        }
        ctx.restore();
      }

      // ── Tail jet shockwave after reveal completes ──
      if (revealFrac >= 1) {
        const shockElapsed = elapsed - FADE_IN;
        if (shockElapsed < 3) {
          ctx.save();
          // Tail position in world space
          const tailX = cx + (behindDir * iw / 2) * flip;
          const tailY = cy;
          const shockRadius = shockElapsed * 200; // expand fast
          const shockAlpha = Math.max(0, 1 - shockElapsed / 3) * 0.5;

          // V-shaped cone opening behind the ship (like a Mach cone)
          // The cone opens in the behind direction
          const coneAngle = Math.PI * 0.35; // half-angle of the cone
          const coneDir = behindDir < 0 ? Math.PI : 0; // angle pointing behind

          for (let ring = 0; ring < 3; ring++) {
            const r = shockRadius - ring * 30;
            if (r <= 0) continue;
            const rAlpha = shockAlpha * (1 - ring * 0.3);
            if (rAlpha <= 0) continue;

            ctx.beginPath();
            ctx.arc(tailX, tailY, r, coneDir - coneAngle, coneDir + coneAngle);
            ctx.strokeStyle = `rgba(160, 150, 220, ${rAlpha})`;
            ctx.lineWidth = 2 - ring * 0.5;
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // ── Small ripple rings near ship (during fade-in) ──
      if (elapsed < FADE_IN + 1.5) {
        for (const rip of ripples) {
          const rt = elapsed - rip.delay;
          if (rt < 0) continue;
          const progress = Math.min(rt * rip.speed / rip.maxRadius, 1);
          rip.radius = progress * rip.maxRadius;
          const ripAlpha = alpha * (1 - progress) * 0.8;
          if (ripAlpha <= 0) continue;
          ctx.beginPath();
          ctx.arc(cx + rip.ox, cy + rip.oy, rip.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(140, 130, 200, ${ripAlpha})`;
          ctx.lineWidth = 1.5 * (1 - progress);
          ctx.stroke();
        }
      }

      // ── Sharp spark particles trailing behind ship ──
      const sparkFade = elapsed > FADE_IN ? Math.max(0, 1 - (elapsed - FADE_IN) / 8) : 1;
      for (const s of sparks) {
        // Drift sparks away from ship over time
        const driftX = s.vx * elapsed;
        const driftY = s.vy * elapsed;
        const sx = cx + s.ox + driftX;
        const sy = cy + s.oy + driftY;

        // Rapid flicker
        const flick = Math.sin(elapsed * s.flicker + s.phase);
        const flickerMod = 0.4 + 0.6 * Math.max(0, flick);

        const sparkAlpha = alpha * s.life * sparkFade * flickerMod;
        if (sparkAlpha <= 0) continue;

        // Sharp bright core only — no soft glow
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${sparkAlpha})`;
        ctx.fill();

        // Tiny hot center for pearl sparks
        if (s.color[0] > 200 && s.r > 0.4) {
          ctx.beginPath();
          ctx.arc(sx, sy, s.r * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${sparkAlpha * 0.8})`;
          ctx.fill();
        }
      }

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  })();
}

// ── Fireflies (homepage only) ──
function initFireflies() {
  const canvas = document.getElementById('fireflies');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COUNT = 15;
  const flies = [];

  for (let i = 0; i < COUNT; i++) {
    flies.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      r: 1 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.015,
      // Buzzing: rapid small direction changes
      buzzTimer: 0,
      buzzInterval: 30 + Math.random() * 60,  // frames until next direction change
      buzzStrength: 1.5 + Math.random() * 2,
      // Cruising between buzzes
      cruiseVx: (Math.random() - 0.5) * 0.8,
      cruiseVy: (Math.random() - 0.5) * 0.8,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const f of flies) {
      f.buzzTimer++;

      // Periodically pick a new cruise direction (simulates darting)
      if (f.buzzTimer >= f.buzzInterval) {
        f.buzzTimer = 0;
        f.buzzInterval = 30 + Math.random() * 80;
        f.cruiseVx = (Math.random() - 0.5) * f.buzzStrength;
        f.cruiseVy = (Math.random() - 0.5) * f.buzzStrength;
      }

      // Jittery buzz on top of cruise direction
      f.vx += (f.cruiseVx - f.vx) * 0.08 + (Math.random() - 0.5) * 0.6;
      f.vy += (f.cruiseVy - f.vy) * 0.08 + (Math.random() - 0.5) * 0.6;
      f.vx *= 0.95;
      f.vy *= 0.95;
      f.x += f.vx;
      f.y += f.vy;

      // Wrap around edges
      if (f.x < -20) f.x = W + 20;
      if (f.x > W + 20) f.x = -20;
      if (f.y < -20) f.y = H + 20;
      if (f.y > H + 20) f.y = -20;

      // Pulsing glow
      f.phase += f.speed;
      const brightness = 0.3 + 0.7 * ((Math.sin(f.phase) + 1) / 2);
      const alpha = brightness * 0.4;

      // Outer glow
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6);
      grad.addColorStop(0, `rgba(255, 220, 130, ${alpha * 0.6})`);
      grad.addColorStop(0.3, `rgba(255, 200, 80, ${alpha * 0.2})`);
      grad.addColorStop(1, 'rgba(255, 200, 80, 0)');
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 6, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Bright core
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 240, 180, ${alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  draw();
}
