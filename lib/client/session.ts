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

export function dashboardPathForRole(role: UserRole): "/client" | "/pt" | null {
  switch (role) {
    case "client":
      return "/client";
    case "pt":
      return "/pt";
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

        if (!active) {
          return;
        }

        if (!payload.ok || !payload.data.authenticated) {
          setState({
            status: "unauthenticated",
            user: null,
          });

          if (options.unauthenticatedRedirectTo) {
            router.replace(options.unauthenticatedRedirectTo);
          }
          return;
        }

        const user = payload.data.user;
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
