# ZIK Trinity 博客项目说明

本文档记录当前项目的主要信息，供后续在本仓库工作的 Codex/Agent 快速了解项目上下文。

## 项目概览

- 项目名称：`ZIK Trinity`，`package.json` 中的包名为 `minimalist-astro-blog`。
- 项目类型：基于 Astro 的个人博客网站，README 说明其基于 `Astro Minimal Blog` 改造。
- 主要语言与内容：中文个人博客，包含文章、诗歌、简介、标签页和 RSS。
- 当前站点定位：作者的个人数字空间，首页文案为“见字如晤，这是我的数字空间 ZIK-Trinity”。
- 视觉风格：黑白灰 `zinc` 系、暗色模式、细腻动画、固定顶部导航、背景点阵与氛围光效。

## 技术栈

- Astro `5.5.6`
- Tailwind CSS `3.x` 与 `@tailwindcss/typography`
- `@astrojs/react`，项目中主要用于 React 图标组件等兼容场景
- `@astrojs/rss` 生成 RSS
- `@astrojs/mdx` 已安装，可支持 MDX 内容
- `reading-time` 用于文章和诗歌详情页阅读时长计算
- `react-icons` 用于简介页图标
- `html2canvas` 在 `ShareButtons.astro` 中通过 CDN 引入，当前截图功能大多处于注释或备用状态

## 常用命令

