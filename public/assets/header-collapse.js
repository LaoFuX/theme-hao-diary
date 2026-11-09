(() => {
  const hero = document.querySelector('.hero');
  const header = document.querySelector('.site-header');
  if (!hero || !header || !('IntersectionObserver' in window) || window.diaryHeaderInitialized) return;
  window.diaryHeaderInitialized = true;
  const root = document.documentElement;
  const menu = header.querySelector('.mobile-nav');
  let pastHero = false;
  let collapsed = false;
  root.dataset.headerAutoHide = 'true';
  root.dataset.headerMotion = String(window.diaryConfig?.motion?.enabled !== false);
  const sync = () => {
    // Keep an open menu or keyboard-focused navigation usable until focus leaves it.
    const next = pastHero && !menu?.open && !header.querySelector(':focus-visible');
    if (next === collapsed) return;
    collapsed = next;
    root.dataset.headerCollapsed = String(next);
    header.inert = next;
    if (next) header.setAttribute('aria-hidden', 'true');
    else header.removeAttribute('aria-hidden');
  };
  const observer = new IntersectionObserver(entries => {
    pastHero = entries[entries.length - 1].boundingClientRect.bottom <= 24;
    sync();
  }, { threshold: 0, rootMargin: '-24px 0px 0px 0px' });
  const connect = () => {
    pastHero = hero.getBoundingClientRect().bottom <= 24;
    sync();
    observer.observe(hero);
  };
  header.addEventListener('focusout', () => queueMicrotask(sync));
  menu?.addEventListener('toggle', sync);
  window.addEventListener('pagehide', () => observer.disconnect());
  window.addEventListener('pageshow', event => { if (event.persisted) connect(); });
  connect();
})();
