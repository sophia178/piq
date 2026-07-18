# Debug Session: runtime-auth-billing
- **Status**: [OPEN]
- **Issue**: Verify snapshot-threading under cold-start conditions, audit auth consistency, and validate targeted billing/auth/UI changes with runtime evidence.
- **Debug Server**: not started
- **Log File**: `.dbg/trae-debug-log-runtime-auth-billing.ndjson`

## Reproduction Steps
1. Audit `user` dereferences reachable from `getAuthenticatedAppContext()`.
2. Add temporary counters to `getBidWorkspaceSnapshot()` and `getBidReviewSnapshot()`.
3. Hit one cold-start Workspace request and one Exports request for a project with zero review and prediction rows.
4. Remove temporary instrumentation immediately after capture.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | One or more pages dereference `user` from `getAuthenticatedAppContext()` without a null guard, breaking demo mode. | Medium | Low | Pending |
| B | The snapshot-threading fix reduces cold-start Workspace requests to one `getBidWorkspaceSnapshot()` call per request. | High | Medium | Pending |
| C | The Exports path still causes more than one `getBidReviewSnapshot()` or `getBidWorkspaceSnapshot()` call on a cold-start project. | High | Medium | Pending |
| D | Some `(app)` pages still use a different auth entrypoint than `getAuthenticatedAppContext()`. | High | Low | Pending |
| E | The Stripe customer ID issue is caused either by a missing writer for `stripe_customer_id` or by the portal route reading the wrong source. | High | Medium | Pending |

## Log Evidence
- Pending.

## Verification Conclusion
- Pending.
