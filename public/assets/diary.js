(() => {
  // 完整导航每页只执行一次；幂等保护同时避免浏览器恢复页面时重复绑定。
  if (window.diaryInitialized) return;
  window.diaryInitialized = true;
  const config=window.diaryConfig||{};
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  // 单行诗句按实际容器宽度适配字号；手机也保持一行，不裁字、不制造横向滚动。
  const fitPoem=()=>{
    document.querySelectorAll('.hero-single-line h1>span').forEach(span=>{
      if(!span.textContent.trim())return;
      span.style.fontSize='';
      const available=span.parentElement.clientWidth;
      const base=parseFloat(getComputedStyle(span).fontSize);
      if(span.scrollWidth>available)span.style.fontSize=Math.max(14,Math.floor(base*available/span.scrollWidth*100)/100)+'px';
    });
  };
  fitPoem();
  document.fonts?.ready.then(fitPoem);
  let fitFrame;
  const onResize=()=>{cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(fitPoem)};
  window.addEventListener('resize',onResize,{passive:true});
  window.addEventListener('pagehide',()=>{window.removeEventListener('resize',onResize);cancelAnimationFrame(fitFrame)},{once:true});
  window.addEventListener('pageshow',event=>{if(event.persisted){window.addEventListener('resize',onResize,{passive:true});fitPoem()}});
  // 仅显示文章自己的封面；失效的封面退回纯文字卡片，不补充占位插画。
  document.querySelectorAll('.post-visual img').forEach(img=>{
    const recover=()=>{img.removeEventListener('error',recover);const visual=img.closest('.post-visual');const card=visual?.closest('.post-card-link');if(!card)return;card.classList.add('post-no-cover');visual.remove()};
    img.addEventListener('error',recover,{once:true});
    if(img.complete&&!img.naturalWidth)recover();
  });
  if(config.motion?.enabled!==false && !reduce.matches && 'IntersectionObserver' in window) {
    // 下方卡片进入视口时各播放一次；离开页面即清理，浏览器返回时保持内容可见。
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        entry.target.classList.remove('reveal-pending');
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      });
    },{threshold:0.08});
    // Reveal only items already in the first viewport. Animating cards as each wheel scroll reveals them makes scrolling feel delayed.
    const cards=[...document.querySelectorAll('.side .panel,.post-card')].filter(el=>el.getBoundingClientRect().top<innerHeight);
    cards.forEach(el=>{el.classList.add('reveal-pending');observer.observe(el)});
    window.addEventListener('pagehide',()=>{observer.disconnect();cards.forEach(el=>el.classList.remove('reveal-pending'))},{once:true});
  }
  const mode=document.querySelector('.mode');
  const syncMode=()=>mode?.setAttribute('aria-pressed',String(root.dataset.scheme==='light'));
  syncMode();
  mode?.addEventListener('click',()=>{ root.dataset.scheme=root.dataset.scheme==='light'?'dark':'light';try{localStorage.setItem('hao-diary-mode',root.dataset.scheme)}catch{}syncMode(); });
  document.querySelectorAll('.nav-item>a,.mobile-nav a').forEach(a=>{
    try{if(new URL(a.href).pathname===location.pathname)a.setAttribute('aria-current','page')}catch{}
  });
  const media=document.querySelector('.hero-media');
  const image=media?.querySelector('.hero-image');
  const fallback=media?.dataset.fallback;
  let fallbackAttempted=false;
  const useFallback=()=>{
    if(!image || fallbackAttempted)return;
    fallbackAttempted=true;
    image.removeEventListener('error',useFallback);
    media.querySelectorAll('source').forEach(s=>s.remove());
    const picture=image.closest('picture');
    if(fallback) {
      // 新节点避免原图片已排队的 error 事件误删刚开始加载的备用图。
      const replacement=document.createElement('img');
      replacement.className='hero-image';replacement.alt='';
      replacement.addEventListener('error',()=>picture?.remove(),{once:true});
      replacement.src=fallback;image.replaceWith(replacement);
    } else { picture?.remove(); }
  };
  image?.addEventListener('error',useFallback);
  if(image) {
    let storage;
    try { storage=window.localStorage; } catch {}
    const selected=window.diarySelectHeroImage(config.hero,storage);
    if(selected) {
      if(image.getAttribute('src')!==selected) image.src=selected;
      if(image.complete && !image.naturalWidth) useFallback();
    } else { image.closest('picture')?.remove(); }
  }
  if(reduce.matches && image) { if(fallback) useFallback(); else image.closest('picture').remove(); }
  document.querySelectorAll('[data-start-date]').forEach(el=>{
    const value=el.dataset.startDate;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return;
    const [year,month,day]=value.split('-').map(Number);
    const start=Date.UTC(year,month-1,day);
    const parsed=new Date(start);
    const now=new Date();
    const days=Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-start)/86400000);
    if(parsed.getUTCFullYear()!==year||parsed.getUTCMonth()!==month-1||parsed.getUTCDate()!==day||days<0){el.querySelector('.runtime-days').textContent='建站日期待确认';return;}
    el.querySelector('.runtime-days').textContent=String(days);
    el.querySelector('.runtime-unit').hidden=false;
  });
  const content=document.querySelector('.article-body');
  if(!content)return;
  content.querySelectorAll('table').forEach(table=>{if(!table.parentElement.classList.contains('table-scroll')){const box=document.createElement('div');box.className='table-scroll';box.tabIndex=0;box.setAttribute('aria-label','表格，可横向滚动');table.before(box);box.append(table)}});
  content.querySelectorAll('svg').forEach(svg=>{if(!svg.closest('.diagram-scroll')){const box=document.createElement('div');box.className='diagram-scroll';box.tabIndex=0;box.setAttribute('aria-label','图表，可横向滚动');svg.before(box);box.append(svg)}});
  const depth=Math.min(4,Math.max(2,Number(config.reading?.toc_depth)||3));
  const candidates=[...content.querySelectorAll('h1,h2,h3,h4')].filter(h=>Number(h.tagName.slice(1))<=depth);
  // 正文开头唯一的 h1 通常是文内标题；章节从 h2 编号，避免全篇挤在一个分组。
  const hasIntroTitle=candidates[0]?.tagName==='H1' && candidates.filter(h=>h.tagName==='H1').length===1 && candidates.some(h=>h.tagName==='H2');
  const headings=hasIntroTitle ? candidates.slice(1) : candidates;
  const topLevel=Math.min(...headings.map(h=>Number(h.tagName.slice(1))));
  const entries=[];
  let section=0;
  const outline=headings.map((h,i)=>{
    if(!h.id) {
      let id='diary-section-'+(i+1);
      while(document.getElementById(id))id+='-heading';
      h.id=id;
    }
    const level=Math.min(2,Number(h.tagName.slice(1))-topLevel);
    if(level===0)section++;
    return {heading:h,level,section};
  });
  document.querySelectorAll('.toc-links').forEach(nav=>{
    const list=document.createDocumentFragment();
    let group;
    outline.forEach(({heading:h,level,section})=>{
      if(level===0 || !group){group=document.createElement('div');group.className='toc-group';list.append(group)}
      const a=document.createElement('a');a.href='#'+encodeURIComponent(h.id);a.className='toc-entry toc-level-'+level;
      const badge=document.createElement('span');badge.className='toc-badge';badge.setAttribute('aria-hidden','true');
      if(level===0)badge.textContent=String(section);
      const title=document.createElement('span');title.className='toc-title';
      title.textContent=h.textContent.trim().replace(/^\d+[.、．]\s*/, '');
      a.append(badge,title);group.append(a);entries.push({a,nav,group,heading:h});
    });
    nav.replaceChildren(list);
    if(!headings.length)nav.closest('.toc,.mobile-toc')?.setAttribute('hidden','');
  });
  let scheduled=false,previousActive;
  const highlight=()=>{
    scheduled=false;let active=headings[0];
    headings.forEach(h=>{if(h.getBoundingClientRect().top<=150)active=h});
    if(active===previousActive)return;
    previousActive=active;
    document.querySelectorAll('.toc-group').forEach(group=>group.classList.remove('is-current'));
    entries.forEach(({a,nav,group,heading})=>{
      const selected=heading===active;
      a.classList.toggle('active',selected);
      if(selected){
        a.setAttribute('aria-current','location');group.classList.add('is-current');
        if(nav.getClientRects().length){
          const box=nav.getBoundingClientRect(),item=a.getBoundingClientRect();
          if(item.top<box.top || item.bottom>box.bottom)nav.scrollTop+=item.top-box.top-nav.clientHeight/3;
        }
      } else a.removeAttribute('aria-current');
    });
  };
  const onScroll=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(highlight)}};
  window.addEventListener('scroll',onScroll,{passive:true});highlight();
  window.addEventListener('pagehide',()=>window.removeEventListener('scroll',onScroll),{once:true});
  window.addEventListener('pageshow',event=>{if(event.persisted)window.addEventListener('scroll',onScroll,{passive:true})});
})();
