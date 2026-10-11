# 静态站部署说明

本工具不需要业务后端。`npm run build` 后把 `out/` 交给支持静态文件、HTTPS 和自定义域名的托管服务即可；对象存储加 CDN、静态页面托管或下方的 Nginx 都可作为部署形态。托管服务需要正确处理目录形式的 URL（例如 `/salary-calculator/` 对应 `salary-calculator/index.html`）和 `404.html`。Node.js 只在构建时需要，线上不必运行工资计算 API 或数据库。

本文件只描述部署步骤；**本仓库尚未部署到生产环境**。请先完成 [部署前检查清单](PRE_DEPLOY_CHECKLIST.md)。国内 ECS 面向大陆公开访问时，网站所有者应核实并完成适用的 ICP 备案等手续。下文 `your-domain.example`、服务器用户名和路径均是文档占位符，不能原样用于正式站点。

## 1. 本地构建与验收

本地 `release/paytools-0.2.0-static-preview.zip` 是无正式域名的预览交付包，内部直接包含静态站文件。当前 robots 禁止索引；正式发布前应设置真实域名并重新构建，不能把预览包当作正式 SEO 发布包。配套 `manifest.json` 记录文件摘要与验证状态。

构建机器安装 Node.js 20.9+；生产服务器只托管 `out/` 静态文件，不必运行 Node.js。Next.js [静态导出文档](https://nextjs.org/docs/app/guides/static-exports)说明 `output: "export"` 构建会生成 `out/`。

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

若已安装 Google Chrome，再运行 `npm run test:e2e`。检查 `out/index.html`、`out/salary-calculator/index.html`、`out/methodology/index.html`、`out/policy-sources/index.html`、`out/privacy/index.html`、`out/about/index.html`、`out/404.html`、`out/robots.txt` 与 `out/sitemap.xml`。

正式构建前，先把真实生产 HTTPS 源站写入 `.env.local` 的 `NEXT_PUBLIC_SITE_URL`（例如 `https://实际域名`，仅包括协议与域名，不含路径）。它是公开构建配置，不能放密钥。该变量在 **构建时** 生效；改域名后必须重新运行 `npm run build`。未配置或仍使用 `example.com`、`.example`、localhost 时，不会生成有效 canonical 或 sitemap URL，robots 将禁止抓取，适合本地与预发布检查，不适合正式公开站点。

## 2. Nginx 静态站配置示例

取得真实域名、完成备案和 TLS 证书配置后，将下列占位域名、证书路径和站点目录替换为实际值。服务器上以 `/srv/paytools/current` 指向当前发布目录。`trailingSlash: true` 导出的页面是目录中的 `index.html`，`try_files $uri $uri/` 可服务该路径；[Nginx 官方指令文档](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)。

```nginx
server {
    listen 80;
    server_name your-domain.example;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.example;
    root /srv/paytools/current;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/your-domain.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;

    access_log /var/log/nginx/paytools.access.log;
    error_log  /var/log/nginx/paytools.error.log warn;

    error_page 404 /404.html;

    location /_next/static/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ =404;
    }
}
```

先由网站所有者按实际证书服务商配置证书签发与自动续期，再执行 `sudo nginx -t` 和 `sudo systemctl reload nginx`。开启阿里云安全组与主机防火墙所需的 80/443 端口，并确认 HTTP 自动跳转 HTTPS。静态站无需配置反向代理到 `next start`。

## 3. 上传、切换与回滚

建议在服务器保留独立的发布目录，例如 `/srv/paytools/releases/2026-10-11-01/`，以便回滚。下例中的 `deploy@your-host` 是占位符；由网站所有者使用已配置的登录方式执行，不要把 SSH 密钥、实际 IP、口令或令牌写进仓库。

```bash
# 在本地构建机执行；先于服务器创建目标发布目录并设置合适权限
rsync -a out/ deploy@your-host:/srv/paytools/releases/2026-10-11-01/

# 在服务器检查发布内容，再以 current 符号链接指向新目录
test -f /srv/paytools/releases/2026-10-11-01/index.html
ln -s /srv/paytools/releases/2026-10-11-01 /srv/paytools/current.next
mv -Tf /srv/paytools/current.next /srv/paytools/current
sudo nginx -t && sudo systemctl reload nginx
```

若 `current` 首次不存在，先创建相同形式的符号链接。切换前记下 `readlink -f /srv/paytools/current` 指向的旧目录；回滚时将 `current.next` 指向旧目录，再执行同样的 `mv -Tf`、配置检查和 reload。不要直接在当前目录覆盖文件，以免发布中途出现新旧资源混用。保留至少一份已验证的旧发布目录，并定期备份 Nginx 配置、证书续期配置和规则发布记录；部署包可由源码和 lockfile 重新生成。

## 4. 上线后检查

- 用真实手机及桌面浏览器访问首页、计算器和全部说明页，核查表单、键盘操作、360px 宽度、跨 6/7 月结果和 404。
- 查看 `https://实际域名/robots.txt`、`/sitemap.xml` 与页面 canonical，确认仅包含正式域名；检查页面源代码能直接读到说明内容。
- 核对 Nginx 日志不写入工资表单金额；设置最小日志权限、轮转和保存期限，按实际情况更新隐私说明。
- 对 HTML 与政策页面采用可复核的新鲜度策略；`/_next/static/` 的哈希资源可长期缓存。更新政策后重新构建并验证缓存没有保留旧规则。
- 上线前复核 [政策参数来源](POLICY_SOURCES.md)。尚未核实的失业费率连续性和舍入假设应与单位实际扣缴核对。
- 真实广告 SDK 仍须保持关闭，直至网站所有者完成适用的资质、平台审核及隐私披露。
