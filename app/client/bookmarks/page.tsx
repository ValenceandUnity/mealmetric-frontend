"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RecordCard } from "@/components/cards/RecordCard";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, BookmarkFolder, BookmarkFolderListPayload } from "@/lib/types/api";

type BookmarksResponse = ApiResponse<BookmarkFolderListPayload>;
type FolderResponse = ApiResponse<BookmarkFolder>;

export default function ClientBookmarksPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [folderName, setFolderName] = useState("Favorites");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadBookmarks() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/client/bookmarks", { cache: "no-store" });
      const payload = (await response.json()) as BookmarksResponse;
      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        setFolders([]);
        return;
      }
      setFolders(payload.data.items);
    } catch {
      setErrorMessage("Unable to load bookmarks.");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && user?.role === "client") {
      void loadBookmarks();
    }
  }, [status, user]);

  async function handleCreateFolder() {
    setErrorMessage(null);
    try {
      const response = await fetch("/api/client/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName }),
      });
      const payload = (await response.json()) as FolderResponse;
      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }
      setFolderName("");
      await loadBookmarks();
    } catch {
      setErrorMessage("Unable to create bookmark folder.");
    }
  }

  async function handleDeleteFolder(folderId: string) {
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/client/bookmarks/${folderId}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse<{ deleted: true }>;
      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }
      await loadBookmarks();
    } catch {
      setErrorMessage("Unable to delete bookmark folder.");
    }
  }

  async function handleDeleteItem(folderId: string, itemId: string) {
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/client/bookmarks/${folderId}/items/${itemId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<{ deleted: true }>;
      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }
      await loadBookmarks();
    } catch {
      setErrorMessage("Unable to delete bookmark.");
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading bookmarks" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Bookmarks require an authenticated client session." />;
  }

  return (
    <PageShell
      title="Bookmarks"
      user={user}
      navigation={
        <>
          <Link className="link-button" href="/client">
            Back to client home
          </Link>
          <Link className="link-button" href="/client/meal-plans">
            Browse meal plans
          </Link>
        </>
      }
    >
      {loading ? <LoadingBlock title="Loading bookmarks" message="Fetching bookmark folders." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to manage bookmarks" message={errorMessage} /> : null}

      {!loading ? (
        <>
          <Section title="Create folder">
            <div className="form-grid grid--2">
              <div className="field">
                <label htmlFor="folder-name">Folder name</label>
                <input
                  id="folder-name"
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                />
              </div>
              <div className="row">
                <button type="button" onClick={() => void handleCreateFolder()}>
                  Save folder
                </button>
              </div>
            </div>
          </Section>

          <Section title="Saved folders">
            {folders.length > 0 ? (
              <div className="stacked-list">
                {folders.map((folder) => (
                  <div key={folder.id} className="surface">
                    <div className="row row--between">
                      <div>
                        <h3 className="section__title">{folder.name}</h3>
                        <p className="section__copy">
                          {folder.items.length} saved meal plan
                          {folder.items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button type="button" onClick={() => void handleDeleteFolder(folder.id)}>
                        Delete folder
                      </button>
                    </div>
                    {folder.items.length > 0 ? (
                      <div className="stacked-list">
                        {folder.items.map((item) => (
                          <RecordCard
                            key={item.id}
                            eyebrow={item.meal_plan.vendor_name}
                            title={item.meal_plan.name}
                            description={
                              item.meal_plan.description ??
                              "Bookmarked from the protected client meal-plan catalog."
                            }
                            metadata={[
                              {
                                label: "Price",
                                value: `$${(item.meal_plan.total_price_cents / 100).toFixed(2)}`,
                              },
                              {
                                label: "ZIP",
                                value: item.meal_plan.vendor_zip_code ?? "Unavailable",
                              },
                            ]}
                            footer={
                              <>
                                <Link
                                  className="link-button"
                                  href={`/client/meal-plans/${item.meal_plan.id}`}
                                >
                                  View plan
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteItem(folder.id, item.id)}
                                >
                                  Remove
                                </button>
                              </>
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="Folder is empty"
                        message="Use the bookmark action on a meal plan to populate this folder."
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No bookmark folders yet"
                message="Create a folder, then save meal plans from the discovery page."
              />
            )}
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
