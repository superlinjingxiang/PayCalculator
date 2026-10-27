---
topic: opensource-analytics
type: technical
decision: existing-ECS-analytics
preset: quick
updated: 2026-10-27T22:54
---

- (assumption) Headless light technical select; no further delegation. Requirement context received from parent is constraints, not evidence. Deliverable opensource.md; use primary sources only; no deployments or code changes.
- (source) Read official Umami/Matomo/Plausible docs and pinned tags; digest opensource-r1.md. GHCR local unauth metadata 3.4.1=HTTP200 index sha256:e69d1a7932e9dab0fc523edc7be1f3a53f3c261f57856fc2167ae74a8fc022e8; v3.4.1=404. No server pull tested.
- (claim) ref=[1] status=unverified class=version pub=2026-10 — Umami release v3.4.1 and GHCR image 3.4.1 confirmed by official sources only; no independent publisher. BASE_PATH build-time requires custom build for full subpath dashboard.
- (claim) ref=[2] status=unverified class=integration pub=2026-10 — Pinned tracker derives collector host from script directory; proxy two exact paths can reuse official root image. Runtime integration untested.
- (claim) ref=[3] status=unverified class=data-boundary pub=2026-10 — Umami no tracking cookies, transient IP processing for session and geo, infrastructure logs may retain IP; query/hash filters present in pinned source.
- (event) Headless research complete; 27 numbered source rows, citation check passed with no dangling/orphans. Semantic source claims checked manually because caller prohibited further delegation. No code/account/browser/deployment actions. PG native packages route awaiting target OS; dashboard tunnel awaiting parent Aliyun research.
