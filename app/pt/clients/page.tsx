"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type {
  ApiResponse,
  PTClientInvitation,
  PTClientInvitationListResponse,
  PTRosterCategory,
  PTRosterCategoryListResponse,
  PTRosterClient,
  PTRosterClientListResponse,
} from "@/lib/types/api";

type PTRosterCategoriesApiResponse = ApiResponse<PTRosterCategoryListResponse>;
type PTRosterClientsApiResponse = ApiResponse<PTRosterClientListResponse>;
type PTClientInvitationsApiResponse = ApiResponse<PTClientInvitationListResponse>;

export default function PTClientsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [categories, setCategories] = useState<PTRosterCategory[]>([]);
  const [allClients, setAllClients] = useState<PTRosterClient[]>([]);
  const [visibleClients, setVisibleClients] = useState<PTRosterClient[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sentInvitations, setSentInvitations] = useState<PTClientInvitation[]>([]);
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
          invitationsResponse,
          filteredClientsResponse,
        ] = await Promise.all([
          fetch("/api/pt/roster-categories", { cache: "no-store" }),
          fetch("/api/pt/clients", { cache: "no-store" }),
          fetch("/api/pt/client-invitations", { cache: "no-store" }),
          categoryId
            ? fetch(`/api/pt/clients?category_id=${encodeURIComponent(categoryId)}`, {
                cache: "no-store",
              })
            : Promise.resolve(null),
        ]);

        const categoriesPayload = (await categoriesResponse.json()) as PTRosterCategoriesApiResponse;
        const allClientsPayload = (await allClientsResponse.json()) as PTRosterClientsApiResponse;
        const invitationsPayload = (await invitationsResponse.json()) as PTClientInvitationsApiResponse;
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

        if (!invitationsPayload.ok) {
          setErrorMessage(invitationsPayload.error.message);
          return;
        }

        if (filteredClientsPayload && !filteredClientsPayload.ok) {
          setErrorMessage(filteredClientsPayload.error.message);
          return;
        }

        setCategories(categoriesPayload.data.items);
        setAllClients(allClientsPayload.data.items);
        setSentInvitations(invitationsPayload.data.items);
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
      setSentInvitations((current) => [payload.data, ...current.filter((item) => item.id !== payload.data.id)]);
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

  return (
    <PageShell
      title="Client command center"
      user={user}
      hideTopHubMeta
      className="app-shell--pt-clients-roster"
    >
      {loading ? <LoadingBlock title="Loading clients" message="Calling PT roster routes through the BFF." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load PT clients" message={errorMessage} /> : null}
      {feedback ? (
        <FeedbackBanner
          tone={feedback.tone}
          title={feedback.title}
          message={feedback.message}
        />
      ) : null}

      {!loading && !errorMessage ? (
        <SectionBlock
          eyebrow="Roster"
          title="Client Roster"
        >
          {showInviteForm ? (
            <Card className="pt-roster-category-form" variant="soft">
              <form className="pt-roster-category-form__layout" onSubmit={handleInviteClient}>
                <div>
                  <p className="page-header__eyebrow">Invite Client</p>
                  <h3 className="page-header__title">Invite an existing client</h3>
                </div>
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
                <div className="action-row">
                  <button type="submit" disabled={submittingInvitation}>
                    {submittingInvitation ? "Sending..." : "Send Invite"}
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setShowInviteForm(false)}
                    disabled={submittingInvitation}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="pt-roster-invite-toggle">
              <button type="button" onClick={() => setShowInviteForm(true)}>
                Invite a Client
              </button>
            </div>
          )}

          {sentInvitations.length > 0 ? (
            <Card className="pt-roster-category-form" variant="soft">
              <div className="stacked-list">
                <div>
                  <p className="page-header__eyebrow">Sent invites</p>
                  <h3 className="page-header__title">Pending and recent roster invites</h3>
                </div>
                {sentInvitations.map((invitation) => (
                  <div key={invitation.id} className="record-card__meta">
                    <span>{invitation.client_email}</span>
                    <span>{invitation.status.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <div className="pt-roster-folders" role="list" aria-label="PT roster folders">
            <button
              type="button"
              className={[
                "pt-roster-folder",
                selectedCategoryId === null ? "pt-roster-folder--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setSelectedCategoryId(null);
                setShowCategoryForm(false);
              }}
              aria-label="Open All Clients roster folder"
            >
              <span className="pt-roster-folder__body">
                <span className="pt-roster-folder__title">All Clients</span>
                <span className="pt-roster-folder__meta">{allClients.length} linked client{allClients.length === 1 ? "" : "s"}</span>
              </span>
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={[
                  "pt-roster-folder",
                  selectedCategoryId === category.id ? "pt-roster-folder--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setShowCategoryForm(false);
                }}
                aria-label={`Open ${category.name} roster folder`}
              >
                <span className="pt-roster-folder__body">
                  <span className="pt-roster-folder__title">{category.name}</span>
                  <span className="pt-roster-folder__meta">
                    {categoryCounts.get(category.id) ?? 0} client{(categoryCounts.get(category.id) ?? 0) === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            ))}

            <button
              type="button"
              className={[
                "pt-roster-folder",
                showCategoryForm ? "pt-roster-folder--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setShowCategoryForm((current) => !current)}
              aria-label="Add a new roster category"
            >
              <span className="pt-roster-folder__body">
                <span className="pt-roster-folder__title">Add a New Category</span>
                <span className="pt-roster-folder__meta">Create a PT-owned roster folder</span>
              </span>
            </button>
          </div>

          {showCategoryForm ? (
            <Card className="pt-roster-category-form" variant="soft">
              <form className="pt-roster-category-form__layout" onSubmit={handleCreateCategory}>
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
                <div className="action-row">
                  <button type="submit" disabled={submittingCategory}>
                    {submittingCategory ? "Creating..." : "Create Category"}
                  </button>
                  <button
                    type="button"
                    className="link-button"
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
            </Card>
          ) : null}

          <Card className="pt-roster-table-card" as="section">
            <div className="pt-roster-table-card__header">
              <div>
                <p className="page-header__eyebrow">Selected folder</p>
                <h3 className="page-header__title">{selectedFolderName}</h3>
              </div>
            </div>

            <div className="pt-roster-table-wrap">
              <table className="pt-roster-table">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Client Email</th>
                    <th>Roster</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleClients.length > 0 ? (
                    visibleClients.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <div className="stacked-list">
                            <span>{client.client_name}</span>
                            {client.status === "active" ? (
                              <Link
                                className="link-button"
                                href={`/pt/clients/${client.client_user_id}/log-history?clientEmail=${encodeURIComponent(client.client_email)}`}
                              >
                                View Log History
                              </Link>
                            ) : null}
                          </div>
                        </td>
                        <td>{client.client_email}</td>
                        <td>
                          <label className="sr-only" htmlFor={`roster-category-${client.client_user_id}`}>
                            Update roster category for {client.client_email}
                          </label>
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
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="pt-roster-table__empty">
                        No clients in this roster yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </SectionBlock>
      ) : null}
    </PageShell>
  );
}
