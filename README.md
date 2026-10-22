# CaseVault: Database Layer

Crime case and evidence management system built for the DBMS Experiential Learning Level 3 project.
This README covers the **database part only** and will grow as the web application is added.

| | |
|---|---|
| Relational database | PostgreSQL on **Supabase** (shared project) |
| NoSQL database | **MongoDB Atlas** (free M0 cluster) |
| Authentication | Supabase Auth (bcrypt-hashed passwords) |
| Authorization | App roles + PostgreSQL Row Level Security |
| Planned app layer | Next.js (Route Handlers as the API) |

---

## 1. Folder contents

| File | Purpose |
|---|---|
| `00_reset.sql` | Optional: drops every CaseVault object to start fresh |
| `01_schema.sql` | Tables, primary/foreign keys, constraints |
| `02_indexes.sql` | All indexes |
| `03_functions_triggers.sql` | Stored functions, transaction logic, triggers |
| `04_views.sql` | Views |
| `05_rls_policies.sql` | Roles, helper functions, Row Level Security policies |
| `06_seed_data.sql` | Sample data, custody transfers, auth-user linking |
| `07_queries_and_demos.sql` | Report queries, DML, transactions, expected-failure tests, data dictionary queries |
| `08_alter_drop_and_performance.sql` | ALTER/DROP demo and `EXPLAIN ANALYZE` index proof |
| `mongo_setup.js` | MongoDB collections, validators, indexes, sample data, aggregations |
| `SETUP_GUIDE.md` | Detailed step-by-step setup, rubric mapping, test cases, ER diagram |

---

## 2. Quick setup

1. Create a Supabase project and invite your teammate (Organization → Team).
2. In **SQL Editor**, run `01` → `02` → `03` → `04` → `05` → `06` **in this order**.
3. Authentication → Users → create the four sample users (auto-confirm):
   `admin@casevault.test`, `arjun.inv@casevault.test`, `priya.inv@casevault.test`, `kavita.lab@casevault.test`.
4. Re-run the last `INSERT INTO app_user ...` block of `06_seed_data.sql` to link logins to people and roles.
5. Create a MongoDB Atlas M0 cluster, add a database user, allow your IP, then run:
   `mongosh "<MONGODB_URI>" --file mongo_setup.js`
