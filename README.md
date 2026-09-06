# 海岸城 · Coastline (Web)

原创 GTA 风格海岸开放世界游戏的浏览器可玩版本。Unity 6 (6000.3.23f1) URP + Cinemachine 构建；角色基于 Quaternius Ultimate Modular Men（CC0），动作参考 Microsoft Rocketbox（MIT），北山客厅为按自有装修图纸自建模型；游戏设计、代码与城市资产版权归 Vimalinx 所有。

**Play:** https://vimalinx.com/coastline/ （GitHub Pages 直链 https://vimalinx.xyz/coastline/ 亦可）

An original GTA-style coastal open-world game, playable in the browser. Characters: Quaternius Ultimate Modular Men (CC0); locomotion reference: Microsoft Rocketbox (MIT). Game design, code and city assets © Vimalinx.

## 为什么需要 Service Worker

GitHub Pages 拒绝超过 100 MB 的文件，且静态 `.gz` 不会带 `Content-Encoding` 响应头，Unity loader 又不做客户端解压。因此 121 MB 的 `Web.data.gz` 拆成 4 块（`Web.data.gz.00`–`03`），由 `sw.js` 拼回、按 `Build/manifest.json` 校验 SHA-256，再用 `DecompressionStream` 解压全部 Unity 载荷后交给 loader。访客实际下载量与原构建一致（约 134 MB）。

## 构建出处

源工程 `CoastlineUnity`（本仓库只含 Web 发布产物）。构建凭证：`Artifacts/Builds/20260906T110216Z-web/receipt.json` —— Unity `6000.3.23f1`，WebGL player 138,558,875 字节，0 错误，城市资产构建 `c573e446a762bdaa`。

## 域名架构

`vimalinx.com/coastline/*` 由 Cloudflare Worker `coastline-proxy`（源码在 `worker/`，`wrangler deploy`）反代到 GitHub Pages 源站 `vimalinx.xyz/coastline/*`，字节流式透传并对 `Build/` 资产开启边缘缓存（`cacheEverything`，TTL 1 天）。该路由只接管 `/coastline/` 子树，主站其余路径不受影响；`.xyz` 域名与 Pages 绑定是回源依赖，需保留。
