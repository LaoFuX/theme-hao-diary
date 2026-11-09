import { defineConfig } from 'astro/config';
// 独立主题采用完整页面导航，避免局部切换与编辑器插件重复绑定事件。
export default defineConfig({
  base: '/themes/theme-hao-diary',
  build: { assets: 'assets', format: 'file' },
  outDir: './templates',
});
