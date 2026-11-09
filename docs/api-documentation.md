# CaseVault – API Documentation

## 1. Overview

The CaseVault backend exposes REST API endpoints through Next.js App Router Route Handlers.

The APIs support authentication, case management, evidence management, forensic operations, interviews, administrative operations, audit logs, dashboard information, and health checks.

Base URL during local development:

```text
http://localhost:3000
```

All protected endpoints require an authenticated Supabase session. Access is additionally controlled through PostgreSQL Row Level Security.

## 2. Authentication APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticates a user. |
| GET | `/api/auth/me` | Retrieves the authenticated user's profile. |

## 3. Case Management APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cases` | Retrieves accessible cases. |
| POST | `/api/cases` | Creates a case. |
| GET | `/api/cases/[id]` | Retrieves a case by ID. |
| PATCH | `/api/cases/[id]` | Updates a case. |
| GET | `/api/cases/search?q=` | Searches accessible cases. |

## 4. Evidence Management APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/evidence` | Retrieves accessible evidence. |
| POST | `/api/evidence` | Registers evidence. |
| GET | `/api/evidence/[id]` | Retrieves an evidence record. |
| GET | `/api/evidence/[id]/metadata` | Retrieves evidence metadata. |
| POST | `/api/evidence/[id]/metadata` | Creates evidence metadata. |
| POST | `/api/evidence/[id]/transfer` | Transfers evidence custody. |
| GET | `/api/evidence/[id]/transfers` | Retrieves evidence transfer history. |

Evidence registration validates the case, collector, and crime scene where applicable.

Evidence custody transfers use the database function `transfer_evidence()`.

## 5. Forensic Test APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forensic-tests` | Retrieves accessible forensic tests. |
| POST | `/api/forensic-tests` | Creates a forensic test request. |
| GET | `/api/forensic-tests/[id]` | Retrieves a forensic test. |
| PATCH | `/api/forensic-tests/[id]` | Updates a forensic test. |

Forensic tests support priority and status tracking.

The database validates test status transitions and requires an associated report before completion.

## 6. Forensic Report APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/forensic-reports` | Retrieves accessible forensic reports. |
| POST | `/api/forensic-reports` | Creates a forensic report. |
| GET | `/api/forensic-reports/[id]` | Retrieves a forensic report by ID. |

### Report Creation Workflow

The report creation endpoint performs the following operations:

1. Authenticates the requesting user.
2. Checks that the user is an active forensic analyst.
3. Validates the report request.
4. Retrieves the associated forensic test.
5. Verifies access to the test's evidence.
6. Derives the examiner ID from the authenticated user profile.
7. Inserts the relational report record into PostgreSQL.
8. Inserts detailed report information into MongoDB.
9. Updates the PostgreSQL record with the MongoDB ObjectId.
10. Allows the database trigger to complete the associated forensic test.

The examiner ID is derived server-side rather than accepted from the client.

Supported report types:
- `DNA`
- `FINGERPRINT`
- `DIGITAL`
- `CHEMICAL`
- `TOOLMARK`
- `BALLISTICS`

The confidence value must be between `0` and `1`.

## 7. Interview APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/interviews` | Retrieves accessible interviews. |
| POST | `/api/interviews` | Creates an interview. |
| GET | `/api/interviews/[id]` | Retrieves an interview. |
| PATCH | `/api/interviews/[id]` | Updates an interview. |

Interview transcript documents are maintained in MongoDB, with references associated with the PostgreSQL interview records.

There is no DELETE endpoint in the implemented interview workflow.

## 8. Administrative APIs

### Locations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/locations` | Retrieves locations. |
| POST | `/api/locations` | Creates a location. |
| GET | `/api/locations/[id]` | Retrieves a location. |
| PATCH | `/api/locations/[id]` | Updates a location. |
| DELETE | `/api/locations/[id]` | Deletes a location. |

