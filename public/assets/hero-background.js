// 每次完整访问首屏推进一次；页面恢复不会重新运行，三端共用同一张图。
window.diarySelectHeroImage = function(hero = {}, storage) {
  const primary = typeof hero.image === 'string' ? hero.image.trim() : '';
  if (hero.rotate_images !== true) return primary;
  const images = (Array.isArray(hero.images) ? hero.images : [])
    .map(item => typeof item?.url === 'string' ? item.url.trim() : '')
    .filter(Boolean);
  if (!images.length) return primary;
  const signature = JSON.stringify(images);
  let index = 0;
  try {
    const saved = JSON.parse(storage?.getItem('hao-diary-hero-sequence') || 'null');
    if (saved?.signature === signature && Number.isSafeInteger(saved.next) && saved.next >= 0) {
      index = saved.next % images.length;
    }
    storage?.setItem('hao-diary-hero-sequence', JSON.stringify({signature, next: (index + 1) % images.length}));
  } catch { /* 禁用本地存储时仍显示有效图片。 */ }
  return images[index];
};
