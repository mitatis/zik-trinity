
# ✨ ZIK-Trinity

<p align="center">
  <img src="public/favicon.svg" alt="Astro Blog Logo" width="120" height="120">
</p>

  <strong>基于 [Astro Minimal Blog](https://github.com/williamcachamwri/astro-blog) 的个人博客网站</strong>

<p align="center">
  <a href="#部署">部署</a> •
  <a href="#项目结构">项目结构</a> •
</p>

## 部署

### 环境要求

- Node.js 16+ and npm/yarn

### 安装

```bash
# Clone repository
git clone https://github.com/mitatis/zik-trinity

# Navigate to project directory
cd your-own-directory

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Edit .env with your information
```

### Dev

```bash
# Start development server
npm run dev

# Open browser at http://localhost:4321
```

### Build

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 项目结构

```
/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── content/        # Blog content (Markdown/MDX)
│   ├── layouts/        # Page layouts
│   ├── pages/          # Pages and routes
│   ├── styles/         # CSS and Tailwind
│   └── utils/          # Utilities and helpers
├── astro.config.mjs    # Astro configuration
├── tailwind.config.js  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```
