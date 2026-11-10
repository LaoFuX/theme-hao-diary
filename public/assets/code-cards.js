/* Shiki 1.x uses nested open shadow roots. Keep its renderer and copy handler;
 * share one stylesheet, with no scroll handlers, polling or syntax re-rendering. */
(() => {
  const article = document.querySelector('.article-body');
  if (!article || article.dataset.codeCards) return;
  article.dataset.codeCards = 'true';
  const root = document.documentElement;
  const variants = new Set();
  const hosts = new WeakSet();
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    :host{display:block;min-width:0;--font-size:14px!important}
    .group{position:relative;border-radius:24px;background:var(--diary-code-bg,#444);border:1px solid var(--diary-code-border,#555);box-shadow:none;overflow:hidden}
    .shiki,:host([color-scheme="dark"]) .shiki{margin:0!important;padding:62px 22px 22px!important;border-radius:inherit;background:transparent!important;color:var(--diary-code-ink,#eee)!important;line-height:1.8;tab-size:4;overflow-x:auto;scrollbar-width:thin;scrollbar-color:var(--diary-code-scroll,#777) transparent}
    code{font-size:14px!important;font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace}
    code .line::before{display:none}
    :host([color-scheme="dark"]) .shiki span{color:var(--shiki-dark,var(--diary-code-ink,#eee))!important}
    :host([color-scheme="dark"]) .shiki span[style*="--shiki-dark:#6A737D" i]{color:#b4b4b4!important}
    .group>div.absolute{top:16px;left:22px;right:72px;font:500 13px/24px system-ui,sans-serif;color:var(--diary-code-ink,#eee)!important;opacity:1!important;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .group>div.absolute::before{content:'‹/›';display:inline-block;margin-right:10px;font:600 15px/24px ui-monospace,monospace}
    .group>div.absolute[data-diary-label]{font-size:0}
    .group>div.absolute[data-diary-label]::after{content:attr(data-diary-label);font-size:13px}
    .group>button{top:10px;right:12px;width:40px;height:40px;border-radius:10px;background:transparent!important;color:var(--diary-code-ink,#eee)!important;opacity:1!important;transition:background .15s}
    .group>button i{color:inherit!important;width:19px;height:19px}
    .group>button:hover{background:var(--diary-code-hover,#ffffff14)!important}
    .group>button:focus-visible{outline:2px solid var(--diary-code-ink,#eee);outline-offset:-3px}
    @media(max-width:700px){.group{border-radius:18px}.shiki,:host([color-scheme="dark"]) .shiki{padding:58px 16px 18px!important}.group>div.absolute{left:16px}code{font-size:13px!important}}
    @media(prefers-reduced-motion:reduce){.group>button{transition:none}}
  `);
  const scheme = () => root.dataset.scheme === 'light' ? 'light' : 'dark';
  async function adaptVariant(variant) {
    await customElements.whenDefined(variant.localName);
    await variant.updateComplete;
    if (!variant.isConnected || !variant.shadowRoot) return;
    if (!variants.has(variant)) {
      variants.add(variant);
      variant.shadowRoot.adoptedStyleSheets = [...variant.shadowRoot.adoptedStyleSheets, sheet];
    }
    variant.setAttribute('color-scheme', scheme());
    await variant.updateComplete;
    const label = variant.shadowRoot.querySelector('.group>div.absolute');
    if (label) {
      const language = label.textContent.trim();
      const names = { plaintext: '纯文本', text: '纯文本', shellscript: 'Bash', bash: 'Bash', yaml: 'YAML', javascript: 'JavaScript', typescript: 'TypeScript', json: 'JSON', html: 'HTML', css: 'CSS' };
      label.dataset.diaryLabel = names[language.toLowerCase()] || language;
    }
    const button = variant.shadowRoot.querySelector('button[aria-label="Copy code"]');
    if (button) { button.tabIndex = 0; button.setAttribute('aria-label', '复制代码'); button.title = '复制代码'; }
  }
  async function adapt(host) {
    if (hosts.has(host)) return;
    hosts.add(host);
    await customElements.whenDefined('shiki-code');
    await host.updateComplete;
    if (!host.shadowRoot) return;
    const scan = () => host.shadowRoot.querySelectorAll('shiki-code-simple-variant').forEach(adaptVariant);
    scan();
    // Only watch the small component root, never scroll or character changes.
    new MutationObserver(scan).observe(host.shadowRoot, { childList: true, subtree: true });
  }
  const scan = (node) => {
    if (node.nodeType !== 1) return;
    if (node.matches('shiki-code')) adapt(node);
    node.querySelectorAll('shiki-code').forEach(adapt);
  };
  scan(article);
  new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(scan)))
    .observe(article, { childList: true, subtree: true });
  new MutationObserver(() => {
    for (const variant of variants) {
      if (!variant.isConnected) { variants.delete(variant); continue; }
      adaptVariant(variant);
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-scheme'] });
})();
