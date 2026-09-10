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

The community requires a student account. Students create a pseudonymous username, choose interests for room suggestions, join communities explicitly, and can create public or private communities. Private communities require the host to approve join requests. Each community starts with separate `General` and `Introductions` channels.

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
- Student accounts, community memberships, channels, messages, reactions, and reports require `DATABASE_URL` and are stored in Postgres.
- Before a real public launch, move staff users and sessions into PostgreSQL or connect a university identity provider.
- Never commit a real `.env` file or real passwords. `.env.example` is safe to commit.
- The backend requires a real `ADMIN_EMAIL` and `ADMIN_PASSWORD` every time it starts.

## Deploy For Phone Access

The included `Dockerfile` and `render.yaml` deploy the frontend and backend as one web service. After deployment, you receive one URL that works from your phone without a laptop running.

### Render deployment

1. Create an account at https://render.com.
2. Choose **New +** and then **Blueprint**.
3. Connect GitHub and select `UjwalTikhe/Future`.
4. Render reads `render.yaml` and creates the `mindful-campus` web service.
5. In the service environment settings, set:
	- `ADMIN_EMAIL`: your staff email
	- `ADMIN_PASSWORD`: a long private password
	- `WEB_ORIGIN`: the Render URL, for example `https://mindful-campus.onrender.com`
6. Render also provisions `mindful-campus-db` for persistent rooms and messages.
7. Deploy and wait for the build to finish.
8. Open the Render URL on your phone.

Test these URLs after deployment:

```text
https://YOUR-APP.onrender.com
https://YOUR-APP.onrender.com/community
https://YOUR-APP.onrender.com/admin
https://YOUR-APP.onrender.com/api/healthz
```

The free Render service may sleep when unused. The first request after sleep can take a little longer. Staff sessions remain process-local, so a web service restart signs staff out; community rooms and messages persist in Postgres.

## GitHub

The intended repository is:

```text
https://github.com/UjwalTikhe/Future
```

This project is already connected to that GitHub repository. Push future changes with:

```powershell
git add -A
git commit -m "Describe the change"
git push
```
