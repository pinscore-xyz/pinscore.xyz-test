/**
 * weights.config.js
 * ─────────────────
 * Day 3 — Task 2 — Weight Table Upgrade (v2)
 *
 * UPGRADE NOTICE:
 * Day 1 table superseded by Day 3 specification.
 * This is an upgrade, not a displacement — all 9 event types retained.
 * The three types omitted from the Day 3 spec (view, profile_visit, mention)
 * have been assigned weights that preserve the hierarchy and philosophy.
 *
 * Weight rationale:
 *   view          (1) — passive exposure, pre-engagement, lowest signal
 *   like          (1) — lowest friction active engagement, same tier as view
 *   click         (2) — interest expressed beyond passive reaction
 *   profile_visit (2) — intent signal, same tier as click (pre-comment)
 *   comment       (3) — requires thought and effort
 *   save          (4) — intent to revisit, value preservation
 *   share         (5) — amplifies content externally
 *   mention       (6) — public attribution, rare, above share, below follow
 *   follow        (8) — long-term relationship commitment
 *
 * Hierarchy: follow(8) > mention(6) > share(5) > save(4) > comment(3)
 *            > click/profile_visit(2) > like/view(1)
 *
 * POLICY (unchanged):
 * - Weights are version-controlled. Never edit at runtime.
 * - Any change requires version increment + score recalculation + docs update.
 * - No per-creator customization.
 * - No dynamic rebalancing.
 */

const eventWeights = {
  view:          1,
  like:          1,
  click:         2,
  profile_visit: 2,
  comment:       3,
  save:          4,
  share:         5,
  mention:       6,
  follow:        8,
};

const WEIGHT_VERSION = 'v2';

module.exports = { eventWeights, WEIGHT_VERSION };
