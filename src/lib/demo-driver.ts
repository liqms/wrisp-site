/**
 * 演示动效的共用驱动（SP-4 裁决①：收成一枚）。
 * 独占四个闸门——手动暂停 / prefers-reduced-motion / 窄屏 / 离屏——和定时器令牌失效。
 * 每个面只提供自己的编排：reset 负责回帧，run 负责排帧；状态一律走 class（裁决④）。
 * 客户端件：由组件 <script> 相对路径 import，不用 @/ 别名（别名目前只在服务端 frontmatter 验证过）。
 */
export interface DemoRuntime {
  stepMs: number;
  dwellMs: number;
  at(ms: number, fn: () => void): void;
  fades(): HTMLElement[];
  show(el: HTMLElement): void;
  hide(el: HTMLElement): void;
  all(): void;
  none(): void;
  loop(): void;
}

export interface DemoMount {
  root: HTMLElement;
  watch?: HTMLElement;
  toggle?: HTMLElement | null;
  labels?: { play: string; pause: string };
  stepMs?: number;
  dwellMs?: number;
  reset?: (rt: DemoRuntime) => void;
  run: (rt: DemoRuntime) => void;
}

const RUNNING = 'demo-running';
const IN = 'demo-in';
const REDUCED = '(prefers-reduced-motion: reduce)';
const NARROW = '(max-width: 640px)';

export function mountDemo(m: DemoMount): void {
  // 关动画＝永不启用动效，也没有中途恢复路径（CSS 同时把开关藏掉），所以连监听都不挂。
  if (window.matchMedia(REDUCED).matches) return;

  const narrow = window.matchMedia(NARROW);
  let paused = false;
  let outOfView = false;
  let token = 0;

  const open = (mine: number) => mine === token && !paused && !outOfView && !narrow.matches;

  const rt: DemoRuntime = {
    stepMs: m.stepMs ?? 3000,
    dwellMs: m.dwellMs ?? 1400,
    at: (ms, fn) => {
      const mine = token;
      window.setTimeout(() => {
        if (open(mine)) fn();
      }, ms);
    },
    // data-fade 的值是显式帧序：04 区创作卡要「先命中的记录、后落进正文的角标」，
    // 而角标在 DOM 里排在记录之前——文档序会给错顺序。
    fades: () =>
      Array.from(m.root.querySelectorAll<HTMLElement>('[data-fade]')).sort(
        (a, b) => Number(a.dataset.fade || 0) - Number(b.dataset.fade || 0),
      ),
    show: (el) => el.classList.add(IN),
    hide: (el) => el.classList.remove(IN),
    all: () => {
      for (const el of rt.fades()) rt.show(el);
    },
    none: () => {
      for (const el of rt.fades()) rt.hide(el);
    },
    loop: () => begin(),
  };

  // 终态落位：撤掉 demo-running，样式里的 pre 态整条失效，读者直接拿到全部内容。
  function settle() {
    token += 1;
    m.root.classList.remove(RUNNING);
    if (m.reset) m.reset(rt);
    rt.all();
  }

  function begin() {
    // 暂停中的重排（例如跨过 640px）只许落回终态：pre 态会把暂停刚交出的内容重新藏起来。
    if (narrow.matches || paused) return settle();
    token += 1;
    m.root.classList.add(RUNNING);
    if (m.reset) m.reset(rt);
    else rt.none();
    if (paused || outOfView) return;
    m.run(rt);
  }

  const toggle = m.toggle;
  const labels = m.labels;
  if (toggle && labels) {
    toggle.addEventListener('click', () => {
      paused = !paused;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? labels.play : labels.pause;
      if (paused) {
        // 暂停要停在「读得到全部信息」的那一帧：settle 负责作废残留定时器、撤 pre 态、回终态。
        settle();
      } else {
        begin();
      }
    });
  }

  narrow.addEventListener('change', begin);

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const nowOut = !entry.isIntersecting;
          if (nowOut === outOfView) continue;
          outOfView = nowOut;
          if (outOfView) token += 1;
          else if (!paused) begin();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(m.watch ?? m.root);
  }

  begin();
}
