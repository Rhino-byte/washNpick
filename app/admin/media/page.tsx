"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAllSiteImageSlots } from "@/lib/site-images";
import { isCloudinaryConfigured } from "@/lib/cloudinary/config";

const SESSION_KEY = "freshfold-admin-secret";

type UploadState = "idle" | "uploading" | "success" | "error";

interface SlotUploadState {
  status: UploadState;
  message?: string;
  secureUrl?: string;
}

function uploadErrorMessage(status: number, serverError?: string): string {
  if (status === 401) {
    return "Admin secret wrong — Lock, then re-unlock with the exact ADMIN_UPLOAD_SECRET from .env (restart dev server after changing .env).";
  }
  if (status === 500 && serverError?.includes("credentials")) {
    return "Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET in .env.";
  }
  return serverError ?? "Upload failed";
}

export default function AdminMediaPage() {
  const [secret, setSecret] = useState("");
  const [inputSecret, setInputSecret] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [cacheBust, setCacheBust] = useState<Record<string, number>>({});
  const [confirmedExists, setConfirmedExists] = useState<Record<string, boolean>>({});
  const [slotStates, setSlotStates] = useState<Record<string, SlotUploadState>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setSecret(stored);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputSecret.trim();
    if (!trimmed) return;

    setUnlocking(true);
    setUnlockError("");

    try {
      const response = await fetch("/api/cloudinary/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${trimmed}` },
      });

      if (!response.ok) {
        setUnlockError(
          "Secret doesn't match ADMIN_UPLOAD_SECRET in .env — restart dev server after changing .env.",
        );
        return;
      }

      sessionStorage.setItem(SESSION_KEY, trimmed);
      setSecret(trimmed);
    } catch {
      setUnlockError("Could not verify secret. Is the dev server running?");
    } finally {
      setUnlocking(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSecret("");
    setInputSecret("");
    setUnlockError("");
  };

  const handleUpload = async (slotKey: string, publicId: string, file: File) => {
    setSlotStates((prev) => ({
      ...prev,
      [slotKey]: { status: "uploading" },
    }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("publicId", publicId);

    try {
      const response = await fetch("/api/cloudinary/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret.trim()}`,
        },
        body: formData,
      });

      const data = (await response.json()) as {
        error?: string;
        secureUrl?: string;
      };

      if (!response.ok) {
        throw new Error(uploadErrorMessage(response.status, data.error));
      }

      setCacheBust((prev) => ({ ...prev, [slotKey]: Date.now() }));
      setConfirmedExists((prev) => ({ ...prev, [slotKey]: true }));
      setSlotStates((prev) => ({
        ...prev,
        [slotKey]: {
          status: "success",
          message: "Uploaded successfully",
          secureUrl: data.secureUrl,
        },
      }));
    } catch (error) {
      setSlotStates((prev) => ({
        ...prev,
        [slotKey]: {
          status: "error",
          message: error instanceof Error ? error.message : "Upload failed",
        },
      }));
    }
  };

  if (!secret) {
    return (
      <div className="app-shell mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 py-8">
        <main className="flex-1">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
              <Lock className="h-6 w-6 text-accent-start" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground">Media admin</h1>
            <p className="mt-2 text-sm text-muted">
              Enter your admin upload secret to manage Cloudinary images.
            </p>
            <form onSubmit={handleUnlock} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="admin-secret" required>
                  Admin secret
                </Label>
                <Input
                  id="admin-secret"
                  type="password"
                  value={inputSecret}
                  onChange={(e) => setInputSecret(e.target.value)}
                  placeholder="ADMIN_UPLOAD_SECRET"
                />
              </div>
              {unlockError && (
                <p className="text-sm text-red-400">{unlockError}</p>
              )}
              <Button
                type="submit"
                variant="accent"
                size="lg"
                fullWidth
                disabled={unlocking}
              >
                {unlocking ? "Verifying..." : "Unlock"}
              </Button>
            </form>
            <Link
              href="/"
              className="mt-4 flex items-center justify-center gap-1 text-sm text-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to site
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const slots = getAllSiteImageSlots();

  return (
    <div className="app-shell mx-auto min-h-screen w-full max-w-[480px] px-4 py-6 pb-12">
      <main>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Media admin</h1>
          <p className="mt-1 text-sm text-muted">
            Upload images to Cloudinary. Each slot overwrites its fixed public ID.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-muted hover:text-foreground"
        >
          Lock
        </button>
      </div>

      {!isCloudinaryConfigured() && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env to preview images.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {slots.map((slot) => {
          const state = slotStates[slot.key] ?? { status: "idle" as const };
          const inputId = `file-${slot.key}`;

          return (
            <div key={slot.key} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-foreground">{slot.label}</h2>
                  <p className="mt-0.5 font-mono text-xs text-accent-start">
                    {slot.image.publicId}
                  </p>
                </div>
                {state.status === "success" && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
                )}
                {state.status === "error" && (
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                )}
              </div>

              <div className="mt-3">
                <ImageSlot
                  image={slot.image}
                  aspect="video"
                  cacheBust={cacheBust[slot.key]}
                  forceExists={confirmedExists[slot.key]}
                />
              </div>

              <div className="mt-4">
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleUpload(slot.key, slot.image.publicId, file);
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  disabled={state.status === "uploading"}
                  onClick={() => document.getElementById(inputId)?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {state.status === "uploading" ? "Uploading..." : "Upload image"}
                </Button>
                {state.message && (
                  <p
                    className={`mt-2 text-xs ${
                      state.status === "error" ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {state.message}
                  </p>
                )}
                {state.secureUrl && (
                  <a
                    href={state.secureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-accent-start hover:underline"
                  >
                    Open in Cloudinary
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/"
        className="mt-8 flex items-center justify-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>
      </main>
    </div>
  );
}
