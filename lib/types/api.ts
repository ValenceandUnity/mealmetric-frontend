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

export type MealPlanSummary = {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_zip_code: string | null;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  total_price_cents: number;
  total_calories: number;
  item_count: number;
  availability_count: number;
};

export type MealPlanListPayload = {
  items: MealPlanSummary[];
  count: number;
};

export type BookmarkItem = {
  id: string;
  meal_plan_id: string;
  note: string | null;
  created_at: string;
  meal_plan: MealPlanSummary;
};

export type BookmarkFolder = {
  id: string;
  client_user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  items: BookmarkItem[];
};

export type BookmarkFolderListPayload = {
  items: BookmarkFolder[];
  count: number;
};

export type VendorIdentity = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  zip_code: string | null;
  status: string;
  meal_plan_count: number;
};

export type VendorMePayload = {
  user_id: string;
  email: string;
  vendor_ids: string[];
  default_vendor: VendorIdentity | null;
  vendors: VendorIdentity[];
};

export type VendorMetricsPayload = {
  vendor_id: string;
  vendor_name: string;
  zip_code: string | null;
  total_meal_plans: number;
  published_meal_plans: number;
  draft_meal_plans: number;
  total_availability_entries: number;
  open_pickup_windows: number;
};
