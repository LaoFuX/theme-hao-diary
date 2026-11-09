/* 中文后台是唯一外观配置入口；访客本地保存深浅模式与首屏背景的轮换位置。 */
(() => {
  const root = document.documentElement;
  let config = {};
  try { config = JSON.parse(document.getElementById('diary-config').textContent); } catch {}
  window.diaryConfig = config;
  const colors = {bg:'#090C10',card:'#14191F',hero:'#0B1016',accent:'#A9BFD3',ink:'#E3E5E8',muted:'#A4AAB3',detail1:'#ACAAFF',detail2:'#8ED9C2',detail3:'#E4BC8B'};
  const style = document.createElement('style');
  style.id = 'diary-custom-colors';
  style.textContent = ':root[data-scheme="dark"]{' + Object.entries(colors).map(([key,fallback]) => {
    const value = config.colors?.[key];
    return `--${key}:${/^#[\da-f]{6}$/i.test(value) ? value : fallback}`;
  }).join(';') + '}';
  document.head.append(style);
  const number = (v, fallback, min, max) => Number.isFinite(Number(v)) && v !== '' && v != null ? Math.min(max, Math.max(min, Number(v))) : fallback;
  const vars = {
    height: number(config.hero?.height,96,75,115)+'svh',
    'mobile-min-height':number(config.hero?.mobile_min_height,570,400,900)+'px',
    'title-size':number(config.hero?.title_size,64,36,90)+'px',
    'art-opacity':number(config.hero?.art_opacity,64,0,100)/100,
    overlay:number(config.hero?.overlay,35,0,90)/100,
    duration:number(config.motion?.duration,750,200,1500)+'ms',
    'wave-height':number(config.hero?.wave_height,100,40,180)+'px',
    'wave-period':number(config.hero?.wave_period,18,8,40)+'s',
    'card-height':number(config.listing?.card_height,290,220,420)+'px',
    'cover-width':number(config.listing?.cover_width,37,30,45)+'%',
    'reading-size':number(config.reading?.font_size,18,16,22)+'px',
    'reading-line':number(config.reading?.line_height,1.9,1.5,2.2)
  };
  for(const [key,value] of Object.entries(vars)) root.style.setProperty('--'+key,String(value));
  try { const mode=localStorage.getItem('hao-diary-mode'); if(mode==='light'||mode==='dark') root.dataset.scheme=mode; } catch {}
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const allowMotion=config.motion?.enabled!==false && !reduce.matches;
  // Read before first paint: internal returns must never restart the fullscreen home loader.
  let internal=performance.getEntriesByType('navigation')[0]?.type==='back_forward' || document.prerendering===true;
  let articleNavigation=performance.getEntriesByType('navigation')[0]?.type==='back_forward';
  try {
    const token=JSON.parse(sessionStorage.getItem('diary-internal-navigation')||'null');
    sessionStorage.removeItem('diary-internal-navigation');
    if(token && token.to===location.pathname+location.search && Date.now()-token.time<30000){internal=true;articleNavigation=token.article===true;}
  } catch {}
  root.dataset.internalNavigation=String(internal);
  root.dataset.articleNavigation=String(articleNavigation);
  root.dataset.pageMotion=String(allowMotion);
  if(!allowMotion)style.textContent+='@view-transition{navigation:none}';
  const useLoader=allowMotion && !internal && config.motion?.loader_enabled!==false && root.dataset.home==='true';
  if(useLoader) {
    const started=performance.now();
    const minimum=number(config.motion?.loader_duration,650,300,1500);
    root.dataset.loading='true';
    let settled=false, releaseTimer;
    const finish=()=>{
      if(settled)return;settled=true;
      releaseTimer=setTimeout(()=>{
        delete root.dataset.loading;
        if(!reduce.matches)root.dataset.entry='enabled';
        window.dispatchEvent(new Event('diary:entered'));
      },Math.max(0,minimum-(performance.now()-started)));
    };
    window.addEventListener('load',finish,{once:true});
    // 不等待第三方资源无限加载。样式另有2.4秒兜底；主脚本失效也不会锁住正文。
    const deadline=setTimeout(finish,1800);
    window.addEventListener('pagehide',()=>{clearTimeout(deadline);clearTimeout(releaseTimer);delete root.dataset.loading;window.removeEventListener('load',finish)},{once:true});
    window.addEventListener('pageshow',event=>{if(event.persisted)delete root.dataset.loading});
  } else if(allowMotion && !internal) root.dataset.entry='enabled';
})();
