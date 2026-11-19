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

  const copyButton = document.querySelector('[data-copy-target]');
  if (copyButton) {
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
  }

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
