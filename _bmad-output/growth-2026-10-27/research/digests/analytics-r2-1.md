# 第一方PV补充

访问2026-10-27。主agent询问同源像素、Nginx白名单日志与离线汇总的可行性；项目服务器现状不充当证据。

- [Nginx日志模块](https://nginx.org/en/docs/http/ngx_http_log_module.html)，发布日未标注：log_format自定义字段，access_log可按location设置并条件记录，off关闭当前级别日志。中/官方单源。
- [Nginx empty GIF](https://nginx.org/en/docs/http/ngx_http_empty_gif_module.html)，发布日未标注：location可输出1像素透明GIF。中/官方单源。
- [MDN sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)，更新2026-10-25：POST上报；true仅表示排队；非POST或控制请求属性使用fetch keepalive。中/文档单源。

推论：可在不记IP/referrer/query/工资的自定义日志中记录白名单路径与时间，离线汇总PV；需禁止缓存、处理路由重复、生产/预览隔离和日志保护。无标识符不能报告UV；仅上报成功的匿名PV不能保证精确真人数量。