项目脚本定义在 `package.json`：

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm run content:clean
CONTENT_SOURCE_DIR=../zik-trinity-content pnpm dev
```

也存在 `package-lock.json`，但 `package.json` 明确声明 `packageManager` 为 `pnpm@10.12.1`，后续优先使用 `pnpm`。

## 目录结构

```text
.
├── public/                  静态资源、favicon、图片、logo、robots、脚本
├── src/
│   ├── components/          导航、页脚、主题切换、背景、日期、标签、分享按钮
│   ├── content/             Astro 内容同步工作区；正文目录由外部内容仓库生成，不在本站仓库维护
│   ├── content.config.ts    Astro 内容集合定义
│   ├── layouts/             通用布局、博客文章布局、诗歌布局、Markdown 样式
│   ├── pages/               Astro 页面与路由
│   ├── styles/              全局 Tailwind/CSS
│   ├── types/               Astro 类型声明
│   ├── consts.ts            站点标题和描述
│   └── utils/               小工具函数
├── astro.config.mjs         Astro 配置
├── tailwind.config.cjs      Tailwind 配置
├── tsconfig.json            TypeScript 配置
├── wrangler.toml            Cloudflare 静态资源部署配置
└── README.md                项目 README
```

## 内容仓库与集合

正文内容已经拆分到外部仓库：

```text
https://github.com/mitatis/zik-trinity-content
```

本站仓库只保留同步机制和集合定义，不维护长期正文。`scripts/prepare-content.mjs` 会在 `pnpm dev`、`pnpm start` 和 `pnpm build` 前克隆/更新内容仓库到 `.content/`，再把 `blog/` 与 `poetry/` 同步到 Astro 需要的 `src/content/blog/` 与 `src/content/poetry/`。

默认构建读取 `CONTENT_REPO_URL` 指向的 Git 内容，因此外部仓库中的文章需要先 commit/push，线上构建才会读到。若要在本地预览同级内容仓库里的未提交草稿，可使用：

```bash
CONTENT_SOURCE_DIR=../zik-trinity-content pnpm dev
```

如果开发服务器已经在运行，修改外部内容仓库后可重新执行 `CONTENT_SOURCE_DIR=../zik-trinity-content pnpm run prepare:content`，让生成目录同步到 `src/content/`。

内容集合定义在 `src/content.config.ts`：

```ts
const blog = defineCollection({ type: 'content' })
const poetry = defineCollection({ type: 'content' })
```

`src/content/blog/`、`src/content/poetry/` 与 `.content/` 都是本地生成目录，已被 `.gitignore` 忽略。后续写文章或诗歌时，应只在外部内容仓库中修改：

```text
zik-trinity-content/
├── blog/      博客文章 Markdown
├── poetry/    诗歌 Markdown
└── assets/    文章图片和附件
```

图片也放在内容仓库 `assets/`，构建时同步到网站仓库的 `public/content-assets/`。文章 frontmatter 和 Markdown 正文统一引用公开路径，例如 `/content-assets/example.jpg`。

目前没有严格 schema，所以 Markdown frontmatter 依赖页面读取字段。常见字段包括：

- `title`
- `description`
- `pubDate`
- `updatedDate`
- `heroImage`
- `image`
- `readingTime`
- `tags`
- `draft`

站点读取规则：

- `blog` 页面会按 `pubDate` 倒序排序，并读取 `description`、`tags`、`heroImage`、`image`、`readingTime` 等字段。
- 首页会过滤 `post.data.draft`，展示最近 3 篇博客文章和前 5 个标签。
- `poetry` 页面也按 `pubDate` 倒序排序，诗歌正文使用更偏诗歌排版的 `Poem.astro`。
- 如果需要清理本地同步副本，运行 `pnpm run content:clean`；下次 `pnpm dev` 或 `pnpm build` 会重新从外部仓库同步内容与图片。

## 路由与页面

- `/`：首页，展示 Hero、最新博客文章和主题入口。
- `/blog`：博客列表页，按年份归档，首篇文章作为 featured post。
- `/blog/[...slug]`：博客详情页，静态预渲染，自动计算阅读时长，提供上一篇/下一篇导航。
- `/poetry`：诗歌列表页，按年份归档。
- `/poetry/[...slug]`：诗歌详情页，静态预渲染，使用诗歌专用布局。
- `/tags`：博客标签云，仅统计 `blog` 集合。
- `/tags/[tag]`：某个博客标签下的文章列表，仅基于 `blog` 集合。
- `/about`：作者简介页，包含个人介绍、写作说明、外部站点入口、经历信息等。
- `/building`：建设中页面。
- `/404`：自定义 404 页面。
- `/rss.xml`：RSS 输出，仅基于 `blog` 集合。

## 布局与组件

- `src/layouts/Layout.astro`
  - 根 HTML 布局。
  - 引入 `Navigation`、`Footer`、`Background`、全局 CSS 和 Markdown CSS。
  - 负责 favicon、站点 meta、暗色模式初始化、固定宽度主容器、页面过渡遮罩和自定义 SPA 式导航逻辑。

- `src/layouts/BaseLayout.astro`
  - `Layout` 的轻量封装。
  - 默认描述为“Mitatis的数字空间”。
  - 额外监听主题切换事件。

- `src/layouts/BlogPost.astro`
  - 博客详情布局。
  - 展示标题、日期、更新时间、阅读时长、标签、Hero 图片、正文和分享按钮。
  - 含代码块复制、代码块样式修正、标题入场动画等客户端脚本。

- `src/layouts/Poem.astro`
  - 诗歌详情布局。
  - 诗歌正文居中，使用 `poem-container`、`poem-body` 等样式。
  - 包含分享按钮和部分文章动画增强逻辑。

- `src/components/Navigation.astro`
  - 固定顶部导航。
  - 桌面端显示链接：主页、文章、标签、诗歌、简介。
  - 移动端使用全屏菜单。

- `src/components/ThemeToggle.astro`
  - 暗色模式切换按钮。
  - 使用 `localStorage.theme` 保存偏好，并监听系统暗色模式变化。

- `src/components/Footer.astro`
  - 页脚，包含品牌、外部链接、社交链接、联系方式和 Astro powered by。

- `src/components/ShareButtons.astro`
  - 当前主要功能是复制当前链接。
  - 文件中保留了社交分享、截图生成等注释或备用逻辑。

## 样式系统

- 全局样式在 `src/styles/global.css`。
- Markdown 样式在 `src/layouts/styles/markdown.css`。
- Tailwind 使用 `darkMode: 'class'`。
- 主题色大量使用 Tailwind `zinc` 色阶。
- 全局字体主要是 Google Fonts `Inter`。
- 诗歌相关样式里使用 `Noto Serif SC` 字体族，但当前未看到单独的字体加载配置。
- 多个页面和组件内存在局部 `<style>` 与内联客户端脚本，修改时要同时检查 Astro 模板、局部 CSS 和脚本行为。

## 部署与环境

- `astro.config.mjs` 中 `site` 会根据环境动态推导：
  - `VERCEL_URL`
  - `VERCEL_BRANCH_URL`
  - 默认 `http://localhost:4321`
