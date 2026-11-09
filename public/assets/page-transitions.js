(() => {
  if(window.diaryPageTransitionsInitialized)return;
  window.diaryPageTransitionsInitialized=true;
  const root=document.documentElement;
  const native='onpagereveal' in window && 'onpageswap' in window;
  root.dataset.transitionSupport=native?'native':'fallback';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>!reduce.matches && window.diaryConfig?.motion?.enabled!==false;
  const article=path=>/^\/archives\/[^/]+\/?$/.test(path);
  const list=path=>path==='/' || /^\/page\/\d+\/?$/.test(path) || /^\/categories\/[^/]+(?:\/page\/\d+)?\/?$/.test(path);
  const eligible=a=>{
    if(!a || a.hasAttribute('download') || (a.target && a.target!=='_self'))return false;
    const url=new URL(a.href);
    return url.origin===location.origin && !url.hash && (article(url.pathname) || (article(location.pathname)&&list(url.pathname)));
  };
  const remember=()=>{
    if(!article(location.pathname))return; // Listing owns its own scroll history.
    history.replaceState({...history.state,diaryArticle:true,diaryScroll:scrollY},'',location.href);
  };
  let animations=[],resetTimer,entryFrame,entered=false;
  const cancel=()=>{
    cancelAnimationFrame(entryFrame);clearTimeout(resetTimer);
    animations.forEach(animation=>animation.cancel());animations=[];
  };
  const animate=(frames,duration,fill='none')=>{
    cancel();
    if(!motion())return;
    const targets=[];
    let area=0;
    const add=target=>{
      if(!target?.animate || targets.length>=8)return;
      const rect=target.getBoundingClientRect();
      if(rect.bottom<=0 || rect.top>=innerHeight || rect.width<=0 || rect.height<=0 || rect.height>innerHeight*1.5)return;
      const size=rect.width*rect.height;
      if(area+size>innerWidth*innerHeight*2)return;
      area+=size;targets.push(target);
    };
    document.querySelectorAll('.hero-media,.hero-copy,.hero-waves,.article>.breadcrumb,.article>h1,.article>.meta,.toc,.side>.panel,#posts .section-head,#posts .post-card,#posts .pagination').forEach(add);
    // Inspect article children once at navigation, never during wheel scrolling. Stop below the viewport.
    for(const child of document.querySelector('.article-body')?.children||[]){
      if(targets.length>=8 || child.getBoundingClientRect().top>=innerHeight)break;
      add(child);
    }
    animations=targets.map(target=>target.animate(frames,{duration,easing:'cubic-bezier(.22,1,.36,1)',fill}));
  };
  const enter=()=>{
    if(entered || !motion() || root.dataset.internalNavigation!=='true' || root.dataset.articleNavigation!=='true')return;
    entered=true;
    // At most eight viewport-visible blocks, with a two-viewport area budget: never animate a long main/article layer.
    // No document snapshots, navigation delay, scroll handlers or persistent compositor hints.
    animate([{opacity:.2,transform:'translateY(12px)'},{opacity:1,transform:'none'}],300);
  };
  // Deferred scripts run before load: do not wait for every article image to finish downloading.
  const queueEnter=()=>{cancelAnimationFrame(entryFrame);entryFrame=requestAnimationFrame(enter)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueEnter,{once:true});
  else queueEnter();
  // Wheel/touch/keyboard input immediately owns the page; an entry effect must never fight scrolling.
  ['wheel','touchstart','pointerdown','keydown'].forEach(type=>window.addEventListener(type,cancel,{passive:true}));
  reduce.addEventListener('change',()=>{if(!motion())cancel()});
  document.addEventListener('click',event=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const a=event.target.closest('a[href]');if(!eligible(a))return;
    const url=new URL(a.href);remember();
    const articleNavigation=article(location.pathname)||article(url.pathname);
    root.dataset.articleNavigation=String(articleNavigation);
    try{sessionStorage.setItem('diary-internal-navigation',JSON.stringify({to:url.pathname+url.search,time:Date.now(),article:articleNavigation}))}catch{}
    animate([{opacity:1,transform:'none'},{opacity:.45,transform:'translateY(-6px)'}],160,'forwards');
    // Restore visibility if navigation is cancelled or the destination takes unusually long.
    resetTimer=setTimeout(cancel,1200);
    // Do not intercept: the browser retains history/BFCache and initializes every article plugin normally.
  });
  window.addEventListener('pageswap',event=>{
    const destination=event.activation?.entry?.url;
    let nextPath='';
    try{nextPath=new URL(destination||location.href).pathname}catch{}
    const articleNavigation=article(location.pathname)||article(nextPath);
    if(!articleNavigation)return;
    // Full viewport snapshots stall image-heavy articles; live DOM animation keeps the normal page lifecycle.
    event.viewTransition?.skipTransition();
    if(nextPath)try{const target=new URL(destination||location.href);sessionStorage.setItem('diary-internal-navigation',JSON.stringify({to:target.pathname+target.search,time:Date.now(),article:true}))}catch{}
  });
  window.addEventListener('pagehide',()=>{remember();cancel();entered=false});
  window.addEventListener('pageshow',event=>{
    if(event.persisted){delete root.dataset.loading;root.dataset.internalNavigation='true';root.dataset.articleNavigation='true';entered=false;queueEnter();return}
    if(history.state?.diaryArticle)window.scrollTo({top:history.state.diaryScroll||0,behavior:'instant'});
    if(!entered)queueEnter();
  });
  // Prefetch documents without executing them: no speculative page views or plugin side effects.
  // Keep the browser's native hover-intent prefetch; avoid parsing full article documents during scrolling.
  if(HTMLScriptElement.supports?.('speculationrules') && !navigator.connection?.saveData && !/2g/.test(navigator.connection?.effectiveType||'')){
    const rules=document.createElement('script');rules.type='speculationrules';
    const selectors=article(location.pathname)?'.neighbor, .breadcrumb a, .brand, .nav-item a, .mobile-nav a':'.post-card-link';
    rules.textContent=JSON.stringify({prefetch:[{source:'document',where:{and:[{selector_matches:selectors},{or:[{href_matches:'/archives/*'},{href_matches:'/'},{href_matches:'/categories/*'}]}]},eagerness:'moderate'}]});
    document.head.append(rules);
  }
})();
