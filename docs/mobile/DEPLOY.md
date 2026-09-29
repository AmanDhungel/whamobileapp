# Mobile Auth Phase 1 — Deployment Guide

This covers rolling out this phase's changes to production: new env vars, a database
index migration, and the order to do it all in. Written after a **read-only**
investigation of the actual production database (see the findings below) — nothing in
that investigation modified production.

## What production actually is (read this first)

Before this phase, `.env`'s `MONGODB_URL` had no database name in its path
(`mongodb+srv://...@wha.hw0slfn.mongodb.net/?appName=wha&...`). With no path segment,
both the native MongoDB driver and Mongoose fall back to a database literally named
**`test`** — so **production's real database is `test`**, on the `wha.hw0slfn.mongodb.net`
Atlas cluster. "wha" is the cluster/project name, not the database name — a database
literally named `wha` on that same cluster exists but is empty (confirmed: no `users`
collection at all). Whatever `MONGODB_URL` the production host is actually configured
with today should point at `.../test?...` (possibly with no path segment at all, same
as the pre-existing `.env`) — **do not** "fix" this to point at a database named `wha`
thinking that's more correct; `test` is where the real data already lives.

## Index migration — investigation findings

A prior report in this thread claimed production had the same non-sparse
`business_name` unique-index bug found in the `wha_test` test database. That was
**wrong**, and a direct read-only check against `test.users` (indexes + data) found
why:

- **`test.users` currently has NO index on `business_name` at all** — only `_id_`,
  `email_1` (unique), `googleId_1` (unique, sparse — already correct), and
  `geo_2dsphere`. The schema has said `business_name: {unique:true}` for a while, but
  that index apparently never successfully built against production's real data (most
  likely: it was added to the schema after production already had many users with no
  `business_name`, so Mongoose's background `autoIndex` sync failed to build it and
  logged a warning rather than crashing the app — the failure was silent).
- Of 40 total user documents: 37 are `category:"user"` (34 with no `business_name`),
  2 are `category:"business"` (both have one), 1 is `category:"super-admin"` (none).
  The two real values (`"Whats Happening Australia"`, `"CBR Nursing"`) are distinct —
  **no duplicates exist today**, so building a `sparse: true, unique: true` index
  cleanly succeeds against the current data with zero conflicts.
- **Conclusion**: no data cleanup is needed. A migration IS still recommended — not to
  fix broken data, but because right now `business_name` has **no uniqueness
  enforcement in production at all** (two businesses really could register under the
  same name today, silently) — and because relying on the app's implicit background
  `autoIndex` to build this on next deploy is the same silent-failure-prone mechanism
  that evidently already swallowed this once. Do it explicitly and watch it succeed,
  rather than hoping it does in the background.
- `appleId` is a brand-new field — no index exists for it yet either; same treatment.

## 1. Environment variables to set on the host

None of these exist on the host today (confirmed against `.env`, values never read
into this doc). All are additive — nothing existing changes.

| Variable | Required for | Notes |
|---|---|---|
| `MOBILE_JWT_SECRET` | All mobile access tokens | Generate a fresh, high-entropy random value — **do not reuse `NEXT_AUTH_SECRET`**, they're deliberately independent. E.g. `openssl rand -hex 48`. If this is missing at runtime, every mobile auth route that needs it fails closed with a clear 500 config-error message rather than proceeding unsigned — confirmed by the test pass. |
| `GOOGLE_IOS_CLIENT_ID` | `/auth/social` (Google, iOS app) | From the Google Cloud Console OAuth client for the iOS app bundle id. Optional at deploy time in the sense that omitting it doesn't break the build — it just means iOS Google sign-in fails closed with a config error until set. |
| `GOOGLE_ANDROID_CLIENT_ID` | `/auth/social` (Google, Android app) | Same, for the Android OAuth client. |
| `APPLE_CLIENT_ID` | `/auth/social` (Apple) | The Services ID / bundle identifier `aud` value Apple ID tokens will carry. Same fail-closed behavior if unset — confirmed in testing (Apple sign-in currently 500s with a clear message since this isn't set anywhere yet). |

`GOOGLE_CLIENT_ID` (already set, used by the web NextAuth Google provider) is also
accepted as a valid audience for mobile Google sign-in, so mobile Google sign-in isn't
fully blocked even before the two new Google vars are set — only the iOS/Android
native client flows specifically need them.

## 2. Database migration

**Take a backup first.** Against the real production connection (`mongodump` needs the
actual `MONGODB_URL`, not reproduced here):

```sh
mongodump --uri="$MONGODB_URL" --db=test --collection=users --out=./backup-pre-mobile-auth-$(date +%Y%m%d)
```

Then, connected via `mongosh` (or the Atlas UI's index editor) to the **`test`**
database:

```js
// 1. business_name — add sparse so "user"/guest accounts (which never set this)
//    stop colliding on the same implicit indexed null. Confirmed zero duplicate
//    values exist today, so this is expected to build instantly and cleanly.
db.users.createIndex(
  { business_name: 1 },
  { unique: true, sparse: true, name: "business_name_1" }
);

// 2. appleId — brand new field, mirrors the existing googleId_1 index exactly.
db.users.createIndex(
  { appleId: 1 },
  { unique: true, sparse: true, name: "appleId_1" }
);
```

Verify afterward:

```js
db.users.getIndexes();
// Expect to see business_name_1 {unique:true, sparse:true} and appleId_1
// {unique:true, sparse:true} alongside the pre-existing _id_, email_1, googleId_1,
// geo_2dsphere.
```

No migration is needed for `deletedAt` (unindexed, additive, defaults to `null`) or for
the `provider` enum gaining `"apple"` (schema-level validation only, no existing
document has that value so nothing is affected). The new `RefreshToken` collection
needs no manual migration either — it doesn't exist yet, so its indexes
(`tokenHash` unique, `userId`, and a TTL index on `expiresAt`) are created fresh the
first time the app writes to it after deploy.

## 3. Order of operations

1. **Backup** `test.users` (command above).
2. **Create the two indexes** explicitly (commands above) — do this *before*
   deploying the new code, so the constraint is already in place when the new
   `/auth/register`, `/auth/social`, and `/auth/guest` routes start running.
3. **Set the four new env vars** on the host (§1). `MOBILE_JWT_SECRET` is the only
   one that blocks core functionality if missing — the two Google platform IDs and
   `APPLE_CLIENT_ID` can be added slightly later if needed, since those specific
   social-sign-in paths just fail closed with a clear error until set, without
   affecting anything else (login, register, guest, refresh, `/me` all work without
   them).
4. **Deploy the code.**
5. **Smoke test** against production immediately after deploy: register a real
   throwaway test account end-to-end (send-code → verify-code → `/auth/register` →
   confirm 201 with tokens, not the `tokens:null` fallback path), `GET /me`, log out,
   log back in. Confirm an existing web login still works unaffected.
6. **Watch logs** for any `MongoServerError` around index creation or
   `MobileAuthConfigError` in the minutes after deploy — both would indicate something
   in steps 2-3 didn't take effect as expected.

## Rollback

The code changes are additive (new routes, new optional schema fields, one changed
index) — reverting the deploy doesn't require reverting the index migration; the new
indexes being present doesn't break the old code, since the old code never wrote
`business_name`/`appleId` in a way that would violate them (the only two production
`business_name` values are already unique, and nothing writes `appleId` outside the
new Apple sign-in path). If a rollback of the indexes is ever needed anyway:

```js
db.users.dropIndex("business_name_1");
db.users.dropIndex("appleId_1");
```
