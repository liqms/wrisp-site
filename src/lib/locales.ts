/**
 * 双语两页的根地址：/ = 英文，/zh/ = 中文，都带 Pages 项目站的 base。
 * 语言切换是链接而不是脚本改写，所以地址只在这里算一次。
 */
export const localeRoot = {
  en: import.meta.env.BASE_URL,
  zh: `${import.meta.env.BASE_URL}zh/`,
} as const;

/** 站内链接：某语言的根 + 段路径（'' 即该语言的首页）。辅助页只在这里拼一次。 */
export const localePath = (key: keyof typeof localeRoot, seg = '') => `${localeRoot[key]}${seg}`;

/**
 * 剥掉 base 与语言前缀，得到同一页两种语言共用的段路径（首页返回空串）。
 * 先试 zh 再试 en：zh 的根本身就长在 en 的根（base）上，反过来会把 zh 页判成 en 页。
 * 不用 Astro.relativePath——静态构建期它是 undefined，只有 url 是全程可靠的。
 */
export const localeSegment = (pathname: string): string => {
  for (const key of ['zh', 'en'] as const) {
    const root = localeRoot[key];
    if (pathname.startsWith(root)) return pathname.slice(root.length);
  }
  return '';
};
