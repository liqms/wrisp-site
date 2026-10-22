import { getCollection } from 'astro:content';

export type LeafKey = 'zh' | 'en';

/** Astro 的 locale 码可能是 zh-CN / zh-Hans，集合里的叶子只有 zh。 */
export function leafKey(locale: string): LeafKey {
  return locale.startsWith('zh') ? 'zh' : 'en';
}

type Tree = unknown;

/**
 * 把双语树按语言压平：{ zh, en } 叶子变成字符串，结构字段原样保留。
 * 模板因此只见到纯文本，不再逐处写 t()；闭合由集合 schema 在构建期保证。
 */
export function resolveNode(node: Tree, key: LeafKey): unknown {
  if (Array.isArray(node)) return node.map((item) => resolveNode(item, key));
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (typeof record.zh === 'string' && typeof record.en === 'string') {
      return record[key];
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) out[k] = resolveNode(v, key);
    return out;
  }
  return node;
}

/** 一次取回全站文案，按区块 id 分组，值已压到指定语言。 */
export async function loadCopy(key: LeafKey): Promise<Record<string, Record<string, any>>> {
  const entries = await getCollection('copy');
  const grouped: Record<string, Record<string, any>> = {};
  for (const entry of entries) {
    grouped[entry.id] = resolveNode(entry.data, key) as Record<string, any>;
  }
  return grouped;
}
