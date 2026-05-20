
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

文章和诗歌内容已经拆分到独立仓库：

```text
https://github.com/mitatis/zik-trinity-content
```

网站仓库不再跟踪 `src/content/blog` 与 `src/content/poetry`。执行 `pnpm dev` 或 `pnpm build` 前，脚本会先克隆内容仓库到 `.content/`，再同步到 Astro 需要的 `src/content/` 目录。

可用环境变量：

```bash
CONTENT_REPO_URL=https://github.com/mitatis/zik-trinity-content.git
CONTENT_REF=main
CONTENT_DIR=.content
```

本地调试内容仓库时，可以临时改用同级本地仓库：

```bash
CONTENT_REPO_URL=../zik-trinity-content pnpm run prepare:content
pnpm dev
```

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
│   ├── content/        # Astro content config; blog/poetry are synced from content repo
│   ├── layouts/        # Page layouts
│   ├── pages/          # Pages and routes
│   ├── styles/         # CSS and Tailwind
│   └── utils/          # Utilities and helpers
├── astro.config.mjs    # Astro configuration
├── tailwind.config.js  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```
