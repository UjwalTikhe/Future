import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import cookieParser from "cookie-parser";

const router: IRouter = Router();
const SESSION_COOKIE = "mci_staff_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map<string, { email: string; expiresAt: number }>();

router.use(cookieParser());

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

function passwordMatches(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;

  const salt = process.env.ADMIN_PASSWORD_SALT ?? "mindful-campus-mvp";
  const expected = scryptSync(configuredPassword, salt, 32);
  const received = scryptSync(password, salt, 32);
  return timingSafeEqual(expected, received);
}

function currentSession(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

router.get("/auth/me", (req, res) => {
  const session = currentSession(req);
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }

  res.json({ authenticated: true, user: { email: session.email, role: "admin" } });
});

router.post("/auth/login", (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const adminEmail = configuredAdminEmail();

  if (!adminEmail || !process.env.ADMIN_PASSWORD) {
    res.status(503).json({ message: "Staff authentication is not configured on the server." });
    return;
  }

  if (email !== adminEmail || !passwordMatches(password)) {
    res.status(401).json({ message: "Those staff credentials were not recognized." });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { email, expiresAt: Date.now() + SESSION_TTL_MS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
  res.json({ authenticated: true, user: { email, role: "admin" } });
});

router.post("/auth/logout", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  res.status(204).send();
});

export default router;
