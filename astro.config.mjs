// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages 项目站：仓库名即路径前缀，二者必须同步，否则 canonical/og:url 会指错。
const SITE = 'https://liqms.github.io/wrisp-site/';
const BASE = '/wrisp-site/';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  // `/` 走英文，`/zh/` 走中文；默认语言不加前缀，英文侧因此也是 x-default 的落点。
  i18n: {
    defaultLocale: 'en',
    locales: ['en', { codes: ['zh-CN', 'zh-Hans'], path: 'zh' }],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
