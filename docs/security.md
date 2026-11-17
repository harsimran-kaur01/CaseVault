# CaseVault – Security Documentation

## 1. Security Overview

CaseVault implements a layered security model to protect investigation records, forensic information, user accounts, and evidence custody records.

The backend uses authentication, role-based authorization, PostgreSQL Row Level Security, server-side validation, database functions, and triggers.

## 2. Authentication

Authentication is handled through Supabase Auth.

The backend uses a session-based Supabase server client to:
- Identify the authenticated user.
- Retrieve the current user session.
- Associate the authenticated account with an application profile.
- Enforce access through the user's authenticated database context.

The `app_user` table maintains the mapping between the Supabase Auth user ID, person ID, application role, and account activation status.

Inactive application accounts are not treated as active application users.

## 3. Application Roles

CaseVault uses three application roles.

| Role | Responsibility |
|---|---|
| Admin | Administrative management and privileged access. |
| Investigator | Case investigation, case-related records, and evidence operations within permitted assignments. |
| Forensic Analyst | Forensic examinations and report management. |

Role information is retrieved through the authenticated application profile and database helper functions.

## 4. Row Level Security

PostgreSQL Row Level Security (RLS) is enabled on all 16 application tables.

RLS policies control which records authenticated users can access and modify.

Important helper functions include:

| Function | Responsibility |
|---|---|
| `current_app_role()` | Identifies the current user's application role. |
| `current_person_id()` | Returns the person ID associated with the active user. |
| `is_assigned_to_case()` | Checks investigator assignment to a case. |
| `can_access_evidence()` | Determines evidence access according to the application role and assignment rules. |

RLS provides database-level enforcement in addition to API-level checks.

## 5. Case Access

Investigator access to case-related records is restricted through case assignment checks.

The backend uses investigator assignment information to determine whether an investigator can access relevant case records and evidence.

Administrative access is controlled through role-specific policies.

## 6. Evidence Security

Evidence records require additional protection because they represent physical or digital materials associated with investigations.

### 6.1 Evidence Registration

Evidence registration includes server-side validation of:
- Case existence and accessibility.
- Collector identity.
- Active investigator account status.
- Investigator assignment to the associated case.
- Crime scene association with the case.
- Evidence type and condition.
- Evidence identification code.

For investigators, the collector identity is derived from the authenticated session rather than trusted from the request body.

Administrators must provide an eligible collector.

Initial custody information is established through database defaults and triggers.

### 6.2 Evidence Custody

The current evidence holder and location represent the latest custody state.

Direct modification of these custody columns is restricted for the authenticated database role.

Custody changes must use the controlled `transfer_evidence()` database function.

### 6.3 Evidence Transfer

The `transfer_evidence()` function:
- Runs as a SECURITY DEFINER function.
- Uses a controlled search path.
- Checks the authenticated application role.
- Checks access to the evidence.
- Validates the recipient account.
- Checks investigator assignment where applicable.
- Validates the destination location.
- Locks the evidence record during the transfer.
- Inserts a transfer history record.
- Updates the current custody information.

Direct INSERT access to `evidence_transfer` is revoked from the authenticated role.

Transfer records are protected against direct UPDATE and DELETE operations through a database trigger.

### 6.4 Sealed Evidence Protection

Sealed evidence is protected by a database trigger.

The trigger prevents modification of protected descriptive and identification fields and prevents deletion of sealed evidence.

Controlled custody transfers remain possible because the trigger does not treat the current holder and location fields as ordinary descriptive modifications.

## 7. Forensic Security

Forensic records contain examination information and conclusions that must be protected from unauthorized modification.

### 7.1 Forensic Report Ownership

Forensic report creation derives the examiner ID from the authenticated analyst's application profile.

The API does not trust a client-supplied examiner ID.

PostgreSQL RLS further enforces examiner ownership.

Current report access rules:

