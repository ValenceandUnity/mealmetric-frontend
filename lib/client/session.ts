"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiResponse, SessionStatusResponse, SessionUser, UserRole } from "@/lib/types/api";

type SessionState =
  | {
      status: "loading";
      user: null;
    }
  | {
      status: "unauthenticated";
      user: null;
    }
  | {
      status: "authenticated";
      user: SessionUser;
    }
  | {
      status: "unsupported_role";
      user: SessionUser;
    };

type UseSessionBootstrapOptions = {
  requiredRole?: UserRole;
  unauthenticatedRedirectTo?: string;
  redirectAuthenticatedToDashboard?: boolean;
};

type SessionApiResponse = ApiResponse<SessionStatusResponse>;

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string"
  );
}

function normalizeSessionStatusResponse(payload: unknown): SessionStatusResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const data =
    "data" in candidate && candidate.data && typeof candidate.data === "object"
      ? (candidate.data as Record<string, unknown>)
      : candidate;

  if (data.authenticated === false) {
    return {
      authenticated: false,
    };
  }

  if (data.authenticated === true && isSessionUser(data.user)) {
    return {
      authenticated: true,
      user: data.user,
    };
  }

  return null;
}

export function dashboardPathForRole(role: UserRole): "/client" | "/pt" | "/vendor" | null {
  switch (role) {
    case "client":
      return "/client";
    case "pt":
      return "/pt";
    case "vendor":
      return "/vendor";
    default:
      return null;
  }
}

export async function logoutViaBff(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
  });
}

export function useSessionBootstrap(
  options: UseSessionBootstrapOptions = {},
): SessionState {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const payload = (await response.json()) as SessionApiResponse;
        const sessionStatus = normalizeSessionStatusResponse(payload);

        if (!active) {
          return;
        }

        if (!sessionStatus || !sessionStatus.authenticated) {
          setState({
            status: "unauthenticated",
            user: null,
          });

          if (options.unauthenticatedRedirectTo) {
            router.replace(options.unauthenticatedRedirectTo);
          }
          return;
        }

        const user = sessionStatus.user;
        const dashboardPath = dashboardPathForRole(user.role);

        if (!dashboardPath) {
          setState({
            status: "unsupported_role",
            user,
          });

          if (options.requiredRole) {
            router.replace("/login");
          }
          return;
        }

        if (options.requiredRole && user.role !== options.requiredRole) {
          router.replace(dashboardPath);
          return;
        }

        if (options.redirectAuthenticatedToDashboard) {
          router.replace(dashboardPath);
          return;
        }

        setState({
          status: "authenticated",
          user,
        });
      } catch {
        if (!active) {
          return;
        }

        setState({
          status: "unauthenticated",
          user: null,
        });

        if (options.unauthenticatedRedirectTo) {
          router.replace(options.unauthenticatedRedirectTo);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [
    options.redirectAuthenticatedToDashboard,
    options.requiredRole,
    options.unauthenticatedRedirectTo,
    router,
  ]);

  return state;
}