6. Create `.env.local` (never commit it):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=      # server only
   MONGODB_URI=
   MONGODB_DB=casevault
   ```
7. Run `07_queries_and_demos.sql` in sections. Run the "expected failures" (section G) **one statement at a time**.

Full instructions with screenshots-worthy steps are in `SETUP_GUIDE.md`.

---

## 3. Why two databases

| Data | Stored in | Reason |
|---|---|---|
| Cases, people, evidence, assignments, forensic tests/reports, chain of custody, audit trail | **PostgreSQL** | Highly relational, needs foreign keys, ACID transactions, constraints, triggers and row-level security |
| Interview transcripts | **MongoDB** | Long nested free text, keyword/text search |
| Forensic report details | **MongoDB** | Structure differs per test type (DNA, fingerprint, digital, chemical) |
| Evidence metadata | **MongoDB** | Attributes vary per evidence type (phone IMEI vs weapon serial) |
| Activity logs | **MongoDB** | High-volume append-only writes, TTL auto-expiry |

**How they link:** Postgres keys (`case_id`, `evidence_id`, `test_id`, `interview_id`) are stored inside Mongo
documents. Postgres stores the Mongo `_id` in `interview.mongo_transcript_id` and `forensic_report.mongo_report_id`.
There is no automatic cross-database sync, so the API layer is responsible for keeping both sides consistent.

---

## 4. Roles

| Role | Description |
|---|---|
| `admin` | Full access. Creates cases, assigns investigators, reads the audit log |
| `investigator` | Works only on cases they are **actively assigned** to |
| `forensic_analyst` | Reads cases and evidence, manages forensic tests, reports and custody |

Roles are stored in `app_user.app_role`. Passwords live only in Supabase Auth (`auth.users`, bcrypt-hashed).

---

## 5. Relational schema (PostgreSQL)

16 tables. Legend: **PK** primary key, **FK** foreign key, **NN** NOT NULL, **UQ** unique.

### 5.1 `location`: addresses used across the system
| Column | Type | Keys / constraints |
|---|---|---|
| location_id | INT identity | PK |
| address | VARCHAR(255) | NN |
| city | VARCHAR(80) | NN |
| state | VARCHAR(80) | NN |
| pincode | CHAR(6) | NN, CHECK 6 digits not starting with 0 (`chk_location_pincode`) |
| | | UQ (address, city, pincode) |

### 5.2 `case_status`: lookup of case states
| Column | Type | Keys / constraints |
|---|---|---|
| status_id | INT identity | PK |
| status_name | VARCHAR(40) | NN, UQ |
| progress_note | TEXT | |

Seeded values: Open, Under Investigation, Pending Forensics, Closed, Cold Case.

### 5.3 `crime`: lookup of crime types
| Column | Type | Keys / constraints |
|---|---|---|
| crime_id | INT identity | PK |
| crime_type | VARCHAR(60) | NN, UQ |
| description | TEXT | |

### 5.4 `person`: everyone in the system (staff, victims, suspects, witnesses)
| Column | Type | Keys / constraints |
|---|---|---|
| person_id | INT identity | PK |
| first_name | VARCHAR(50) | NN, not blank |
| middle_name | VARCHAR(50) | |
| last_name | VARCHAR(50) | NN, not blank |
| full_name | TEXT | **generated, stored**: first + middle + last |
| location_id | INT | FK → location, ON DELETE SET NULL |
| date_of_birth | DATE | CHECK > 1900-01-01 |
| gender | VARCHAR(10) | CHECK in (male, female, other) |
| email | VARCHAR(120) | UQ, CHECK valid e-mail pattern |
| phone_no | VARCHAR(15) | CHECK 10 to 13 digits, optional leading `+` |

### 5.5 `app_user`: login profile and role (links Supabase Auth to a person)
| Column | Type | Keys / constraints |
|---|---|---|
| user_id | UUID | PK, FK → auth.users(id) ON DELETE CASCADE |
| person_id | INT | NN, UQ, FK → person, ON DELETE RESTRICT |
| app_role | VARCHAR(20) | NN, CHECK in (admin, investigator, forensic_analyst) |
| is_active | BOOLEAN | NN, default TRUE |
| created_at | TIMESTAMPTZ | NN, default now() |

### 5.6 `cases`: investigation cases
(Named `cases` because `CASE` is a reserved SQL word.)

| Column | Type | Keys / constraints |
|---|---|---|
| case_id | INT identity | PK |
| case_number | VARCHAR(20) | NN, UQ, CHECK format `CS-YYYY-NNNN` |
| title | VARCHAR(150) | NN |
| description | TEXT | |
| location_id | INT | FK → location, ON DELETE SET NULL |
| status_id | INT | NN, FK → case_status, ON UPDATE CASCADE, ON DELETE RESTRICT |
| date_opened | DATE | NN, default current date |
| date_closed | DATE | CHECK null or ≥ date_opened (`chk_case_dates`) |
| search_vector | TSVECTOR | **generated, stored** from title + description (full-text search) |

### 5.7 `case_crime`: M:N between cases and crime types
| Column | Type | Keys / constraints |
|---|---|---|
| case_id | INT | PK part, FK → cases, ON DELETE CASCADE |
| crime_id | INT | PK part, FK → crime, ON DELETE RESTRICT |

### 5.8 `crime_scene`
| Column | Type | Keys / constraints |
|---|---|---|
| crime_scene_id | INT identity | PK |
| case_id | INT | NN, FK → cases, ON DELETE CASCADE |
| location_id | INT | NN, FK → location |
| scene_name | VARCHAR(100) | NN |
| description | TEXT | |
| date_visited | TIMESTAMPTZ | NN |
| visited_by | INT | NN, FK → person |
| notes | TEXT | |
| | | UQ (crime_scene_id, case_id): target of the composite FK from `evidence` |

### 5.9 `case_person`: M:N between cases and people, with the person's role in that case
| Column | Type | Keys / constraints |
|---|---|---|
| case_id | INT | PK part, FK → cases, ON DELETE CASCADE |
| person_id | INT | PK part, FK → person, ON DELETE RESTRICT |
| role_in_case | VARCHAR(20) | PK part, CHECK in (victim, suspect, witness, complainant, informant) |
| date_associated | DATE | NN, default current date |
| notes | TEXT | |

PK is (case_id, person_id, role_in_case) so one person can hold different roles in the same case.

### 5.10 `investigator_assignment`
| Column | Type | Keys / constraints |
|---|---|---|
| assignment_id | INT identity | PK |
| case_id | INT | NN, FK → cases, ON DELETE CASCADE |
| investigator_id | INT | NN, FK → person |
| date_assigned | DATE | NN, default current date |
| role | VARCHAR(15) | NN, default `support`, CHECK in (lead, support, supervisor) |
| status | VARCHAR(15) | NN, default `active`, CHECK in (active, completed, removed) |

Business rule (partial unique index): only **one active lead** per case.

### 5.11 `interview`
| Column | Type | Keys / constraints |
|---|---|---|
| interview_id | INT identity | PK |
| case_id | INT | NN, FK → cases, ON DELETE CASCADE |
| person_id | INT | NN, FK → person (interviewee) |
| interview_date | TIMESTAMPTZ | NN |
| location_id | INT | FK → location |
| conducted_by | INT | NN, FK → person (interviewer) |
| notes | TEXT | |
| recording_path | TEXT | |
| mongo_transcript_id | CHAR(24) | CHECK 24 hex chars: link to MongoDB `interview_transcripts._id` |
| | | CHECK conducted_by ≠ person_id |

### 5.12 `evidence`
| Column | Type | Keys / constraints |
|---|---|---|
| evidence_id | INT identity | PK |
| case_id | INT | NN, FK → cases, ON DELETE RESTRICT |
| crime_scene_id | INT | part of composite FK |
| evidence_code | VARCHAR(20) | NN, UQ, CHECK format `EV-YYYY-NNN…` (3 to 6 digits) |
| description | TEXT | NN |
| evidence_type | VARCHAR(20) | NN, CHECK in (physical, biological, digital, documentary, weapon, trace, other) |
| condition_status | VARCHAR(20) | NN, default `intact`, CHECK in (intact, damaged, degraded, contaminated, unknown) |
| date_collected | TIMESTAMPTZ | NN |
| collected_by | INT | NN, FK → person |
| location_found_id | INT | FK → location |
| sealed | BOOLEAN | NN, default FALSE |
| notes | TEXT | |
| current_holder_id | INT | FK → person, maintained by `transfer_evidence()` |
| current_location_id | INT | FK → location, maintained by `transfer_evidence()` |
| | | **Composite FK** (crime_scene_id, case_id) → crime_scene: the scene must belong to the same case |

### 5.13 `forensic_test`
| Column | Type | Keys / constraints |
|---|---|---|
| test_id | INT identity | PK |
| evidence_id | INT | NN, FK → evidence, ON DELETE RESTRICT |
| test_type | VARCHAR(60) | NN |
| requested_by | INT | NN, FK → person |
| request_date | DATE | NN, default current date |
| priority | VARCHAR(10) | NN, default `medium`, CHECK in (low, medium, high, urgent) |
| status | VARCHAR(15) | NN, default `requested`, CHECK in (requested, in_progress, completed, cancelled) |
| notes | TEXT | |

### 5.14 `forensic_report`
| Column | Type | Keys / constraints |
|---|---|---|
| report_id | INT identity | PK |
| test_id | INT | NN, **UQ** (one report per test), FK → forensic_test, ON DELETE RESTRICT |
| conclusion | TEXT | NN |
| examiner_id | INT | NN, FK → person |
| report_date | DATE | NN, default current date |
| summary | TEXT | |
| notes | TEXT | |
| mongo_report_id | CHAR(24) | CHECK 24 hex chars: link to MongoDB `forensic_reports._id` |

### 5.15 `evidence_transfer`: append-only chain of custody
| Column | Type | Keys / constraints |
|---|---|---|
| transfer_id | BIGINT identity | PK |
| evidence_id | INT | NN, FK → evidence, ON DELETE RESTRICT |
| from_person_id | INT | NN, FK → person |
| to_person_id | INT | NN, FK → person |
| transfer_date | TIMESTAMPTZ | NN, default `clock_timestamp()` |
| from_location_id | INT | FK → location |
| to_location_id | INT | FK → location |
| purpose | VARCHAR(200) | NN |
| received_condition | VARCHAR(20) | NN, default `intact`, CHECK in (intact, damaged, degraded, contaminated, unknown) |
| notes | TEXT | |
| | | CHECK from_person_id ≠ to_person_id |

### 5.16 `audit_log`: filled automatically by triggers
| Column | Type | Keys / constraints |
|---|---|---|
| audit_id | BIGINT identity | PK |
| table_name | TEXT | NN |
| record_id | TEXT | |
| action | TEXT | NN, CHECK in (INSERT, UPDATE, DELETE) |
| old_data | JSONB | row before the change |
| new_data | JSONB | row after the change |
| changed_by | UUID | `auth.uid()` of the user who made the change |
| changed_at | TIMESTAMPTZ | NN, default now() |

---

## 6. Relationships

| Relationship | Type |
|---|---|
| location → person, cases, crime_scene, evidence, interview | 1 : N |
| case_status → cases | 1 : N |
| cases ↔ crime (via `case_crime`) | M : N |
| cases ↔ person (via `case_person`, with role) | M : N |
| cases ↔ person as investigator (via `investigator_assignment`) | M : N |
| cases → crime_scene, interview, evidence | 1 : N |
| crime_scene → evidence | 1 : N (optional) |
| evidence → forensic_test | 1 : N |
| forensic_test → forensic_report | 1 : 0..1 |
| evidence → evidence_transfer | 1 : N |
| person → app_user | 1 : 0..1 |

A Mermaid ER diagram is in `SETUP_GUIDE.md` (section 10).

---

## 7. Indexes (`02_indexes.sql`)

| Index | Table (columns) | Type | Purpose |
|---|---|---|---|
| idx_person_name | person (last_name, first_name) | B-tree, composite | Name lookup and sorting |
| idx_person_fullname_trgm | person (full_name) | GIN trigram | Typo-tolerant name search |
| idx_person_location | person (location_id) | B-tree | FK lookup |
| idx_cases_status_opened | cases (status_id, date_opened DESC) | B-tree, composite | Dashboard filter and sort |
| idx_cases_search | cases (search_vector) | GIN | Full-text search |
| idx_cases_location | cases (location_id) | B-tree | FK lookup |
| idx_case_person_person | case_person (person_id) | B-tree | "Which cases is this person in?" |
| idx_case_crime_crime | case_crime (crime_id) | B-tree | FK lookup |
| idx_crime_scene_case | crime_scene (case_id) | B-tree | FK lookup |
| idx_assignment_inv | investigator_assignment (investigator_id, status) | B-tree, composite | Workload lookup |
| idx_assignment_case | investigator_assignment (case_id) | B-tree | FK lookup |
| uq_one_active_lead_per_case | investigator_assignment (case_id) WHERE role='lead' AND status='active' | **Partial unique** | One active lead per case |
| idx_interview_case_date | interview (case_id, interview_date DESC) | B-tree, composite | Interview timeline |
| idx_interview_person | interview (person_id) | B-tree | FK lookup |
| idx_evidence_case_date | evidence (case_id, date_collected DESC) | B-tree, composite | Evidence per case by date |
| idx_evidence_desc_fts | evidence (to_tsvector(description)) | GIN | Full-text search |
| idx_evidence_holder | evidence (current_holder_id) | B-tree | "What does this person hold?" |
| idx_evidence_unsealed | evidence (case_id) WHERE sealed = FALSE | **Partial** | Unsealed evidence only |
| idx_test_evidence | forensic_test (evidence_id) | B-tree | FK lookup |
| idx_test_pending | forensic_test (priority, request_date) WHERE status pending | **Partial** | Lab work-queue |
| idx_transfer_evidence | evidence_transfer (evidence_id, transfer_date) | B-tree, composite | Custody timeline |
| idx_audit_table_record | audit_log (table_name, record_id, changed_at DESC) | B-tree, composite | History of one record |
| idx_audit_changed_brin | audit_log (changed_at) | BRIN | Compact index for append-only time data |

Automatic unique indexes also exist for `case_number`, `evidence_code`, `person.email`, `status_name`, `crime_type` and `forensic_report.test_id`.
Index speed-up is proven with `EXPLAIN ANALYZE` in `08_alter_drop_and_performance.sql` (Part 2).

---

## 8. Functions (`03_functions_triggers.sql`)

| Function | Returns | Description |
|---|---|---|
| `transfer_evidence(evidence_id, to_person, to_location, purpose, received_condition, notes)` | transfer_id | **Transaction.** Locks the evidence row, rejects handing it to the current holder, inserts the custody record and updates the holder/location atomically |
| `get_chain_of_custody(evidence_id)` | table | Ordered timeline of an item: collection event, then every transfer, with names and places |
| `search_cases(query)` | table | Ranked full-text search over cases with highlighted snippets (supports `"phrase"`, `-exclude`, `OR`) |

Helper functions for security (`05_rls_policies.sql`): `current_app_role()`, `current_person_id()`,
`is_assigned_to_case(case_id)`, `can_access_evidence(evidence_id)`.

---

## 9. Triggers

| Trigger | Table | When | What it does |
|---|---|---|---|
| trg_audit_cases / evidence / transfer / test / report / case_person / assignment / interview | 8 tables | AFTER INSERT/UPDATE/DELETE | Writes old and new row plus `auth.uid()` to `audit_log` |
| trg_evidence_sealed | evidence | BEFORE UPDATE/DELETE | A sealed item cannot be deleted or have content changed. Only custody columns may change |
| trg_evidence_defaults | evidence | BEFORE INSERT | New item starts with its collector as holder and its found location as current location |
| trg_case_status_guard | cases | BEFORE UPDATE of status_id | Closing is refused while forensic tests are pending. Closing sets `date_closed`, re-opening clears it |
| trg_interview_person_guard | interview | BEFORE INSERT/UPDATE | The interviewee must be linked to the case in `case_person` |
| trg_transfer_immutable | evidence_transfer | BEFORE UPDATE/DELETE | Custody records are append-only |
| trg_report_completes_test | forensic_report | AFTER INSERT | Marks the related forensic test as `completed` |

---

## 10. Views (`04_views.sql`)

All views use `security_invoker = true`, so row-level security still applies through them.

| View | Description |
|---|---|
| `v_case_summary` | One row per case: status, city, crimes, lead investigator, evidence count, pending tests |
| `v_pending_forensics` | Open forensic tests with days waiting, sorted by priority then age |
| `v_evidence_current_custody` | Every item with its current holder, location and number of transfers |
| `v_investigator_workload` | Active and total assignments per investigator |

---

## 11. Access control (Row Level Security)

RLS is enabled on all 16 tables. `admin` has full access everywhere (`admin_all` policy). Other roles:

| Table | investigator | forensic_analyst |
|---|---|---|
| location, case_status, crime | read (location: also insert) | read (location: also insert) |
| person | read, insert, update | read |
| app_user | own row | own row |
| cases | read and update **assigned** cases | read all |
| case_crime, crime_scene, case_person, interview | read, insert, update on **assigned** cases | none |
| investigator_assignment | read for assigned cases | none |
| evidence | read, insert, update on assigned cases | read all, update all |
| evidence_transfer | read, insert for assigned cases | read, insert for all |
| forensic_test | read, insert for assigned cases | read, insert, update all |
| forensic_report | read for assigned cases | read, insert, update |
| audit_log | none | none |

Deletes are admin-only. The `anon` role has no table access. **Note:** RLS is bypassed by the `service_role` key and
the SQL editor. The Next.js API must call Supabase with the signed-in user's token for these rules to apply.

---

## 12. NoSQL layer (MongoDB, database `casevault`)

| Collection | Documents hold | Key fields | Indexes |
|---|---|---|---|
| `interview_transcripts` | Interview transcript as an array of speaker turns, summary, keywords, sentiment, attachments | interview_id, case_id, person_id | unique interview_id; (case_id, created_at); multikey keywords; **text** on transcript.text + summary |
| `forensic_reports` | Report with a type-specific `details` object, findings, confidence | report_id, test_id, evidence_id, case_id, report_type | unique report_id; unique test_id; (case_id, report_type); text on findings.description |
| `evidence_metadata` | Variable `attributes` per evidence type, tags | evidence_id, evidence_type | unique evidence_id; partial index on attributes.imei (digital); tags |
| `activity_logs` | User actions: login, view, search, transfer | user_id, action, created_at | (user_id, created_at); **TTL** on created_at (1 year) |

All four use `$jsonSchema` validators (for example `report_type` must be one of DNA, FINGERPRINT, DIGITAL, CHEMICAL, TOOLMARK, BALLISTICS).
`mongo_setup.js` also contains five aggregation pipelines: reports per type, keyword frequency per case, text search,
`$lookup` between reports and evidence metadata, and activity per user.

---

## 13. Sample data (`06_seed_data.sql`)

| Table | Rows |
|---|---|
| location | 7 |
| case_status | 5 |
| crime | 6 |
| person | 12 (4 staff, 8 case-related) |
| cases | 4 |
| evidence | 8 (3 sealed) |
| forensic_test / forensic_report | 5 / 3 |
| interview | 5 |
| evidence_transfer | 6 (created via `transfer_evidence()`) |

Sample logins (you create them in Supabase Auth): admin → Meenakshi Sundaram, investigators → Arjun Raghavan and Priya Nair,
forensic analyst → Kavita Iyer.

---

## 14. Advanced database concepts demonstrated

Transactions · Triggers · Stored functions · Views · Indexing (B-tree, composite, partial, GIN, trigram, BRIN) ·
Full-text search · Row Level Security · Generated columns · Composite foreign key · NoSQL aggregation · TTL index · Schema validation

---

## 15. Testing

`07_queries_and_demos.sql` section G contains 11 deliberate-failure tests (constraints, triggers, transaction function,
partial unique index). Section K tests row-level security. `mongo_setup.js` ends with a validator test.
The full 16-case test table is in `SETUP_GUIDE.md` (section 9).

---

## 16. Known limitations

- No automatic sync between PostgreSQL and MongoDB. The API layer keeps links consistent.
- Sealing evidence is permanent. There is no unseal operation.
- Each forensic test has at most one report.
- RLS does not apply to the SQL editor or the service-role key.

---

## 17. Change log

| Date | Change |
|---|---|
| 2026-10-22 | Initial database layer: schema, indexes, triggers, views, RLS, seed data, MongoDB setup |

_Add new entries here as the project grows (application layer, new tables, schema changes)._
