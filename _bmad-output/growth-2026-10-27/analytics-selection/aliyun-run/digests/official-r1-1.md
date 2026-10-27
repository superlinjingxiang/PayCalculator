# Official source digest (accessed 2026-10-27)

Publisher for all: Alibaba Cloud. Publication dates not exposed in retrieved page bodies. Confidence medium, independent verification unverified. Report source numbers refer to ../research.md and ../../aliyun.md.

- [1] capability/semantics: SLS Nginx integration creates dashboards; PV count(1), UV approx_distinct(remote_addr), top referer and request path. Sources include exact SQL; this is server-request analytics rather than browser human identity.
- [2] integration: RUM accepts script or npm; create application using name/description, receive endpoint. IP/HTTP not explicitly guaranteed, so compatibility remains an implementation inference.
- [3] pricing: SLS function-based plan is postpaid daily; monthly free quotas are bounded and excess billed. Pricing link failed to load this run; no exact Shanghai excess rate asserted.
- [4] integration: SLS needs machine group, remote port 80/443 connectivity, and incrementing access log; domain/HTTPS absent from stated prerequisites. Existing history is not automatically backfilled by this configuration.
- [5] semantics: RUM uses view.id/user.id/session.id.
- [6] data: SDK-generated user ID; view.referrer and full view.url fields; these require privacy-conscious configuration in later implementation.
- [7] activation: SLS must be opened and creates service-linked role.
- [8] terms: official HTTPDNS SLS flow requires reading/selecting SLS agreement. This does not prove the exact agreement version shown to this account.
- [9] pricing: quotas account-shared; new Logstore defaults to ingest-based billing, so don't apply function-based quotas to every new store.
- [10] pricing: current mainland public cloud RUM 0.15 yuan/OCU, 80 OCU monthly session allowance; Web 200 billing sessions/OCU; other charges exist. Approx 16,000 sessions/month and 7.5 yuan/10,000 excess billing sessions are calculations, not independent tariff quotes.

Unresolved: actual account status/quotas; SLS Shanghai excess prices; RUM naked IP HTTP validation; precise current activation terms/qualification requirements. Stop reason: scope coverage with explicit remaining gaps; no account actions authorized in this research subtask.
