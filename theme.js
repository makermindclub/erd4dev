/* Only switches globally between the two themes. Does not modify ERD4Dev features. */
(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!toggle) return;
  const icon = toggle.querySelector('use');
  const apply = (theme) => {
    const light = theme === 'light';
    if (light) root.dataset.theme = 'light';
    else delete root.dataset.theme;
    toggle.setAttribute('aria-pressed', String(light));
    toggle.setAttribute('aria-label', light ? 'Enable dark theme' : 'Enable light theme');
    toggle.setAttribute('title', light ? 'Switch to dark theme' : 'Switch to light theme');
    icon.setAttribute('href', light ? '#i-moon' : '#i-sun');
    if (themeMeta) themeMeta.setAttribute('content', light ? '#f8f9ff' : '#020002');
  };
  apply(root.dataset.theme === 'light' ? 'light' : 'dark');
  toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    apply(next);
    try { localStorage.setItem('erd4dev-theme', next); } catch (_) {}
  });
})();
