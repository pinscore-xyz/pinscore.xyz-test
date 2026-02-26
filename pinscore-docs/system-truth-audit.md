# System Truth Audit
## Day 2 — Task 8 — CPSA Lock

---

## Canonical Flow (Frozen)

```
1. Login           →  POST /api/auth/login
2. Ingest events   →  POST /api/events/ingest  (auth required)
3. MongoDB write   →  Event.insertMany()        (atomic, ordered)
4. Retrieve events →  GET  /api/events          (auth required)
5. UI renders      →  Dashboard reflects exact DB state
```

No deviations. No direct DB manipulation. No seed script substitution in validation.

---

## Test Data (Canonical)

### Auth
```
Token structure:  Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>
Payload contains: { creator_id, email, iat, exp }
creator_id:       <MongoDB ObjectId of authenticated user>
```

### Sample Ingest Payload
```json
{
  "events": [
    {
      "event_id":   "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "platform":   "instagram",
      "fan_id":     "fan_001",
      "event_type": "like",
      "value":      1,
      "metadata":   {},
      "timestamp":  "2026-02-18T09:45:00Z"
    }
  ]
}
```

> ⚠️ The CPSA spec uses `event_type: "purchase"` in examples.
> `purchase` is NOT in the v1 canonical enum and will be rejected with 400.
> Use valid enum values: `like`, `comment`, `share`, `save`, `follow`, `click`, `mention`, `view`, `profile_visit`.

### Expected POST Response — 201
```json
{
  "success": true,
  "inserted": 1
}
```

### Expected DB Record
```json
{
  "_id":        "<ObjectId>",
  "event_id":   "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "platform":   "instagram",
  "creator_id": "<from JWT — never from body>",
  "fan_id":     "fan_001",
  "event_type": "like",
  "value":      1,
  "metadata":   {},
  "timestamp":  "2026-02-18T09:45:00.000Z",
  "__v":        0
}
```

### Expected GET Response — 200
```json
{
  "success": true,
  "page":    1,
  "limit":   25,
  "total":   76,
  "data": [
    {
      "event_id":   "a1b2c3d4-...",
      "platform":   "instagram",
      "creator_id": "<from JWT>",
      "fan_id":     "fan_001",
      "event_type": "like",
      "value":      1,
      "timestamp":  "2026-02-18T09:45:00.000Z"
    }
  ]
}
```

### Expected UI State
```
Total Events: 76
like  instagram  fan_001  Feb 18, 2026
```

---

## Success Criteria

### Backend
| Criterion                                  | Verified |
|--------------------------------------------|----------|
| POST /ingest returns 201                   |          |
| GET  /events returns 200                   |          |
| 401 returned without token                 |          |
| 400 returned on invalid payload            |          |
| 400 returned for unknown event_type        |          |
| 409 returned on duplicate event_id         |          |
| 500 structured on forced DB failure        |          |
| Server does not crash on any input         |          |

### Data Integrity
| Criterion                                  | Verified |
|--------------------------------------------|----------|
| Inserted data persists in MongoDB          |          |
| `creator_id` matches JWT — not body        |          |
| Spoofed body `creator_id` is overwritten   |          |
| GET `total` matches DB count exactly       |          |
| GET `data` contains newly inserted event   |          |
| Events sorted DESC (newest first)          |          |
| Only requesting creator's events returned  |          |

### Frontend
| Criterion                                  | Verified |
|--------------------------------------------|----------|
| Loading state visible during fetch         |          |
| Error state visible on backend shutdown    |          |
| Empty state visible if no records          |          |
| Event count shows backend `total`          |          |
| No console red errors                      |          |
| No unhandled promise rejections            |          |
| Network tab shows Authorization header     |          |
| No `creator_id` sent from frontend body    |          |

### Stability
| Criterion                                  | Verified |
|--------------------------------------------|----------|
| Backend does not crash under bad input     |          |
| Frontend does not white-screen on failure  |          |
| No raw stack traces in any response        |          |
| Error shape consistent: `{success, message, error}` |   |

---

## Resilience Matrix

| Scenario               | Expected HTTP | Expected Body                              |
|------------------------|---------------|--------------------------------------------|
| No token (GET)         | 401           | `{success:false, message:..., error:...}`  |
| No token (POST)        | 401           | `{success:false, message:..., error:...}`  |
| events not array       | 400           | `{..., error:"INVALID_SCHEMA"}`            |
| Unknown event_type     | 400           | `{..., error:"INVALID_SCHEMA"}`            |
| Batch > 100            | 400           | `{..., error:"BATCH_LIMIT_EXCEEDED"}`      |
| Duplicate event_id     | 409           | `{..., error:"DUPLICATE_EVENT"}`           |
| DB failure (ingest)    | 500           | `{..., error:"INGEST_FAILED"}`             |
| DB failure (fetch)     | 500           | `{..., error:"FETCH_FAILED"}`              |
| Empty dataset          | 200           | `{success:true, total:0, data:[]}`         |
| Server down (frontend) | N/A           | Error card rendered, no crash              |

---

## Automated Audit

Run:
```bash
AUDIT_TOKEN=<jwt> node scripts/audit.js
```

Covers all automatable assertions from MAs 2.1, 2.3, 4.2, 4.3, and security checks.

---

## Manual Checklist (MA 2.2, 4.1, 3.1)

### MA 2.2 — MongoDB Compass
1. Connect to database
2. Navigate to `events` collection
3. Filter: `{ event_id: "<id from audit run>" }`
4. Confirm:
   - `creator_id` = JWT-derived value (NOT `"will_be_overridden"` or any injected value)
   - `fan_id` = `"fan_audit_001"`
   - `event_type` = `"like"`
   - `timestamp` stored as UTC Date

### MA 4.1 — Server Down (Frontend)
1. Stop backend (`CTRL+C`)
2. Refresh browser dashboard
3. Confirm: Error card appears with "Something went wrong / Unable to fetch events."
4. Confirm: No infinite spinner, no white screen, no React crash
5. Restart backend, refresh — data returns normally

### MA 3.1 — DevTools Network Tab
1. Open DevTools → Network tab
2. Reload dashboard
3. Select `events?page=1&limit=25` request
4. Confirm Request Headers:
   - `Authorization: Bearer <JWT>` (auto-injected by axios interceptor)
   - `Content-Type: application/json`
5. Confirm Response: `{ success, page, limit, total, data }`

---

## Day 2 Completion Gate

> **Data you send = Data stored = Data retrieved = Data rendered**
>
> No divergence at any point in the chain.
> System behaves correctly under success, failure, and security conditions.

Day 2 is not complete because code compiles.
It is complete because the system behaves exactly as documented.
