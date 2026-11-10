// @ts-check
import { defineConfig } from 'astro/config';

// 站点已绑定自定义域名 www.trywrisp.com：资源路径以根为准，base 为空串。
const SITE = 'https://www.trywrisp.com/';
const BASE = '/';

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