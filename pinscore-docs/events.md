# Events System Documentation

## 1. System Overview

Pinscore v1 is a deterministic scoring system that computes creator scores from canonical engagement events. The system ingests standardized event objects through a single batch ingestion endpoint. Each event represents a verified interaction (e.g., like, comment, follow) tied to a creator and a platform.

All incoming events must conform to a fixed schema and enumerated types. Batches are validated atomically; if any event fails validation, the entire batch is rejected. Accepted events are stored and processed using predefined weight mappings. Scores are calculated by applying static weight values to event types and aggregating results per creator.

The system does not infer meaning, predict outcomes, or apply probabilistic models. All score outputs are the result of explicit weight definitions and recorded event data. Timestamps are normalized to UTC, and ingestion is constrained by strict payload, metadata, and rate limits to maintain consistency and system integrity.

Pinscore v1 prioritizes schema enforcement, deterministic computation, and reproducible results across identical inputs.

---

## 2. Canonical Event Definition

An Event is a single, time-bound, platform-originated fan action normalized into a fixed schema. It represents one discrete interaction between an actor (fan) and a target (creator).

**An Event IS:**
- One discrete action
- Tied to one creator
- On one platform
- At one timestamp
- Of one event_type

**An Event is NOT:**
- A summary or aggregate
- A session or behavioral window
- A prediction or inference
- A composite of multiple actions
- An inferred or derived metric

If multiple fan actions occur (e.g., like + comment), they must be recorded as separate Events.

---

## 3. Event Schema (JSON)

```json
{
  "event_id":   "uuid",
  "platform":   "instagram | twitter | youtube | tiktok",
  "creator_id": "string",
  "fan_id":     "string | null",
  "event_type": "like | comment | share | save | follow | click | mention | view | profile_visit",
  "value":       1,
  "metadata":   {},
  "timestamp":  "ISO_8601_UTC"
}
```

| Field       | Type          | Required | Constraint                              |
|-------------|---------------|----------|-----------------------------------------|
| event_id    | string (UUID) | Yes      | UUID v4 — globally unique               |
| platform    | string (enum) | Yes      | instagram, twitter, youtube, tiktok     |
| creator_id  | string        | Yes      | Always sourced from JWT                 |
| fan_id      | string\|null  | No       | Nullable when platform hides identity   |
| event_type  | string (enum) | Yes      | 9 atomic action types                   |
| value       | number        | Yes      | Default 1 — stored, not derived         |
| metadata    | object        | No       | Optional context — max 5KB              |
| timestamp   | string        | Yes      | ISO 8601 with UTC timezone required     |

Schema matches implementation. No additional fields introduced.

---

## 4. Event Weight Logic

### Weight Table (v1)

| Event Type    | Weight | Rationale                                |
|---------------|--------|------------------------------------------|
| follow        | 30     | Long-term intent and subscription signal |
| share         | 23     | Distribution action extending reach      |
| mention       | 18     | Public attribution or reference          |
| save          | 14     | Intent signal indicating future reference|
| comment       | 10     | Active engagement requiring effort       |
| click         | 7      | Direct interaction with linked content   |
| profile_visit | 4      | Interest signal preceding higher actions |
| like          | 2      | Low-friction engagement signal           |
| view          | 1      | Passive exposure signal                  |

### Scoring Formula

```
score_increment = value × weight(event_type)
```

All weights are statically defined in `src/scoring/weights.config.js`. No dynamic adjustment, contextual interpretation, or probabilistic modeling is applied. Identical event inputs will always produce identical score outputs.

### Scoring Process

1. Validate event type against the enum
2. Retrieve the fixed weight mapped to that type
3. Multiply by the provided numeric value
4. Aggregate results per creator

---

## 5. Ingestion Contract Summary

**Endpoint:** `POST /api/events/ingest`

**Authentication:** Requires valid JWT bearer token. Missing or invalid token → 401 UNAUTHORIZED.

### Request Contract

```json
{
  "events": [Event]
}
```

**Rules:**
- `events` must be an array — single object payloads are rejected
- Minimum 1 event required — empty arrays are rejected
- Maximum 100 events per request
- Maximum payload size: 1 MB
- Metadata per event must not exceed 5 KB
- All timestamps must be ISO 8601 with UTC timezone indicator (Z or offset)

### Response Contract (Success)

```json
{
  "success": true,
  "inserted": number
}
```

**Notes:**
- `inserted` represents total successfully stored events
- Raw database responses are never returned
- No partial success responses — strict atomic policy

### Validation Policy

Strict atomic validation — entire batch rejected if any of the following fail:
- `events` is missing, null, not an array, or empty
- Any event fails schema validation (missing fields, wrong types)
- Any `event_type` or `platform` is not in the allowed enum
- Any `timestamp` is invalid or missing UTC timezone indicator
- Any `event_id` already exists in the database (idempotency)
- Batch exceeds 100 events

No partial inserts. No silent failures.

**Error Codes:**

| Code                  | HTTP |
|-----------------------|------|
| INVALID_SCHEMA        | 400  |
| DUPLICATE_EVENT       | 409  |
| UNAUTHORIZED          | 401  |
| BATCH_LIMIT_EXCEEDED  | 400  |
| RATE_LIMIT_EXCEEDED   | 429  |

Error response format:
```json
{
  "success": false,
  "error":   "Human-readable message",
  "code":    "ERROR_CODE"
}
```

---