- `wrangler.toml` 配置为将 `./dist` 作为 Cloudflare assets 目录。
- `.env.example` 暴露了 Spotify 相关变量名：
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `SPOTIFY_REFRESH_TOKEN`
- 当前代码中只看到这些 Spotify 环境变量被 `astro.config.mjs` 注入到 Vite define，未看到实际页面使用。

## 已知注意事项

- `astro.config.mjs` 中出现了两个 `integrations` 字段，后一个会覆盖前一个。当前实际生效的是 `tailwind()` 和 `react()` 这一组。如果后续修改配置，建议顺手合并成单个 `integrations`。
- `tsconfig.json` 中仍有 Next.js 相关 `plugins` 与 `include` 条目，例如 `next-env.d.ts` 和 `.next/types/**/*.ts`。这是历史遗留迹象，若遇到类型检查异常应优先检查这里。
- `src/pages/tags/[tag].astro` 中有构建期 `console.log`，用于输出标签调试信息。
- 站内存在自定义 SPA 式页面切换脚本，多个组件会用 `data-spa-handled` 避免重复绑定事件。修改导航或链接行为时要注意不要造成重复监听或阻断正常跳转。
- `ThemeToggle.astro`、`Layout.astro`、`BaseLayout.astro` 都参与主题切换或主题事件处理。调整暗色模式时需要整体检查。
- `.content/`、`src/content/blog/`、`src/content/poetry/` 和 `public/content-assets/` 都是外部内容仓库同步出来的本地副本。除非任务明确要求调试同步结果，不要在这些目录里长期编辑正文或图片。
- `dist/`、`.astro/`、`node_modules/` 是生成或依赖目录，常规修改不要触碰。

## 后续修改建议

- 新增博客文章：在外部仓库 `zik-trinity-content/blog/` 中新增 Markdown，补齐 `title`、`description`、`pubDate`、`tags` 等 frontmatter。
- 新增诗歌：在外部仓库 `zik-trinity-content/poetry/` 中新增 Markdown，至少补齐 `title` 和 `pubDate`。
- 新增文章图片：放在外部仓库 `zik-trinity-content/assets/`，在文章中用 `/content-assets/...` 引用。
- 修改导航：先看 `src/components/Navigation.astro`，再检查页脚 `src/components/Footer.astro` 是否也需要同步。
- 修改全站布局：优先看 `src/layouts/Layout.astro` 和 `src/layouts/BaseLayout.astro`。
- 修改博客详情体验：优先看 `src/layouts/BlogPost.astro` 和 `src/pages/blog/[...slug].astro`。
- 修改诗歌详情体验：优先看 `src/layouts/Poem.astro` 和 `src/pages/poetry/[...slug].astro`。
- 修改标签逻辑：目前标签只基于 `blog` 集合，若要纳入诗歌，需要同步调整 `/tags` 与 `/tags/[tag]` 两个页面。
- 完成源码改动后，优先运行 `pnpm build` 验证 Astro 构建。

## 本仓库协作偏好

- 如果需要撰写较大篇幅的文档、说明、手册等，优先使用 HTML 输出更精致易懂的结果，并适当考虑页面布局和渲染效果。
- 本项目已有较强的中文表达和视觉氛围，新增文案应尽量保持中文语境自然，不要突然切换成技术模板化语言。
- 不要无关重构大量内联脚本或样式。现有代码里有不少页面级动画和移动端适配逻辑，改动应尽量小步、可验证。
