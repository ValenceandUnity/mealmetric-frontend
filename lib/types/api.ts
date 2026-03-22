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
  items: PTDashboardClientSummary[];
  count: number;
};

export type OverviewMetricsPayload = {
  client_user_id: string;
  as_of_date: string;
  week_start_date: string;
  week_end_date: string;
  business_timezone: string;
  week_start_day: number;
  total_intake_calories: number;
  total_expenditure_calories: number;
  net_calorie_balance: number;
  weekly_target_deficit_calories: number | null;
  deficit_progress_percent: string | number | null;
  current_intake_ceiling_calories: number | null;
  current_expenditure_floor_calories: number | null;
  has_data: boolean;
  freshness: JsonValue;
};

export type PTDashboardClientSummary = {
  id: string;
  pt_user_id: string;
  client_user_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client: {
    id: string;
    email: string;
    role: string;
    created_at: string;
  };
  assignment_count: number;
  workout_log_count: number;
  latest_workout_log_at: string | null;
  metrics_snapshot: OverviewMetricsPayload | null;
};

export type NotificationType =
  | "client_workout_logged"
  | "pt_workout_note_added"
  | "pt_assignment_created";

export type NotificationItem = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationListPayload = {
  items: NotificationItem[];
  count: number;
};

export type NotificationUnreadCountPayload = {
  count: number;
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
