// ERD4Dev landing page — presentation interactions, no dependencies.
(() => {
  const menuButton = document.querySelector('#menu-toggle');
  const menu = document.querySelector('#mobile-nav');
  const menuIcon = menuButton.querySelector('use');
  const setMenuOpen = (open) => {
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuIcon.setAttribute('href', open ? '#i-x' : '#i-menu');
    document.body.classList.toggle('menu-open', open);
  };
  menuButton.addEventListener('click', () => setMenuOpen(menu.hidden));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenuOpen(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 920) setMenuOpen(false); });

  const copyButtons = [...document.querySelectorAll('[data-copy-target]')];
  copyButtons.forEach((copyButton) => {
    let restoreTimeout;
    copyButton.addEventListener('click', async () => {
      const element = document.getElementById(copyButton.dataset.copyTarget);
      if (!element) return;
      const command = element.textContent.trim();
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(command);
        } else {
          const input = document.createElement('textarea');
          input.value = command;
          input.style.position = 'fixed'; input.style.opacity = '0';
          document.body.appendChild(input);
          input.select();
          const copied = document.execCommand('copy');
          input.remove();
          if (!copied) throw new Error('Clipboard unavailable');
        }
        copyButton.querySelector('use').setAttribute('href', '#i-check');
        copyButton.querySelector('span').textContent = 'Copied!';
      } catch (_) {
        copyButton.querySelector('span').textContent = 'Select and copy';
      }
      clearTimeout(restoreTimeout);
      restoreTimeout = setTimeout(() => {
        copyButton.querySelector('use').setAttribute('href', '#i-copy');
        copyButton.querySelector('span').textContent = 'Copy';
      }, 2400);
    });
  });

  const year = document.querySelector('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  const versionTargets = [...document.querySelectorAll('[data-package-version]')];
  if (versionTargets.length) {
    const setPackageVersion = (version) => versionTargets.forEach((target) => { target.textContent = version; });
    fetch('https://packagist.org/packages/makermind/erd4dev.json', {
      headers: { Accept: 'application/json' }
    })
      .then((response) => {
        if (!response.ok) throw new Error('Packagist request failed');
        return response.json();
      })
      .then((payload) => {
        const stableVersions = Object.values(payload?.package?.versions || {})
          .map((release) => release.version)
          .filter((version) => /^v?\d+\.\d+\.\d+$/.test(version));
        const latest = stableVersions.sort((left, right) => {
          const a = left.replace(/^v/, '').split('.').map(Number);
          const b = right.replace(/^v/, '').split('.').map(Number);
          return (b[0] - a[0]) || (b[1] - a[1]) || (b[2] - a[2]);
        })[0];
        if (!latest) throw new Error('No stable release found');
        setPackageVersion(latest.startsWith('v') ? latest : `v${latest}`);
      })
      .catch(() => setPackageVersion('latest'));
  }

  const docsReader = document.querySelector('#docs-reader');
  if (docsReader) {
    const docsContent = document.querySelector('#docs-content');
    const docsToc = document.querySelector('#docs-toc');
    const topicGroups = [
      ['Getting started', [['overview', 'Overview'], ['getting-started', 'Installation']]],
      ['Learn the models', [['concepts', 'Conceptual, logical, and physical'], ['entity-relationship', 'Entities and attributes'], ['cardinality', 'Chen and Crow’s Foot'], ['relational-model', 'Tables, keys, and constraints']]],
      ['Build a diagram', [['modeling', 'Editor workflow'], ['relationships', 'Relationship patterns']]],
      ['Import a structure', [['importing', 'Choose an import'], ['import-json', 'JSON structure'], ['import-sql', 'SQL files and dialects'], ['database-connections', 'Database connections']]],
      ['Review and generate', [['review', 'Review the model'], ['regeneration', 'Linked models and regeneration'], ['sql-output', 'Review SQL output'], ['blueprint-drafts', 'Blueprint drafts']]],
      ['Watch the package', [['recordings', 'Recorded walkthroughs'], ['er-menu', 'ER editor: More menu'], ['relational-menu', 'Relational: More menu']]],
      ['Operate the package', [['access-and-safety', 'Access and storage'], ['troubleshooting', 'Troubleshooting']]]
    ];
    docsToc.innerHTML = topicGroups.map(([group, topics]) => `<details class="docs-topic-group" open><summary>${group}</summary><div>${topics.map(([file, title]) => `<a href="docs/${file}.md" data-doc="docs/${file}.md">${title}</a>`).join('')}</div></details>`).join('');
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
    const sectionIds = {
      'Install and open': 'docs-install',
      'Model your domain': 'docs-model',
      'Import an existing structure': 'docs-import',
      'Review and export': 'docs-export',
      'Access outside local development': 'docs-access'
    };
    const slugify = (heading) => sectionIds[heading] || heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const inlineMarkdown = (value) => {
      let html = escapeHtml(value);
      const codeTokens = [];
      html = html.replace(/`([^`]+)`/g, (_, code) => { codeTokens.push(`<code>${code}</code>`); return `@@CODE${codeTokens.length - 1}@@`; });
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[^\s)]+|[a-z-]+\.md)\)/g, (_, label, href) => `<a href="${href.endsWith('.md') && !href.startsWith('http') ? `docs/${href}` : href}"${href.endsWith('.md') && !href.startsWith('http') ? ` data-doc="docs/${href}"` : ''}${href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`);
      return html.replace(/@@CODE(\d+)@@/g, (_, index) => codeTokens[Number(index)]);
    };
    const renderMarkdown = (source) => {
      const lines = source.replace(/\r\n?/g, '\n').split('\n');
      const output = [];
      let paragraph = [];
      let list = null;
      let code = null;
      let table = null;
      const flushParagraph = () => { if (paragraph.length) { output.push(`<p>${paragraph.map(inlineMarkdown).join(' ')}</p>`); paragraph = []; } };
      const closeList = () => { if (list) { output.push(`</${list}>`); list = null; } };
      const closeTable = () => { if (table) { output.push('</tbody></table>'); table = null; } };
      lines.forEach((line) => {
        if (line.startsWith('```')) {
          if (code) { output.push(`<pre><code${code.lang ? ` class="language-${escapeHtml(code.lang)}"` : ''}>${escapeHtml(code.lines.join('\n'))}</code></pre>`); code = null; }
          else { flushParagraph(); closeList(); closeTable(); code = { lang: line.slice(3).trim(), lines: [] }; }
          return;
        }
        if (code) { code.lines.push(line); return; }
        if (!line.trim()) { flushParagraph(); closeList(); closeTable(); return; }
        const recording = line.match(/^!\[([^\]]+)\]\((?:\.\.\/)?(assets\/tutorials\/[a-z-]+\.gif)\)$/);
        if (recording) {
          flushParagraph(); closeList(); closeTable();
          output.push(`<figure class="docs-recording"><a href="${recording[2]}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(recording[1])} — open full size"><img src="${recording[2]}" alt="${escapeHtml(recording[1])}" loading="lazy" width="1120" height="700"></a><figcaption>${escapeHtml(recording[1])} · Click to open full size</figcaption></figure>`);
          return;
        }
        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading) { flushParagraph(); closeList(); closeTable(); const level = heading[1].length; const title = heading[2].trim(); output.push(`<h${level} id="${slugify(title)}">${inlineMarkdown(title)}</h${level}>`); return; }
        if (/^\|?\s*:?-{3,}/.test(line)) return;
        if (line.includes('|')) {
          const cells = line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
          flushParagraph(); closeList();
          if (!table) { table = 'open'; output.push(`<table><thead><tr>${cells.map(cell => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>`); }
          else output.push(`<tr>${cells.map(cell => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`);
          return;
        }
        const unordered = line.match(/^\s*-\s+(.+)$/);
        const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
        if (unordered || ordered) { flushParagraph(); closeTable(); const type = unordered ? 'ul' : 'ol'; if (list && list !== type) closeList(); if (!list) { list = type; output.push(`<${type}>`); } output.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`); return; }
        if (line.startsWith('> ')) { flushParagraph(); closeList(); closeTable(); output.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`); return; }
        closeList(); closeTable(); paragraph.push(line.trim());
      });
      if (code) output.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
      flushParagraph(); closeList(); closeTable();
      return output.join('');
    };
    const renderDocs = (source) => {
      docsContent.innerHTML = renderMarkdown(source);
      docsContent.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => { history.replaceState(null, '', link.getAttribute('href')); }));
      docsContent.querySelectorAll('pre').forEach((pre) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'docs-copy'; button.textContent = 'Copy';
        button.addEventListener('click', async () => { try { await navigator.clipboard.writeText(pre.querySelector('code').textContent); button.textContent = 'Copied'; setTimeout(() => { button.textContent = 'Copy'; }, 1600); } catch (_) { button.textContent = 'Select and copy'; } });
        pre.appendChild(button);
      });
    };
    const topicLinks = [...document.querySelectorAll('[data-doc]')];
    const sourceLink = docsReader.querySelector('.docs-reader-source');
    let activeRequest;
    const loadDoc = async (url) => {
      if (!topicLinks.some((link) => link.dataset.doc === url)) return;
      activeRequest?.abort();
      const request = new AbortController();
      activeRequest = request;
      docsContent.setAttribute('aria-busy', 'true');
      try {
        const response = await fetch(url, { cache: 'no-cache', signal: request.signal });
        if (!response.ok) throw new Error('Documentation topic unavailable');
        const source = await response.text();
        if (request.signal.aborted) return;
        // Keep the existing article in place until its replacement is ready.
        docsContent.style.minHeight = `${docsContent.offsetHeight}px`;
        renderDocs(source);
        topicLinks.forEach((link) => {
          const active = link.dataset.doc === url;
          link.classList.toggle('is-active', active);
          if (active) {
            link.setAttribute('aria-current', 'page');
            const group = link.closest('details');
            if (group) group.open = true;
          } else link.removeAttribute('aria-current');
        });
        if (sourceLink) sourceLink.href = url;
      } catch (error) {
        if (error.name !== 'AbortError') docsContent.innerHTML = `<p>Unable to load this topic here. <a href="${url}">Open the Markdown source</a>.</p>`;
      } finally {
        if (activeRequest === request) docsContent.setAttribute('aria-busy', 'false');
      }
    };
    topicLinks.forEach((link) => link.addEventListener('click', (event) => {
      event.preventDefault();
      loadDoc(link.dataset.doc);
    }));
    docsContent.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-doc]');
      if (!link) return;
      event.preventDefault();
      loadDoc(link.dataset.doc);
    });
    const requestedDoc = new URLSearchParams(window.location.search).get('doc');
    const initialUrl = requestedDoc && topicLinks.some((link) => link.dataset.doc === requestedDoc) ? requestedDoc : docsReader.dataset.markdownUrl;
    loadDoc(initialUrl);
  }

  const revealEls = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 40px 0px' });
    revealEls.forEach((element) => observer.observe(element));
  } else revealEls.forEach((element) => element.classList.add('is-visible'));
})();


