# CaseVault – Backend Setup Guide

## 1. Prerequisites

Install the following before setting up the backend:

- Node.js (compatible with the project's Next.js version).
- npm.
- Git.
- A Supabase project.
- A MongoDB Atlas cluster.
- A code editor such as Visual Studio Code.

Check the installed versions:

```powershell
node --version
npm --version
git --version
```

## 2. Clone the Repository

```powershell
git clone https://github.com/harsimran-kaur01/CaseVault.git
```

Navigate to the project directory:

```powershell
cd CaseVault
```

If the backend is maintained in a subdirectory, navigate to that directory before running the following commands.

## 3. Install Dependencies

```powershell
npm install
```

This installs the dependencies specified in `package.json`.

## 4. Environment Configuration

Create a local environment file:

```powershell
New-Item -ItemType File -Path .env.local
```

Configure the required environment variables using the names expected by the application.

Example structure:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

MONGODB_URI=your_mongodb_connection_string
```

**Important:**
- Replace the placeholders with credentials from your own services.
- Never commit `.env.local`.
- Never expose the service-role key in frontend code.
- Do not share database passwords or connection strings in source control.

Check the existing project configuration before adding or renaming environment variables.

## 5. Supabase Configuration

Create or configure a Supabase project.

The PostgreSQL database must contain the CaseVault schema and its supporting database objects.

Required database components include:
- Application tables.
- Primary and foreign key constraints.
- Check constraints.
- Row Level Security policies.
- Database functions.
- Database triggers.
- Dashboard views.

The application uses Supabase Auth for user authentication.

Application users must also have corresponding records in the `app_user` table, associated with their person records and application roles.

## 6. MongoDB Configuration

Create a MongoDB Atlas cluster.

Configure:
- A database named `casevault`.
- A database user with the required permissions.
- Network access for the backend runtime.
- A connection URI in the local environment file.

The application uses these collections:

```text
casevault/
├── interview_transcripts
├── forensic_reports
├── evidence_metadata
└── activity_logs
```

MongoDB stores document-oriented data associated with relational records in PostgreSQL.

## 7. Run the Development Server

Start the Next.js development server:

```powershell
npm run dev
```

The application should be available at:

```text
http://localhost:3000
```

## 8. Verify Database Connectivity

Use the health-check endpoints:

| Service | Endpoint |
|---|---|
| MongoDB | `http://localhost:3000/api/health/mongodb` |
| PostgreSQL | `http://localhost:3000/api/health/postgres` |
| Supabase | `http://localhost:3000/api/health/supabase` |

A successful response indicates that the corresponding connectivity check passed.

These checks do not replace testing authentication, database permissions, or individual API operations.

## 9. TypeScript Verification

Run:

```powershell
npx tsc --noEmit
```

This checks TypeScript types without generating compiled output.

## 10. API Testing

API endpoints can be tested using:
- Postman.
- PowerShell `Invoke-RestMethod`.
- Browser requests for applicable GET endpoints.

For protected endpoints, authenticate first and use the resulting session when making API requests.

Test different roles independently:
- Admin.
- Investigator.
- Forensic Analyst.

Verify both permitted and denied operations.

## 11. Important Development Notes

- PostgreSQL is the primary relational data store.
- MongoDB is used for document-oriented information.
- PostgreSQL and MongoDB do not share a single distributed transaction.
- MongoDB references are maintained in PostgreSQL records.
- RLS controls database access.
- Database functions and triggers enforce important business rules.
- API validation is performed using Zod.

## 12. Troubleshooting

### Supabase connection failure
Check:
- Project URL.
- Supabase API keys.
- Environment variable names.
- Whether the Supabase project is available.

### MongoDB connection failure
Check:
- MongoDB connection URI.
- Database username and password.
- Atlas network access configuration.
- Database availability.

### HTTP 401
The request may not contain a valid authenticated session.

### HTTP 403
The user may lack permission to perform the requested operation.

### HTTP 404
The requested record may not exist or may not be visible under the user's RLS policies.

### TypeScript errors
Run:

```powershell
npx tsc --noEmit
```

Inspect the reported file and line numbers before proceeding.

## 13. Production Deployment

Before production deployment:
- Configure production environment variables.
- Ensure database schema and policies are deployed.
- Restrict database network access.
- Use secure credential storage.
- Verify authentication and RLS policies.
- Test MongoDB connectivity.
- Run TypeScript and application tests.
- Confirm that no local credentials or development data are included in the deployment.