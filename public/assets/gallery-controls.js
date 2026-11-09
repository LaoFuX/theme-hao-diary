/* 配合已安装的 PluginLightGallery 1.x：滚轮缩放，鼠标拖动仅平移放大图。 */
(() => {
  const setup = () => {
    document.querySelectorAll('.article-body[lg-uid]').forEach(content => {
      const gallery = window.lgData?.[content.getAttribute('lg-uid')];
      if (!gallery || content.dataset.diaryGalleryControls) return;
      content.dataset.diaryGalleryControls = 'true';
      // 在第一次打开之前设置；不注册用于切换图片的鼠标拖动事件。
      gallery.s.enableDrag = false;
      gallery.s.mousewheel = false;
      gallery.s.scale = 0.25;
      let outer, pending = 0, lastTime = 0;
      const wheel = event => {
        event.preventDefault();
        event.stopPropagation();
        const image = outer?.querySelector('.lg-current .lg-image');
        if (!image?.naturalWidth || !image.clientWidth || !event.deltaY) return;
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? outer.clientHeight : 1);
        if (event.timeStamp - lastTime > 180 || Math.sign(delta) !== Math.sign(pending)) pending = 0;
        lastTime = event.timeStamp;
        pending += Math.max(-160, Math.min(160, delta));
        // 合并触控板细小滚动，限制每个事件最多推进四档；缩放范围 1–8 倍。
        let steps = Math.min(4, Math.floor(Math.abs(pending) / 40));
        const direction = Math.sign(pending);
        pending -= direction * steps * 40;
        while (steps-- > 0) {
          const scale = Number(image.getAttribute('data-scale')) || 1;
          if ((direction < 0 && scale >= 8) || (direction > 0 && scale <= 1)) break;
          // “原始大小”按钮可能产生非整档倍率，最后一档也精确停在上限。
          gallery.s.scale = direction < 0 ? Math.min(0.25, 8 - scale) : 0.25;
          outer.querySelector(direction < 0 ? '#lg-zoom-in' : '#lg-zoom-out')?.click();
          gallery.s.scale = 0.25;
        }
      };
      const detach = () => {
        outer?.removeEventListener('wheel', wheel);
        outer = undefined;
        pending = 0;
      };
      content.addEventListener('onAfterOpen', () => {
        detach();
        outer = gallery.outer;
        outer?.addEventListener('wheel', wheel, {passive: false});
      });
      content.addEventListener('onBeforeSlide', () => { pending = 0; });
      content.addEventListener('onCloseAfter', detach);
    });
  };
  // 插件先在 DOMContentLoaded 中初始化图库，本脚本随后设置交互选项。
  if (document.readyState === 'complete') setup();
  else document.addEventListener('DOMContentLoaded', setup, {once: true});
})();
