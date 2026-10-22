/**
 * 双语两页的根地址：/ = 英文，/zh/ = 中文，都带 Pages 项目站的 base。
 * 语言切换是链接而不是脚本改写，所以地址只在这里算一次。
 */
export const localeRoot = {
  en: import.meta.env.BASE_URL,
  zh: `${import.meta.env.BASE_URL}zh/`,
} as const;