| Operation | Admin | Forensic Analyst | Investigator |
|---|---|---|---|
| SELECT | All reports | Own reports | Reports linked to accessible evidence |
| INSERT | Yes | Own examiner ID | No |
| UPDATE | All reports | Own reports | No |
| DELETE | Yes | No | No |

The analyst's report SELECT, INSERT, and UPDATE policies enforce examiner ownership using `current_person_id()`.

### 7.2 Forensic Test Status

Forensic test status changes are validated at the database level.

The status validation trigger:
- Prevents completion without an associated forensic report.
- Prevents completed tests from being reopened.

The report completion trigger updates the associated forensic test to `completed` when a report has a non-null MongoDB reference.

The report completion trigger uses SECURITY DEFINER so that its controlled status update can execute independently of the analyst's direct test-update permissions.

### 7.3 MongoDB Report Linking

The report creation workflow stores:
1. A relational report record in PostgreSQL.
2. A detailed report document in MongoDB.
3. The MongoDB ObjectId reference in the PostgreSQL report record.

Cleanup logic is used to handle failures during the linking process.

## 8. Audit Logging

Database audit triggers record INSERT, UPDATE, and DELETE operations on relevant tables.

The `audit_log` table stores:
- Table name.
- Record ID.
- Action.
- Old record data.
- New record data.
- User identifier.
- Timestamp.

Audit logs provide a record of database modifications for review and accountability.

## 9. Request Validation

Zod schemas validate incoming API payloads before database operations.

Validation includes:
- Required fields.
- Data types.
- Integer identifiers.
- Enum restrictions.
- Date and time validation.
- Nested object validation.
- Numeric ranges.
- Rejection of unexpected fields using strict schemas.

Sensitive fields are derived or controlled server-side where appropriate.

## 10. Database Privileges

Database privileges are restricted in addition to RLS.

Examples of implemented restrictions include:
- Revoking TRUNCATE, REFERENCES, and TRIGGER privileges from the authenticated role on forensic tables.
- Revoking TRUNCATE privileges on evidence and evidence transfer tables.
- Restricting direct UPDATE privileges on evidence custody columns.
- Revoking direct INSERT privileges on evidence transfer records.
- Restricting execution of the controlled evidence transfer function to authorized database roles.

RLS policies and SQL privileges work together; neither should be treated as a substitute for the other.

## 11. Security Verification

The following security scenarios have been tested during backend development.

| Test | Expected result | Observed result |
|---|---|---|
| Investigator registers evidence for an accessible assigned case | Evidence created | HTTP 201 |
| Investigator submits a different collector ID | Request rejected | HTTP 403 |
| Investigator transfers evidence to an eligible assigned investigator | Transfer created | HTTP 201 |
| Transfer to an investigator not assigned to the case | Transfer rejected | HTTP 409 |
| Direct UPDATE of protected custody columns | Privilege denied | Verified |
| Direct UPDATE of sealed evidence description | Modification blocked | Verified |
| Direct DELETE of sealed evidence | Deletion blocked | Verified |
| Controlled transfer of sealed evidence | Transfer allowed | HTTP 201 |
| Analyst retrieves own forensic report | Report visible | Verified |
| Analyst retrieves another examiner's report | Report hidden | HTTP 404 |

These results represent tested scenarios, not a claim that every possible security path has been exhaustively tested.

## 12. Security Considerations

- Keep `.env.local` out of version control.
- Never expose Supabase service-role credentials in client-side code.
- Do not use administrative database credentials in ordinary user-facing API requests.
- Keep MongoDB credentials private.
- Review RLS policies whenever new tables or endpoints are introduced.
- Test role permissions using separate authenticated sessions.
- Review database function ownership and execution privileges.
- Rotate credentials if they are accidentally exposed.
- Use restricted network access for production database deployments.

## 13. Remaining Review Areas

The forensic test UPDATE policy currently allows forensic analysts to update tests without an explicit examiner assignment field on `forensic_test`.

If examiner-specific test ownership is required, the database schema and test assignment workflow need to be extended.

Security verification should also be repeated after changes to API handlers, RLS policies, database functions, or triggers.