### Crime Scenes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crime-scenes` | Retrieves crime scenes. |
| POST | `/api/crime-scenes` | Creates a crime scene. |
| GET | `/api/crime-scenes/[id]` | Retrieves a crime scene. |
| PATCH | `/api/crime-scenes/[id]` | Updates a crime scene. |
| DELETE | `/api/crime-scenes/[id]` | Deletes a crime scene. |

### People

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/people` | Retrieves people. |
| POST | `/api/people` | Creates a person. |
| GET | `/api/people/[id]` | Retrieves a person. |
| PATCH | `/api/people/[id]` | Updates a person. |
| DELETE | `/api/people/[id]` | Deletes a person. |

### Crimes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crimes` | Retrieves crimes. |
| POST | `/api/crimes` | Creates a crime. |
| GET | `/api/crimes/[id]` | Retrieves a crime. |
| PATCH | `/api/crimes/[id]` | Updates a crime. |
| DELETE | `/api/crimes/[id]` | Deletes a crime. |

### Investigator Assignments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/investigator-assignments` | Retrieves investigator assignments. |
| POST | `/api/investigator-assignments` | Creates an assignment. |
| GET | `/api/investigator-assignments/[id]` | Retrieves an assignment. |
| PATCH | `/api/investigator-assignments/[id]` | Updates an assignment. |
| DELETE | `/api/investigator-assignments/[id]` | Deletes an assignment. |

### Case-Person Associations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/case-person` | Retrieves case-person associations. |
| POST | `/api/case-person` | Creates an association. |
| GET | `/api/case-person/[id]` | Retrieves an association. |
| PATCH | `/api/case-person/[id]` | Updates an association. |
| DELETE | `/api/case-person/[id]` | Deletes an association. |

### Case-Crime Associations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/case-crime` | Retrieves case-crime associations. |
| POST | `/api/case-crime` | Creates an association. |
| GET | `/api/case-crime/[id]` | Retrieves an association. |
| PATCH | `/api/case-crime/[id]` | Updates an association. |
| DELETE | `/api/case-crime/[id]` | Deletes an association. |

## 9. Audit and Dashboard APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/audit-logs` | Retrieves audit log records. |
| GET | `/api/dashboard` | Retrieves dashboard information. |

The dashboard uses PostgreSQL views for case summaries, pending forensic work, current evidence custody, and investigator workload.

## 10. Health Check APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health/mongodb` | Checks MongoDB connectivity. |
| GET | `/api/health/postgres` | Checks PostgreSQL connectivity. |
| GET | `/api/health/supabase` | Checks Supabase authentication connectivity. |

## 11. Validation and Error Handling

Request payloads are validated using Zod schemas.

The backend validates:
- Required fields.
- Data types.
- Positive integer identifiers.
- Allowed enum values.
- String lengths and non-empty fields.
- Date and time formats.
- Nested report findings.
- Report confidence ranges.
- Unexpected fields through strict object schemas.

Common HTTP response categories include:

| Status | Meaning |
|---|---|
| 200 | Request successful. |
| 201 | Resource created. |
| 400 | Invalid request or constraint violation. |
| 401 | Authentication required. |
| 403 | Operation forbidden. |
| 404 | Resource not found or not visible under access policies. |
| 409 | Conflict with existing state or business rules. |
| 500 | Internal server error. |

Exact response bodies and error mappings are defined by the individual API handlers.

## 12. API Security

Protected endpoints use the authenticated Supabase session.

The backend combines:
- Authentication.
- Application role checks.
- Zod request validation.
- PostgreSQL RLS.
- Database constraints and triggers.
- Controlled database functions.

A successful HTTP response does not imply unrestricted database access. All operations remain subject to the configured role and row-level policies.

## 13. API Reference Maintenance

This document summarizes the implemented API modules. Before publishing a formal API contract, verify each endpoint's exact request schema, query parameters, response shape, and error mappings against its Route Handler and validation schema.