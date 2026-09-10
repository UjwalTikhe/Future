# Mindful Campus Initiative

Mindful Campus Initiative is a private, student-centered campus well-being app with a separate staff workspace for managing support operations and campus programs.

## What You Need

Install these once on your laptop:

- Node.js 24 or newer: https://nodejs.org
- pnpm: `npm install --global pnpm`

Check that they are installed:

```powershell
node --version
pnpm --version
```

## First Setup

Open PowerShell in this project folder:

```powershell
pnpm install
```

The project folder is:

```text
Mindful-Campus-Initiative\Mindful-Campus-Initiative
```

## Start The App

The app has two parts: the backend API and the normal user website. Run each part in its own PowerShell window.

### 1. Start The Backend

In the first PowerShell window:

```powershell
$env:PORT="3001"
$env:NODE_ENV="development"
$env:ADMIN_EMAIL="admin@your-university.edu"
$env:ADMIN_PASSWORD="replace-this-with-a-long-password"
$env:ADMIN_PASSWORD_SALT="replace-this-with-a-random-salt"
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

Leave this window running. The backend is now available at `http://localhost:3001`.

### 2. Start The Normal User Website

In a second PowerShell window:

```powershell
$env:PORT="5173"
$env:BASE_PATH="/"
pnpm --filter @workspace/mindful-campus dev
```

Open this address in your browser:

```text
http://localhost:5173
```

This is the normal student experience. Students can use check-ins, wellness activities, community events, support resources, and privacy controls.

## Staff Admin Workspace

The staff workspace is intentionally not shown in normal student navigation.

Open this address directly:

```text
http://localhost:5173/admin
```

Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values used when starting the backend. The backend creates the staff session; the password is never stored in browser localStorage.

The staff workspace currently includes:

- Support queue management
- Campus programs and resources
- Participation overview
- Security and audit views
- Staff sign-out

## Useful Commands

Run the full typecheck:

```powershell
pnpm typecheck
```

Build everything:

```powershell
$env:PORT="5173"
$env:BASE_PATH="/"
pnpm build
```

Check the backend health endpoint:

```text
http://localhost:3001/api/healthz
```

## Important MVP Notes

- The current staff session store lives in backend memory. Restarting the API signs staff out.
- Before public deployment, move staff users and sessions into PostgreSQL or connect a university identity provider.
- Never commit a real `.env` file or real passwords. `.env.example` is safe to commit.
- The backend requires a real `ADMIN_EMAIL` and `ADMIN_PASSWORD` every time it starts.

## GitHub

The intended repository is:

```text
https://github.com/UjwalTikhe/Future
```

This local project is not connected to that GitHub repository yet. Before pushing, verify the repository is empty and that GitHub authentication is available on your laptop. Then use:

```powershell
git remote add origin https://github.com/UjwalTikhe/Future.git
git branch -M main
git push -u origin main
```
