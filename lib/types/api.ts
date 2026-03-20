export type UserRole = "client" | "pt" | "admin" | "vendor";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type SessionPayload = {
  accessToken: string;
  user: SessionUser;
};

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

export type BackendTokenResponse = {
  access_token: string;
};

export type BackendMeResponse = {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
};

export type SessionStatusResponse =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      user: SessionUser;
    };

export type ClientHomeResponse = {
  overview: JsonValue;
  assignments: JsonValue;
  mealPlans: JsonValue;
};

export type ClientMetricsResponse = {
  overview: JsonValue;
  history: JsonValue;
};

export type PTDashboardResponse = {
  profile: JsonValue;
  clients: JsonValue;
  packages: JsonValue;
};
