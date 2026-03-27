"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { dashboardPathForRole } from "@/lib/client/session";
import type { ApiResponse, SelfRegistrationRole, SessionUser } from "@/lib/types/api";

type RegisterResponse = ApiResponse<{
  user: SessionUser;
}>;

const ROLE_OPTIONS: Array<{ value: SelfRegistrationRole; label: string }> = [
  { value: "client", label: "Client" },
  { value: "pt", label: "PT" },
];

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SelfRegistrationRole>("client");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
      });

      const payload = (await response.json()) as RegisterResponse;

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
      setErrorMessage("Unable to reach the registration endpoint.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Create account</h2>
      <p>Registration is submitted only to the local BFF endpoint at <code>/api/auth/register</code>.</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value as SelfRegistrationRole)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
      {errorMessage ? (
        <p role="alert" style={{ marginTop: 16, color: "#fca5a5" }}>
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
