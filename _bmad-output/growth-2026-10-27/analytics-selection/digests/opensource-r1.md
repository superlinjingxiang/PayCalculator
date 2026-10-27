# Open-source analytics evidence digest

Accessed 2026-10-27. Technical/select, headless lightweight run, primary sources only. No further delegation; server resources and registry reachability were not tested. Parent-provided project context sets requirements only.

| Claim | Source | Publisher | Publication | Confidence / class |
|---|---|---|---|---|
| Umami latest stable v3.4.1, security update | https://github.com/umami-software/umami/releases/tag/v3.4.1 | Umami | 2026-10-23 | medium / version |
| Umami official installation uses Node + PostgreSQL, prebuilt image; upstream compose uses PG15 | https://docs.umami.is/docs/install ; https://raw.githubusercontent.com/umami-software/umami/v3.4.1/docker-compose.yml | Umami | undated / release tag | medium / compatibility |
| BASE_PATH is build-time; Dockerfile declares build ARG, next config embeds basePath | https://docs.umami.is/docs/environment-variables ; https://raw.githubusercontent.com/umami-software/umami/v3.4.1/Dockerfile ; https://raw.githubusercontent.com/umami-software/umami/v3.4.1/next.config.ts | Umami | undated / release tag | medium / integration |
| Tracker derives collector host from script directory, strips query/hash with flags, hooks pushState/replaceState, supports before-send | https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/tracker/index.ts | Umami | release tag | medium / integration |
| Tracker no cookies; IP processed for ID/geo but not a normal analytics record field | https://docs.umami.is/docs/faq ; https://docs.umami.is/docs/metric-definitions | Umami | undated | medium / data boundary |
| Umami MIT | https://raw.githubusercontent.com/umami-software/umami/v3.4.1/LICENSE | Umami | release tag | medium / license |
| Matomo stable 5.14.2; 6 beta is not stable | https://matomo.org/changelog/ ; https://www.matomo.com/docs/installation/ | Matomo | 2026-10-22 / undated | medium / version |
| Matomo PHP8 + MySQL/MariaDB; small-site recommended 2 CPU/2GB/50GB | https://matomo.org/faq/on-premise/matomo-requirements/ | Matomo | undated | medium / resource |
| Matomo official Docker, production archive cron, subpath reverse proxy supported | https://github.com/matomo-org/docker ; https://matomo.org/faq/how-to-install/install-matomo-with-docker/ ; https://matomo.org/faq/how-to-install/faq_98/ | Matomo | undated | medium / operations |
| Matomo SPA requires history trigger or manual pageviews; cookie disable and IP masking available | https://developer.matomo.org/guides/spa-tracking ; https://matomo.org/faq/how-to/how-do-i-enforce-tracking-without-cookies/ ; https://matomo.org/faq/general/configure-privacy-settings-in-matomo/ | Matomo | undated | medium / integration |
| Matomo GPL3 | https://raw.githubusercontent.com/matomo-org/matomo/5.14.2/LICENSE | Matomo | release tag | medium / license |
| Plausible CE stable v3.2.1 security release | https://github.com/plausible/analytics/releases/tag/v3.2.1 | Plausible | 2026-05-15 | medium / version |
| CE requires Docker Compose, recommends >=2GB RAM, SSE4.2/NEON; Compose PG16 + ClickHouse24.12 | https://github.com/plausible/community-edition ; https://raw.githubusercontent.com/plausible/community-edition/v3.2.1/compose.yml | Plausible | undated / release tag | medium / resource |
| CE application AGPL3; compose example repo MIT is a separate license | https://raw.githubusercontent.com/plausible/analytics/v3.2.1/LICENSE.md ; https://github.com/plausible/community-edition | Plausible | release tag / undated | medium / license |
| CE supports local HTTP and configured base URL; dashboard session secrets and registration restriction | https://github.com/plausible/community-edition/wiki/Configuration ; https://github.com/plausible/community-edition | Plausible | 2025-10-29 / undated | medium / integration |

Independent publisher corroboration is unavailable under this official-docs-only lightweight scope. Multiple vendor docs/code checks increase confidence in API accuracy but are not independent verification. All ledger claims remain unverified by the skill's strict definition. No hard performance claim is used to choose Umami: fewer stateful components is architecture judgment, not measured RSS.

Leads/open: actual ECS free RAM/disk/CPU; Docker availability; container registry access from Shanghai; pinned image manifests; dashboard HTTP auth behavior; Next client navigation back/forward; screenshot/report acceptance. No published exact minimum RAM for Umami found in the retrieved official install page. Plausible subdirectory compatibility intentionally not chased after resource/operations screen.