// Collaborative cursors: 6 participants simulate building the page on opening.
// Each action reveals actual elements and draws an outline where the cursor "worked".
(() => {
  const html = document.documentElement;
  const overlay = document.getElementById('swarm-overlay');
  if (!overlay || !html.classList.contains('swarm-intro')) return;
  if (!Element.prototype.animate) { html.classList.remove('swarm-intro'); return; }

  const layer = document.getElementById('swarm-pointer-layer');
  const progress = document.getElementById('swarm-progress-fill');
  const counter = document.getElementById('swarm-count');
  const stageText = document.getElementById('swarm-stage-text');
  const skip = document.getElementById('swarm-skip');
  const timers = [];
  const animations = [];
  let stopped = false;
  let cursors = [];
  const TOTAL = 3650;
  overlay.hidden = false;

  const select = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function point(selector, fx = .5, fy = .5) {
    const element = select(selector);
    if (!element) return { x: innerWidth / 2, y: innerHeight / 2 };
    const rect = element.getBoundingClientRect();
    return {
      x: clamp(rect.left + rect.width * fx, 12, innerWidth - 70),
      y: clamp(rect.top + rect.height * fy, 18, innerHeight - 92)
    };
  }
  function screen(x, y) { return { x: innerWidth * x, y: innerHeight * y }; }
  function frame(coords, offset, opacity = 1, angle = 0) {
    return { offset, transform: `translate3d(${Math.round(coords.x)}px,${Math.round(coords.y)}px,0) rotate(${angle}deg)`, opacity, easing: 'cubic-bezier(.22,.75,.18,1)' };
  }
  function queue(callback, delay) { timers.push(setTimeout(() => { if (!stopped) callback(); }, delay)); }
  function trace(selector) {
    const target = select(selector);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || rect.width < 3) return;
    const outline = document.createElement('div');
    outline.className = 'swarm-selection';
    outline.style.left = `${Math.max(4, rect.left)}px`;
    outline.style.top = `${Math.max(4, rect.top)}px`;
    outline.style.width = `${Math.min(rect.width, innerWidth - Math.max(4, rect.left) - 4)}px`;
    outline.style.height = `${Math.min(rect.height, innerHeight - Math.max(4, rect.top) - 4)}px`;
    layer.appendChild(outline);
    queue(() => outline.remove(), 780);
  }
  function clickAt(selector, fx = .35, fy = .45) {
    const pos = point(selector, fx, fy);
    const click = document.createElement('div');
    click.className = 'swarm-click';
    click.style.left = `${pos.x}px`;
    click.style.top = `${pos.y}px`;
    layer.appendChild(click);
    queue(() => click.remove(), 720);
  }
  function show(selectors, primary, index, message) {
    selectors.forEach((selector) => {
      const el = select(selector);
      if (!el) return;
      if (el.closest('.hero-copy')) el.closest('.hero-copy').classList.add('is-visible');
      if (el.matches('.hero-visual')) el.classList.add('is-visible');
      el.classList.add('swarm-assembled');
    });
    if (primary) { trace(primary); clickAt(primary); }
    counter.textContent = `${String(index).padStart(2, '0')} / 06`;
    stageText.textContent = message;
    progress.style.width = `${Math.round(index / 6 * 100)}%`;
  }

  const schemes = [
    { tag:'layout', color:'#6E74F7', start:[-.08,.16], path:[['.announcement',.12,.22,.4],['.site-header',.30,.22,.5],['#hero-title',.59,.15,.4],['.hero-visual',.82,.20,.25]], end:[1.05,.26] },
    { tag:'header', color:'#A0A4FF', start:[1.03,.03], path:[['.site-header',.18,.76,.45],['.hero .eyebrow',.38,.27,.54],['.hero-buttons',.70,.5,.5],['.hero-logo-wrap',.83,.30,.30]], end:[-.06,.88] },
    { tag:'type', color:'#D8D9FF', start:[.3,-.10], path:[['#hero-title',.25,.58,.19],['#hero-title',.42,.78,.72],['.hero-copy > p',.58,.45,.30],['.hero-visual',.84,.50,.65]], end:[.32,1.1] },
    { tag:'components', color:'#9296FA', start:[-.06,.86], path:[['.hero .eyebrow',.23,.8,.6],['#hero-title',.43,.14,.80],['.hero-buttons',.65,.32,.65],['.hero-brand-logo',.87,.74,.55]], end:[1.05,.83] },
    { tag:'database', color:'#FFFFFF', start:[1.05,.76], path:[['.site-header',.24,.55,.70],['.hero-copy > p',.48,.72,.75],['.hero-visual',.75,.65,.32],['.hero-brand-logo',.87,.55,.15]], end:[-.06,.45] },
    { tag:'styles', color:'#B9BBFF', start:[.50,1.06], path:[['.hero .eyebrow',.25,.45,.38],['.hero-copy > p',.52,.13,.7],['.hero-buttons',.67,.84,.45],['.hero-visual',.84,.84,.72]], end:[.8,-.08] }
  ];

  function startCursors() {
    cursors = schemes.map((scheme, index) => {
      const el = document.createElement('div');
      el.className = 'swarm-cursor';
      el.style.setProperty('--cursor-color', scheme.color);
      el.innerHTML = `<svg viewBox="0 0 26 32" aria-hidden="true"><path d="M2 1 L2 26 L9.4 19.4 L14.8 30 L19.4 27.6 L14 17.8 L24.4 15 Z" fill="${scheme.color}" stroke="#020002" stroke-width="2" stroke-linejoin="round"/></svg><span class="swarm-cursor-tag">${scheme.tag}</span>`;
      layer.appendChild(el);
      const frames = [frame(screen(...scheme.start), 0, 0, -12)];
      scheme.path.forEach(([selector, time, x, y], j) => {
        frames.push(frame(point(selector, x, y), time, 1, j % 2 === 0 ? -4 : 5));
      });
      frames.push(frame(screen(...scheme.end), 1, 0, 8));
      const motion = el.animate(frames, {duration:TOTAL, fill:'forwards', easing:'linear', delay: index * 35});
      animations.push(motion);
      return el;
    });
  }

  function finish() {
    if (stopped) return;
    stopped = true;
    timers.forEach(clearTimeout);
    animations.forEach((animation) => animation.cancel());
    html.classList.remove('swarm-intro');
    // Ensures all elements are revealed even if the user skips.
    document.querySelectorAll('.hero-copy.reveal, .hero-visual.reveal').forEach(el => el.classList.add('is-visible'));
    overlay.classList.add('swarm-exiting');
    setTimeout(() => overlay.remove(), 520);
    window.removeEventListener('scroll', finish);
    window.removeEventListener('orientationchange', finish);
  }
  skip.addEventListener('click', finish);
  window.addEventListener('scroll', finish, { passive:true });
  window.addEventListener('orientationchange', finish, { once:true });
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', (event) => { if (event.matches) finish(); }, { once:true });

  try {
    startCursors();
    queue(() => show(['.announcement', '.hero-glow'], '.announcement', 1, 'Creating the base structure...'), 550);
    queue(() => show(['.site-header'], '.site-header', 2, 'Building navigation and identity...'), 970);
    queue(() => show(['.hero .eyebrow', '#hero-title'], '#hero-title', 3, 'Writing the main headline...'), 1420);
    queue(() => show(['.hero-copy > p'], '.hero-copy > p', 4, 'Adding content...'), 1920);
    queue(() => show(['.hero-buttons', '.hero-meta'], '.hero-buttons', 5, 'Connecting actions...'), 2430);
    queue(() => show(['.hero-visual'], '.hero-logo-wrap', 6, 'Positioning the ERD4Dev logo...'), 2870);
    queue(() => select('.hero-brand-logo')?.classList.add('swarm-node-ready'), 3070);
    queue(finish, TOTAL + 250);
  } catch (error) {
    finish();
  }
})();
