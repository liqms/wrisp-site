import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * 双语闭合靠结构保证，不靠脚本后验：
 * 每一条可译文案在集合里都是 { zh, en } 一个叶子，两个语言写在同一处，
 * 少任何一侧、留空、或多出第三种语言都会被 schema 直接判失败，构建中断。
 */
const Loc = z.strictObject({ zh: z.string().min(1), en: z.string().min(1) });

/** 结构字段（时间、CSS 类名、演示时长）两语言共用，写成普通标量即可。 */
const Scalar = z.union([z.string(), z.number(), z.boolean()]);

type Node = z.infer<typeof Loc> | z.infer<typeof Scalar> | Node[] | { [k: string]: Node };

const Tree: z.ZodType<Node> = z.lazy(() =>
  z.union([
    Loc,
    Scalar,
    z.array(Tree),
    z
      .record(z.string(), Tree)
      // 沾到 zh 或 en 键名的对象必须走叶子校验，缺任一侧就构建失败
      .refine((obj) => !('zh' in obj || 'en' in obj), {
        message: '双语叶子必须同时给出非空的 zh 与 en',
      }),
  ]),
);

const copy = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/copy' }),
  schema: z.record(z.string(), Tree),
});

export const collections = { copy };
