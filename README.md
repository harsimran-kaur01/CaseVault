# CaseVault – Backend

## Overview

CaseVault is a crime case and evidence management system designed to support the management of criminal investigations, evidence records, forensic examinations, interviews, and chain of custody.

The backend provides REST API endpoints for interacting with the application's data. It uses PostgreSQL for structured relational data, MongoDB for document-oriented forensic information, and Supabase for authentication and database access control.

## Technology Stack

| Component | Technology |
|---|---|
| Backend framework | Next.js App Router / Route Handlers |
| Programming language | TypeScript |
| Relational database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Database access control | PostgreSQL Row Level Security (RLS) |
| Document database | MongoDB Atlas |
| Data validation | Zod |
| API communication | REST |

## Backend Features

### 1. Authentication and Authorization
- User authentication through Supabase Auth.
- Session-based authentication for API requests.
- Application roles: Admin, Investigator, and Forensic Analyst.
- Role-based database access through PostgreSQL RLS policies.

### 2. Case Management
- Create, retrieve, update, and manage investigation cases.
- Associate crimes and persons with cases.
- Assign investigators to cases.
- Retrieve case summaries and search cases.

### 3. Evidence Management
- Register evidence against an investigation case.
- Associate evidence with crime scenes and collection locations.
- Maintain evidence identification and condition details.
- Track current evidence custody.
- Record evidence transfers.
- Retrieve evidence transfer history.

### 4. Forensic Management
- Create and manage forensic test requests.
- Track forensic test status and priority.
- Generate forensic reports.
- Store structured report information in MongoDB.
- Maintain references between PostgreSQL forensic records and MongoDB documents.

### 5. Interview Management
- Create and retrieve interview records.
- Update interview information.
- Maintain references to interview transcripts stored in MongoDB.

### 6. Audit and Monitoring
- Maintain audit logs for database changes.
- Provide dashboard data through PostgreSQL views.
- Provide health-check endpoints for PostgreSQL, MongoDB, and Supabase.

## Database Architecture

CaseVault uses a hybrid database architecture.

**PostgreSQL – Supabase**

Stores structured relational information, including:
- Users and roles
- Cases and crimes
- Persons and investigator assignments
- Crime scenes
- Evidence records
- Forensic tests and reports
- Evidence transfers
- Audit logs

**MongoDB – MongoDB Atlas**

Stores document-oriented information, including:
- Interview transcripts
- Forensic report details
- Evidence metadata
- Activity logs

PostgreSQL maintains references to associated MongoDB documents where applicable.

## Project Structure

```text
casevault-app/
│
├── app/
│   └── api/
│       ├── auth/
│       ├── cases/
│       ├── evidence/
│       ├── forensic-tests/
│       ├── forensic-reports/
│       ├── interviews/
│       ├── locations/
│       ├── crime-scenes/
│       ├── people/
│       ├── investigator-assignments/
│       ├── case-person/
│       ├── case-crime/
│       ├── crimes/
│       ├── audit-logs/
│       ├── dashboard/
│       └── health/
│
├── lib/
│   ├── supabase/
│   ├── validation/
│   └── mongodb.ts
│
├── docs/
│
├── .env.local
├── package.json
└── tsconfig.json
```

The structure above represents the backend modules; individual route files and supporting files may vary.

## Getting Started

1. Clone the repository.
2. Install the project dependencies.
3. Configure environment variables.
4. Start the development server.
5. Test the API endpoints.

Refer to [docs/setup.md](docs/setup.md) for detailed setup instructions.

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | Backend architecture and data flow |
| [Database Schema](docs/database-schema.md) | PostgreSQL tables and MongoDB collections |
| [API Documentation](docs/api-documentation.md) | Backend API endpoint reference |
| [Security](docs/security.md) | Authentication, authorization, RLS, and evidence security |
| [Setup Guide](docs/setup.md) | Environment configuration and execution |

## Security

CaseVault uses:
- Supabase session-based authentication.
- Role-based authorization.
- PostgreSQL Row Level Security.
- Server-side request validation.
- Controlled evidence custody transfers.
- Database audit triggers.
- Restrictions on modification and deletion of sealed evidence.

See [docs/security.md](docs/security.md) for details.

## Development Status

The backend includes implemented modules for authentication, case management, evidence management, forensic tests and reports, interviews, people, crimes, crime scenes, investigator assignments, audit logs, dashboard data, and database health checks.

API functionality and role-based permissions should be tested against the configured database before deployment.

## License

Add the project's selected license here before public distribution.