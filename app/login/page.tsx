"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiResponse, SessionUser } from "@/lib/types/api";
import { dashboardPathForRole, useSessionBootstrap } from "@/lib/client/session";

type LoginResponse = ApiResponse<{
  user: SessionUser;
}>;

export default function LoginPage() {
  const router = useRouter();
  const { status, user } = useSessionBootstrap({
    redirectAuthenticatedToDashboard: true,
  });

  const [email, setEmail] = useState("client@example.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as LoginResponse;

      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }

      const dashboardPath = dashboardPathForRole(payload.data.user.role);

      if (!dashboardPath) {
        setErrorMessage(`This frontend does not support the ${payload.data.user.role} role.`);
        return;
      }

      router.replace(dashboardPath);
    } catch {
      setErrorMessage("Unable to reach the login endpoint.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <section>
        <h2>Loading session</h2>
        <p>Checking if you already have a valid session.</p>
      </section>
    );
  }

  if (status === "unsupported_role") {
    return (
      <section>
        <h2>Unsupported Role</h2>
        <p>This frontend does not support the <code>{user.role}</code> role.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Sign in</h2>
      <p>Credentials are submitted only to the local BFF endpoint at <code>/api/auth/login</code>.</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {errorMessage ? (
        <p style={{ marginTop: 16, color: "#fca5a5" }}>{errorMessage}</p>
      ) : null}
    </section>
  );
}
