
# ✨ ZIK-Trinity

<p align="center">
  <img src="public/favicon.svg" alt="Astro Blog Logo" width="120" height="120">
</p>

  <strong>基于 [Astro Minimal Blog](https://github.com/williamcachamwri/astro-blog) 的个人博客网站</strong>

<p align="center">
  <a href="#部署">部署</a> •
  <a href="#项目结构">项目结构</a> •
</p>

## 内容仓库

文章和诗歌内容只在独立仓库维护：

```text
https://github.com/mitatis/zik-trinity-content
```

网站仓库不再跟踪正文。`src/content/blog`、`src/content/poetry` 与 `src/content/journal` 只是本地生成目录：执行 `pnpm dev` 或 `pnpm build` 前，脚本会先克隆内容仓库到 `.content/`，再同步到 Astro 需要的 `src/content/` 目录。

以后写文章、诗歌或日志时，只需要在内容仓库中新增或修改文件：

```text
zik-trinity-content/
├── blog/              # 博客文章 Markdown
├── poetry/            # 诗歌 Markdown
├── journal/           # 日志 Markdown
└── content-assets/    # 文章图片和附件
```

不要把正文写进本网站仓库的 `src/content/blog`、`src/content/poetry` 或 `src/content/journal`，这些目录会在同步时被覆盖，并且不会进入 Git。

图片统一放在内容仓库的 `content-assets/`。构建时会同步到网站的 `public/content-assets/`，文章中使用公开路径：

```yaml
heroImage: /content-assets/example.jpg
image: /content-assets/example.jpg
```

Markdown 正文中也使用同样路径：

```md
![说明](/content-assets/example.jpg)
```

如果希望在内容仓库或 Obsidian 里直接预览图片，也可以在 Markdown 正文和 frontmatter 中写相对路径：

```md
![说明](../content-assets/example.jpg)
```

同步脚本会在生成网站内容时把 `../content-assets/` 与 `content-assets/` 引用统一转成 `/content-assets/`。旧的 `assets/` 目录和 `assets/` 引用都不再兼容；如果同步源里还存在旧目录或旧引用，构建会直接报错，必须先改成 `content-assets/`。

可用环境变量：

```bash
CONTENT_REPO_URL=https://github.com/mitatis/zik-trinity-content.git
CONTENT_REF=main
CONTENT_DIR=.content
CONTENT_SOURCE_DIR=../zik-trinity-content
```

部署和普通构建默认从 `CONTENT_REPO_URL` 克隆已提交内容。也就是说，外部内容仓库里的文章需要先 commit/push，线上构建才会读到。

本地写作预览时，可以直接读取同级内容仓库工作区，包括尚未提交的草稿：

```bash
CONTENT_SOURCE_DIR=../zik-trinity-content pnpm dev
```

如果开发服务器已经在运行，修改外部内容仓库后可重新同步一次：

```bash
CONTENT_SOURCE_DIR=../zik-trinity-content pnpm run prepare:content
```

需要清理本地同步副本时：

```bash
pnpm run content:clean
```

这只会移除 `.content/`、`src/content/blog/`、`src/content/poetry/`、`src/content/journal/`、`public/content-assets/` 和 Astro 内容缓存；下次 `pnpm dev` 或 `pnpm build` 会自动重新同步，不会动外部内容仓库。

## 部署

### 环境要求

- Node.js 18+ and pnpm

### 安装

```bash
# Clone repository
git clone https://github.com/mitatis/zik-trinity

# Navigate to project directory
cd your-own-directory

# Install dependencies
pnpm install

# Create .env file from template
cp .env.example .env

# Edit .env with your information
```

### Dev

```bash
# Start development server
pnpm dev

# Open browser at http://localhost:4321
```

### Build

```bash
# Create production build
pnpm build

# Preview production build
pnpm preview
```

## 项目结构

```
/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── content/        # local sync workspace; blog/poetry are generated from content repo
│   ├── content.config.ts # Astro content collection definitions
│   ├── layouts/        # Page layouts
│   ├── pages/          # Pages and routes
│   ├── styles/         # CSS and Tailwind
│   └── utils/          # Utilities and helpers
├── astro.config.mjs    # Astro configuration
├── tailwind.config.js  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```
