"use client";

import Link from "next/link";
import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileHeaderUtilities } from "@/components/mobile/MobileHeaderUtilities";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type {
  ApiResponse,
  PTClientInvitation,
  PTRosterCategory,
  PTRosterCategoryListResponse,
  PTRosterClient,
  PTRosterClientListResponse,
} from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type PTRosterCategoriesApiResponse = ApiResponse<PTRosterCategoryListResponse>;
type PTRosterClientsApiResponse = ApiResponse<PTRosterClientListResponse>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type ActionPillButtonProps = {
  onClick: () => void;
  children: string;
  tone?: "purple" | "yellow";
  expanded?: boolean;
};

type PortalStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function ActionPillButton({
  onClick,
  children,
  tone = "yellow",
  expanded,
}: ActionPillButtonProps) {
  return (
    <button
      type="button"
      className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}
      onClick={onClick}
      aria-expanded={expanded}
    >
      {children}
    </button>
  );
}

function PortalStateCard({ title, message, action }: PortalStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function matchesQuery(query: string, fields: Array<string | null | undefined>): boolean {
  if (!query) {
    return true;
  }

  return fields.some((field) => field?.toLowerCase().includes(query));
}

export default function PTClientsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [categories, setCategories] = useState<PTRosterCategory[]>([]);
  const [allClients, setAllClients] = useState<PTRosterClient[]>([]);
  const [visibleClients, setVisibleClients] = useState<PTRosterClient[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [draftCategoryName, setDraftCategoryName] = useState("");
  const [draftInviteEmail, setDraftInviteEmail] = useState("");
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [submittingInvitation, setSubmittingInvitation] = useState(false);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  const selectedFolderName = useMemo(() => {
    if (selectedCategoryId === null) {
      return "All Clients";
    }

    return categories.find((category) => category.id === selectedCategoryId)?.name ?? "Selected Category";
  }, [categories, selectedCategoryId]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const client of allClients) {
      if (!client.roster_category_id) {
        continue;
      }

      counts.set(client.roster_category_id, (counts.get(client.roster_category_id) ?? 0) + 1);
    }

    return counts;
  }, [allClients]);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
      return;
    }

    let active = true;

    async function load(categoryId: string | null) {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [
          categoriesResponse,
          allClientsResponse,
          filteredClientsResponse,
        ] = await Promise.all([
          fetch("/api/pt/roster-categories", { cache: "no-store" }),
          fetch("/api/pt/clients", { cache: "no-store" }),
          categoryId
            ? fetch(`/api/pt/clients?category_id=${encodeURIComponent(categoryId)}`, {
                cache: "no-store",
              })
            : Promise.resolve(null),
        ]);

        const categoriesPayload = (await categoriesResponse.json()) as PTRosterCategoriesApiResponse;
        const allClientsPayload = (await allClientsResponse.json()) as PTRosterClientsApiResponse;
        const filteredClientsPayload = filteredClientsResponse
          ? ((await filteredClientsResponse.json()) as PTRosterClientsApiResponse)
          : null;

        if (!active) {
          return;
        }

        if (!categoriesPayload.ok) {
          setErrorMessage(categoriesPayload.error.message);
          return;
        }

        if (!allClientsPayload.ok) {
          setErrorMessage(allClientsPayload.error.message);
          return;
        }

        if (filteredClientsPayload && !filteredClientsPayload.ok) {
          setErrorMessage(filteredClientsPayload.error.message);
          return;
        }

        setCategories(categoriesPayload.data.items);
        setAllClients(allClientsPayload.data.items);
        setVisibleClients(
          categoryId === null
            ? allClientsPayload.data.items
            : (filteredClientsPayload?.data.items ?? []),
        );
      } catch {
        if (active) {
          setErrorMessage("Unable to load the PT roster workspace.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load(selectedCategoryId);

    return () => {
      active = false;
    };
  }, [selectedCategoryId, status, user]);

  const query = deferredSearch.trim().toLowerCase();
  const filteredClients = useMemo(
    () =>
      visibleClients.filter((client) =>
        matchesQuery(query, [
          client.client_name,
          client.client_email,
          client.status,
          client.roster_name,
        ]),
      ),
    [query, visibleClients],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading PT clients" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingCategory(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/pt/roster-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: draftCategoryName }),
      });
      const payload = (await response.json()) as ApiResponse<PTRosterCategory>;

      if (!payload.ok) {
        setFeedback({
          tone: "error",
          title: "Unable To Create Category",
          message: payload.error.message,
        });
        return;
      }

      const createdCategory = payload.data;
      setCategories((current) => [...current, createdCategory]);
      setDraftCategoryName("");
      setShowCategoryForm(false);
      setSelectedCategoryId(createdCategory.id);
      setFeedback({
        tone: "success",
        title: "Category Created",
        message: "The roster category was created through the protected PT BFF route.",
      });
    } catch {
      setFeedback({
        tone: "error",
        title: "Unable To Create Category",
        message: "The PT roster category request could not be completed.",
      });
    } finally {
      setSubmittingCategory(false);
    }
  }

  async function handleInviteClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingInvitation(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/pt/client-invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_email: draftInviteEmail }),
      });
      const payload = (await response.json()) as ApiResponse<PTClientInvitation>;

      if (!payload.ok) {
        setFeedback({
          tone: "error",
          title: "Unable To Send Invite",
          message: payload.error.message,
        });
        return;
      }

      setDraftInviteEmail("");
      setShowInviteForm(false);
      setFeedback({
        tone: "success",
        title: "Invite Sent",
        message: "The PT invite was sent through the protected BFF workflow.",
      });
    } catch {
      setFeedback({
        tone: "error",
        title: "Unable To Send Invite",
        message: "The PT invitation request could not be completed.",
      });
    } finally {
      setSubmittingInvitation(false);
    }
  }

  async function handleRosterAssignment(
    clientId: string,
    rosterCategoryId: string | null,
  ) {
    setUpdatingClientId(clientId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/pt/clients/${clientId}/roster-category`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roster_category_id: rosterCategoryId }),
      });
      const payload = (await response.json()) as ApiResponse<PTRosterClient>;

      if (!payload.ok) {
        setFeedback({
          tone: "error",
          title: "Unable To Update Roster",
          message: payload.error.message,
        });
        return;
      }

      const updatedClient = payload.data;
      setAllClients((current) =>
        current.map((client) => (client.client_user_id === updatedClient.client_user_id ? updatedClient : client)),
      );
      setVisibleClients((current) => {
        if (selectedCategoryId === null) {
          return current.map((client) =>
            client.client_user_id === updatedClient.client_user_id ? updatedClient : client,
          );
        }

        const remaining = current.filter((client) => client.client_user_id !== updatedClient.client_user_id);
        return updatedClient.roster_category_id === selectedCategoryId
          ? [...remaining, updatedClient]
          : remaining;
      });
      setFeedback({
        tone: "success",
        title: "Roster Updated",
        message: "The client roster assignment was updated through the protected PT BFF route.",
      });
    } catch {
      setFeedback({
        tone: "error",
        title: "Unable To Update Roster",
        message: "The roster assignment request could not be completed.",
      });
    } finally {
      setUpdatingClientId(null);
    }
  }

  const showLoadingState = loading && allClients.length === 0 && !errorMessage;
  const showSearchEmptyState = query.length > 0;

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Client Roster"
      subtitle="Invite, organize, and launch PT client workspaces through the existing protected roster and invitation routes."
      searchLabel="Search roster clients"
      searchPlaceholder="Search clients or categories"
      searchValue={searchValue}
      onSearchChange={(nextValue) => {
        startTransition(() => {
          setSearchValue(nextValue);
        });
      }}
      notificationSlot={(
        <MobileHeaderUtilities
          role="pt"
          settingsHref="/pt/settings"
          leadingSlot={<ActionPill href="/pt" tone="purple">Dashboard</ActionPill>}
        />
      )}
      topHubAction={(
        <ActionPillButton
          onClick={() => setShowInviteForm((current) => !current)}
          expanded={showInviteForm}
        >
          {showInviteForm ? "Close invite" : "Open invite"}
        </ActionPillButton>
      )}
      activePath="/pt/clients"
      showAvatar={false}
    >
      {feedback ? (
        <FeedbackBanner
          tone={feedback.tone}
          title={feedback.title}
          message={feedback.message}
        />
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Roster sync"
          title="Client portal unavailable"
          description="This screen stays on the existing PT roster and invitation BFF routes and does not fall back to direct backend calls."
        >
          <PortalStateCard
            title="Unable to load the PT roster workspace"
            message={errorMessage}
            action={<ActionPill href="/pt">Back to dashboard</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading your client portal"
          description="Fetching PT roster categories and linked clients through the current protected PT routes."
        >
          <PortalStateCard
            title="Refreshing client portal"
            message="Your roster workspace is loading through the signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : (
        <>
          <MobileSection
            eyebrow="Invitations"
            title="Roster control"
            description="Keep the invite workflow and roster categories intact while moving the PT client portal into the mobile shell."
            action={<ActionPill href="/pt/settings" tone="purple">Settings</ActionPill>}
          >
            <MobileCard as="article" variant="action" className="mobile-pt-hero-card">
              <div className="mobile-pt-hero-masthead">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Protected PT roster</p>
                  <h2 className="mobile-section__title">Organize client work without leaving the shell</h2>
                  <p className="mobile-section__description">
                    Invites, category changes, and client launches still run through the existing PT BFF routes. This phase only changes the visual presentation and pacing.
                  </p>
                </div>
                <div className="mobile-pt-actions">
                  <ActionPill href="/pt">PT home</ActionPill>
                  <ActionPill href="/pt/training" tone="purple">Training hub</ActionPill>
                </div>
              </div>

              <div className="mobile-pt-signal-grid mobile-pt-signal-grid--compact">
                <div className="mobile-pt-signal-card">
                  <p className="mobile-section__eyebrow">Linked clients</p>
                  <h3 className="mobile-section__title">{allClients.length}</h3>
                  <p className="mobile-section__description">Visible across the current protected roster response.</p>
                </div>
                <div className="mobile-pt-signal-card">
                  <p className="mobile-section__eyebrow">Categories</p>
                  <h3 className="mobile-section__title">{categories.length + 1}</h3>
                  <p className="mobile-section__description">Includes the uncategorized all-clients view.</p>
                </div>
                <div className="mobile-pt-signal-card">
                  <p className="mobile-section__eyebrow">Current lens</p>
                  <h3 className="mobile-section__title">{selectedFolderName}</h3>
                  <p className="mobile-section__description">Local search and folder filters never call new endpoints.</p>
                </div>
              </div>
            </MobileCard>

            {showInviteForm ? (
              <MobileCard as="div" variant="action" className="mobile-pt-form-card">
                <form className="mobile-pt-form-grid" onSubmit={handleInviteClient}>
                  <div className="field">
                    <label htmlFor="pt-invite-client-email">Client email</label>
                    <input
                      id="pt-invite-client-email"
                      type="email"
                      value={draftInviteEmail}
                      onChange={(event) => setDraftInviteEmail(event.target.value)}
                      placeholder="client@example.com"
                      disabled={submittingInvitation}
                    />
                  </div>
                  <div className="mobile-pt-actions">
                    <button type="submit" className="mobile-pt-button mobile-pt-button--primary mobile-focus-ring" disabled={submittingInvitation}>
                      {submittingInvitation ? "Sending..." : "Send invite"}
                    </button>
                    <button
                      type="button"
                      className="mobile-pt-button mobile-focus-ring"
                      onClick={() => setShowInviteForm(false)}
                      disabled={submittingInvitation}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </MobileCard>
            ) : (
              <PortalStateCard
                title="Invite an existing client"
                message="Open the invite panel to send a PT client invitation through the current protected BFF workflow."
                action={
                  <ActionPillButton
                    onClick={() => setShowInviteForm(true)}
                    expanded={showInviteForm}
                  >
                    Invite a Client
                  </ActionPillButton>
                }
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Roster categories"
            title={selectedFolderName}
            description="Folder chips stay backed by the current PT roster-category routes. Add a new category remains available as an existing PT-owned action."
          >
            <div className="mobile-pt-chip-grid" role="list" aria-label="PT roster folders">
              <button
                type="button"
                className={[
                  "mobile-pt-chip-card",
                  selectedCategoryId === null ? "mobile-pt-chip-card--active" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => {
                  setSelectedCategoryId(null);
                  setShowCategoryForm(false);
                }}
                aria-label="Open All Clients roster folder"
              >
                <span className="mobile-pt-chip-card__title">All Clients</span>
                <span className="mobile-pt-chip-card__meta">{allClients.length} linked client{allClients.length === 1 ? "" : "s"}</span>
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={[
                    "mobile-pt-chip-card",
                    selectedCategoryId === category.id ? "mobile-pt-chip-card--active" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setShowCategoryForm(false);
                  }}
                  aria-label={`Open ${category.name} roster folder`}
                >
                  <span className="mobile-pt-chip-card__title">{category.name}</span>
                  <span className="mobile-pt-chip-card__meta">
                    {categoryCounts.get(category.id) ?? 0} client{(categoryCounts.get(category.id) ?? 0) === 1 ? "" : "s"}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className={[
                  "mobile-pt-chip-card",
                  showCategoryForm ? "mobile-pt-chip-card--active" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setShowCategoryForm((current) => !current)}
                aria-label="Add a new roster category"
                aria-expanded={showCategoryForm}
              >
                <span className="mobile-pt-chip-card__title">Add a New Category</span>
                <span className="mobile-pt-chip-card__meta">Create a PT-owned roster folder</span>
              </button>
            </div>

            {showCategoryForm ? (
              <MobileCard as="div" variant="soft" className="mobile-pt-form-card">
                <form className="mobile-pt-form-grid" onSubmit={handleCreateCategory}>
                  <div className="field">
                    <label htmlFor="pt-roster-category-name">Category name</label>
                    <input
                      id="pt-roster-category-name"
                      value={draftCategoryName}
                      onChange={(event) => setDraftCategoryName(event.target.value)}
                      placeholder="Strength Focus"
                      disabled={submittingCategory}
                    />
                  </div>
                  <div className="mobile-pt-actions">
                    <button type="submit" className="mobile-pt-button mobile-pt-button--primary mobile-focus-ring" disabled={submittingCategory}>
                      {submittingCategory ? "Creating..." : "Create category"}
                    </button>
                    <button
                      type="button"
                      className="mobile-pt-button mobile-focus-ring"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setDraftCategoryName("");
                      }}
                      disabled={submittingCategory}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </MobileCard>
            ) : null}
          </MobileSection>

          <MobileSection
            eyebrow="Client cards"
            title="Roster lineup"
            description="Local search filters the already-fetched roster list only. Client actions continue to point at the existing PT detail, metrics, assignment, recommendation, and log-history routes."
          >
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <MobileCard key={client.id} as="article" variant="action" className="mobile-pt-client-card">
                  <div className="mobile-pt-client-card__header">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">Client roster card</p>
                      <h3 className="mobile-section__title">{client.client_name || client.client_email}</h3>
                      <p className="mobile-section__description">{client.client_email}</p>
                    </div>
                    <span className="mobile-pill mobile-pill--purple">{client.status}</span>
                  </div>

                  <dl className="mobile-pt-fact-grid">
                    <div>
                      <dt>Roster</dt>
                      <dd>{client.roster_name ?? "Uncategorized"}</dd>
                    </div>
                    <div>
                      <dt>Client status</dt>
                      <dd>{client.status}</dd>
                    </div>
                  </dl>

                  <div className="mobile-pt-filter-summary">
                    <span>{client.roster_name ?? "Uncategorized"}</span>
                    <span>{client.status}</span>
                  </div>

                  <div className="field">
                    <label htmlFor={`roster-category-${client.client_user_id}`}>Roster category</label>
                    <select
                      id={`roster-category-${client.client_user_id}`}
                      value={client.roster_category_id ?? ""}
                      disabled={updatingClientId === client.client_user_id}
                      onChange={(event) =>
                        void handleRosterAssignment(
                          client.client_user_id,
                          event.target.value.length > 0 ? event.target.value : null,
                        )
                      }
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mobile-pt-actions">
                    <ActionPill href={`/pt/clients/${client.client_user_id}`}>Client detail</ActionPill>
                    <ActionPill href={`/pt/clients/${client.client_user_id}/metrics`} tone="purple">Metrics</ActionPill>
                    <ActionPill href={`/pt/clients/${client.client_user_id}/assign`}>Training</ActionPill>
                    <ActionPill href={`/pt/clients/${client.client_user_id}/recommend-meal-plan`} tone="purple">Meal plans</ActionPill>
                    {client.status === "active" ? (
                      <ActionPill href={`/pt/clients/${client.client_user_id}/log-history?clientEmail=${encodeURIComponent(client.client_email)}`}>
                        Log history
                      </ActionPill>
                    ) : null}
                  </div>
                </MobileCard>
              ))
            ) : showSearchEmptyState ? (
              <PortalStateCard
                title="No roster clients match this search"
                message={`No linked clients matched "${searchValue.trim()}". Adjust the local filter to see the current roster again.`}
              />
            ) : (
              <PortalStateCard
                title="No clients in this roster yet"
                message="This roster selection does not currently contain any linked clients."
                action={<ActionPill href="/pt">Back to dashboard</ActionPill>}
              />
            )}
          </MobileSection>
        </>
      )}
    </MobileAppShell>
  );
}
