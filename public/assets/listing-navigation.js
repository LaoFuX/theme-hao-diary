(() => {
  // Category transitions only: retain Halo's full document/plugin lifecycle for articles.
  const listing=document.querySelector('[data-listing]');
  if(!listing || window.diaryListingInitialized)return;
  window.diaryListingInitialized=true;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>!reduce.matches && window.diaryConfig?.motion?.enabled!==false;
  const normalize=path=>path.replace(/\/$/,'')||'/';
  const route=url=>url.origin===location.origin && (url.pathname==='/' || /^\/page\/\d+\/?$/.test(url.pathname) || /^\/categories\/[^/]+(?:\/page\/\d+)?\/?$/.test(url.pathname));
  const key=url=>normalize(url.pathname)+url.search;
  const cache=new Map(),requests=new Map(),MAX_CACHE=12,MAX_AGE=120000;
  let renderedURL=location.href,serial=0,pending=false,animation,scrollTimer,progressTimer;
  const status=document.createElement('p');
  status.className='listing-status';status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');listing.append(status);
  const save=()=>{
    if(!pending && location.href===renderedURL)history.replaceState({...history.state,diaryListing:true,diaryScroll:scrollY},'',location.href);
  };
  history.scrollRestoration='manual';
  const syncLinks=()=>{
    document.querySelectorAll('.site-header a,.side-links a').forEach(a=>{
      if(a.origin!==location.origin)return;
      const path=normalize(a.pathname),current=normalize(location.pathname).replace(/\/page\/\d+$/,'')||'/';
      if(path===current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  };
  const position=(top,smooth=false)=>window.scrollTo({top,left:0,behavior:smooth&&motion()?'smooth':'instant'});
  const listTop=()=>Math.max(0,document.querySelector('#posts').getBoundingClientRect().top+scrollY-100);
  const covers=posts=>posts.querySelectorAll('.post-visual img').forEach(img=>{
    const recover=()=>{const visual=img.closest('.post-visual');visual?.closest('.post-card-link')?.classList.add('post-no-cover');visual?.remove()};
    img.addEventListener('error',recover,{once:true});if(img.complete&&!img.naturalWidth)recover();
  });
  function snapshot(doc,url){
    const container=doc.querySelector('[data-listing]'),posts=container?.querySelector('#posts');
    if(!posts)throw new Error('Not a listing');
    const copy=posts.cloneNode(true);copy.removeAttribute('aria-busy');
    copy.querySelectorAll('.reveal-pending,.reveal-visible').forEach(card=>card.classList.remove('reveal-pending','reveal-visible'));
    return {url,html:copy.outerHTML,type:container.dataset.listing,title:doc.title,time:Date.now(),meta:[...doc.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[property="og:url"]')].map(m=>({name:m.name,property:m.getAttribute('property'),content:m.content}))};
  }
  function remember(id,page){
    cache.delete(id);cache.set(id,page);
    while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
  }
  remember(key(new URL(location.href)),snapshot(document,location.href));
  function load(url){
    const id=key(url),hit=cache.get(id);
    if(hit && Date.now()-hit.time<MAX_AGE){cache.delete(id);cache.set(id,hit);return Promise.resolve(hit)}
    if(requests.has(id))return requests.get(id).promise;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    const promise=(async()=>{
      const response=await fetch(url.href,{signal:controller.signal,headers:{Accept:'text/html'}});
      if(!response.ok || !route(new URL(response.url)))throw new Error('Listing unavailable');
      const doc=new DOMParser().parseFromString(await response.text(),'text/html');
      const page=snapshot(doc,response.url);remember(id,page);
      // Warm the first visible covers during prefetch; keep their normal lazy-loading in the list.
      [...doc.querySelectorAll('#posts .cover')].slice(0,2).forEach(source=>{const img=new Image();img.decoding='async';img.src=source.src});
      return page;
    })().finally(()=>{clearTimeout(timeout);requests.delete(id)});
    requests.set(id,{promise,controller});return promise;
  }
  const eligible=a=>a && !a.hasAttribute('download') && (!a.target||a.target==='_self') && route(new URL(a.href)) && !new URL(a.href).hash;
  const canPrefetch=()=>!navigator.connection?.saveData && !/2g/.test(navigator.connection?.effectiveType||'');
  const prefetch=a=>{if(canPrefetch()&&eligible(a))load(new URL(a.href)).catch(()=>{})};
  document.addEventListener('pointerover',e=>prefetch(e.target.closest('a[href]')),{passive:true});
  document.addEventListener('focusin',e=>prefetch(e.target.closest('a[href]')));
  document.addEventListener('touchstart',e=>prefetch(e.target.closest('a[href]')),{passive:true});
  const cancelAnimation=()=>{animation?.cancel();animation=null};
  const fade=async(element,frames,duration)=>{
    if(!motion())return;
    animation=element.animate(frames,{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    try{await animation.finished}catch{}
  };
  async function navigate(url,{pop=false,top=false,restore=0}={}){
    if(!pop)save();
    const ticket=++serial;cancelAnimation();clearTimeout(progressTimer);
    listing.classList.remove('listing-loading');pending=true;
    const old=document.querySelector('#posts');old.setAttribute('aria-busy','true');
    document.querySelector('.mobile-nav')?.removeAttribute('open');
    status.textContent='正在加载文章…';
    progressTimer=setTimeout(()=>{if(ticket===serial)listing.classList.add('listing-loading')},350);
    // Move only when the list is outside the current reading position, and start before the request finishes.
    if(!pop && (top || Math.abs(scrollY-listTop())>150))position(top?0:listTop(),true);
    try{
      const page=await load(url);
      if(ticket!==serial)return;
      clearTimeout(progressTimer);listing.classList.remove('listing-loading');
      const template=document.createElement('template');template.innerHTML=page.html;
      const next=template.content.querySelector('#posts');
      await fade(old,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],140);
      if(ticket!==serial)return;
      cancelAnimation();
      next.removeAttribute('aria-busy');
      old.replaceWith(next);covers(next);listing.dataset.listing=page.type;
      document.title=page.title;
      page.meta.forEach(meta=>{
        const selector=meta.name?`meta[name="${meta.name}"]`:`meta[property="${meta.property}"]`;
        const target=document.querySelector(selector);if(target)target.content=meta.content;
      });
      const finalURL=new URL(page.url);finalURL.hash=url.hash;
      if(!pop)history.pushState({diaryListing:true,diaryScroll:scrollY},'',finalURL.href);
      renderedURL=location.href;pending=false;syncLinks();
      if(pop)position(restore);
      if(!pop){const heading=next.querySelector('h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true})}
      status.textContent=next.querySelector('.section-head').textContent.trim();save();
      await fade(next,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],200);
      if(ticket===serial)cancelAnimation();
    }catch(error){
      if(ticket!==serial)return;
      location.assign(url.href);
    }finally{
      if(ticket===serial){clearTimeout(progressTimer);pending=false;listing.classList.remove('listing-loading');document.querySelector('#posts')?.removeAttribute('aria-busy')}
    }
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const a=event.target.closest('a[href]');
    if(a && !a.hasAttribute('download') && (!a.target || a.target==='_self')){
      const anchorURL=new URL(a.href);
      if(route(anchorURL) && anchorURL.hash==='#posts' && key(anchorURL)===key(new URL(renderedURL)) && !pending){
        // Hash navigation must not enter the listing fetch/replace lifecycle.
        event.preventDefault();save();
        if(location.hash!=='#posts')history.pushState({diaryListing:true,diaryScroll:listTop()},'',anchorURL.href);
        renderedURL=location.href;position(listTop(),true);
        document.querySelector('.mobile-nav')?.removeAttribute('open');
        return;
      }
    }
    if(!eligible(a))return;
    const url=new URL(a.href);event.preventDefault();
    const top=!!a.closest('.brand');
    if(key(url)===key(new URL(renderedURL))&&!pending){position(top?0:listTop(),true);document.querySelector('.mobile-nav')?.removeAttribute('open');return}
    navigate(url,{top});
  });
  window.addEventListener('popstate',event=>{
    const url=new URL(location.href);if(!route(url)){location.reload();return}
    if(key(url)===key(new URL(renderedURL)) && !pending){
      // Browsers also emit popstate for same-document hashes. Keep the existing list and native page lifecycle.
      renderedURL=location.href;
      if(url.hash==='#posts')position(listTop());
      else if(!url.hash)position(event.state?.diaryScroll||0);
      return;
    }
    navigate(url,{pop:true,restore:event.state?.diaryScroll||0});
  });
  // Persist scroll after wheel input settles; replaceState on every animation frame competes with scrolling.
  window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(save,160)},{passive:true});
  window.addEventListener('pagehide',()=>{
    ++serial;cancelAnimation();clearTimeout(progressTimer);clearTimeout(scrollTimer);
    requests.forEach(request=>request.controller.abort());pending=false;listing.classList.remove('listing-loading');save();
  });
  window.addEventListener('pageshow',event=>{if(event.persisted){document.querySelector('#posts')?.removeAttribute('aria-busy');syncLinks();position(history.state?.diaryScroll||0)}});
  syncLinks();
  if(location.hash==='#posts')requestAnimationFrame(()=>position(listTop()));
  if(!location.hash && (history.state?.diaryListing || listing.dataset.listing==='category' || /^\/page\//.test(location.pathname))){
    const restore=history.state?.diaryListing?history.state.diaryScroll:null;position(restore??listTop());
  }
  save();
})();