## 6. Constraints & Assumptions

- **Events are atomic.** Each event is processed as an independent record. No event depends on another for validity or weighting.
- **No cross-platform identity merge (v1).** Creator identity is treated as platform-scoped.
- **No predictive modeling.** Scoring is fully deterministic.
- **No time decay (v1).** Events contribute permanently to the score unless explicitly removed.
- **All timestamps are UTC.** Events must provide ISO 8601 timestamps with timezone information.
- **creator_id always sourced from JWT.** Body injection of creator_id is explicitly blocked.

---

## 7. Out of Scope (v1)

- Machine learning predictions
- Sentiment analysis
- Revenue attribution
- Real-time streaming ingestion
- Admin weight tuning dashboard
- Cross-platform identity merging
- Behavioral inference
- Manual score overrides
- Forecasting

---

## 8. Event Retrieval Contract (v1)

**Endpoint:** `GET /api/events`

**Authentication:** JWT required. `creator_id` is always sourced from the token — never from query parameters.

### Query Parameters

| Parameter | Type    | Default | Max | Behavior                        |
|-----------|---------|---------|-----|---------------------------------|
| page      | integer | 1       | —   | < 1 → rejected with 400         |
| limit     | integer | 25      | 100 | > 100 → clamped to 100          |

### Default Behavior

- Default page size: 25
- Maximum page size: 100
- Sort order: `timestamp DESC` (newest first)
- Pagination required on all responses

### Response Shape

```json
{
  "success": true,
  "page": 1,
  "limit": 25,
  "total": 75,
  "data": [
    {
      "event_id": "uuid",
      "platform": "instagram",
      "creator_id": "string",
      "fan_id": "string | null",
      "event_type": "like",
      "value": 1,
      "metadata": {},
      "timestamp": "ISO8601"
    }
  ]
}
```

### Field Definitions

- `page` — current page number
- `limit` — number of records returned in this response
- `total` — total records available for this creator (consistent across all pages)
- `data` — paginated event array, sorted newest first

### Contract Rules

- No raw Mongo response objects returned
- No internal `_id` or `__v` exposed
- Always structured JSON
- Always sorted by `timestamp` descending
- Always filtered by `creator_id = req.user.creator_id`
- Any `?creator_id=` query parameter is silently ignored — token controls scope

### Access Scope Rule

```
Events are ALWAYS filtered by creator_id = req.user.creator_id.
Any query parameter attempting to override creator_id is ignored.
No cross-creator visibility in v1.
```

### Error Codes

| Code                | HTTP | Trigger                           |
|---------------------|------|-----------------------------------|
| INVALID_PAGINATION  | 400  | page < 1 or limit < 1             |
| FETCH_FAILED        | 500  | Database error                    |
| UNAUTHORIZED        | 401  | Missing or invalid JWT            |



| Property             | Value                               |
|----------------------|-------------------------------------|
| Document version     | v1.0                                |
| Schema version       | v1                                  |
| Weight config version| v1                                  |
| Ingestion API version| v1                                  |
| OpenAPI spec version | 3.0.3                               |
| Document path        | /docs/events.md                     |
| System status        | Architecturally Locked — Day 1 Complete |

Any change to schema, weights, or ingestion rules requires a version increment and explicit documentation.

---

## Alignment Confirmation

Founder Alignment Confirmed — 2026-02-13  
System Version: v1.0  
Approved for Intelligence Phase

## 9. Version Declaration

| Property             | Value                               |
|----------------------|-------------------------------------|
| Document version     | v1.0                                |
| Schema version       | v1                                  |
| Weight config version| v1                                  |
| Ingestion API version| v1                                  |
| Retrieval API version| v1                                  |
| OpenAPI spec version | 3.0.3                               |
| Document path        | /docs/events.md                     |
| System status        | Architecturally Locked — Day 2 Complete |

Any change to schema, weights, or API contracts requires a version increment and explicit documentation.

---

## Alignment Confirmation

Founder Alignment Confirmed — 2026-02-13  
System Version: v1.0  
Approved for Intelligence Phase

---

## 10. Global Error Response Format

All endpoints must return errors in this exact shape. No deviations.

```json
{
  "success": false,
  "message": "Human readable description",
  "error":   "MACHINE_READABLE_CODE"
}
```

| Field     | Purpose                                  |
|-----------|------------------------------------------|
| `success` | Always `false` on error                  |
| `message` | Safe description for frontend display    |
| `error`   | Stable code — NOT a stack trace          |

### Standard Error Codes

| Code                | HTTP | Trigger                                      |
|---------------------|------|----------------------------------------------|
| INVALID_SCHEMA      | 400  | Missing fields, wrong types, bad enums       |
| BATCH_LIMIT_EXCEEDED| 400  | events array > 100                           |
| DUPLICATE_EVENT     | 409  | event_id already exists                      |
| UNAUTHORIZED        | 401  | Missing or invalid JWT                       |
| INVALID_PAGINATION  | 400  | (deprecated — pagination now coerces safely) |
| INGEST_FAILED       | 500  | DB failure during write                      |
| FETCH_FAILED        | 500  | DB failure during read                       |
| SERVER_ERROR        | 500  | Unhandled exception                          |
| NOT_FOUND           | 404  | Unknown endpoint                             |

### Enforcement

Central `error.middleware.js` catches all `next(err)` calls after all routes.
No controller may expose `err.message`, `err.stack`, or raw Mongo errors to the client.
