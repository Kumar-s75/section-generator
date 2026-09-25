"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { PreviewCanvas } from "./preview-canvas";
import { updateNodeText, updateNodeProps } from "@/lib/tree";
import { layoutSchema, savedLayoutSchema, type UINode } from "@/lib/schema";

type Notice = { kind: "success" | "error" | "info"; text: string };
export function Editor() {
  const [prompt, setPrompt] = useState("");
  const [layout, setLayout] = useState<UINode | null>(null);
  const [busy, setBusy] = useState<"generate" | "save" | "restore" | null>(
    "restore",
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [tab, setTab] = useState<"preview" | "json">("preview");
  const [revision, setRevision] = useState(0);
  const [confirmReplace, setConfirmReplace] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function restore() {
      try {
        const response = await fetch("/api/save", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error ?? "Could not restore your saved section.",
          );
        if (data.layout !== null) {
          const saved = savedLayoutSchema.parse(data);
          setLayout(saved.layout);
          setSavedAt(saved.savedAt);
          setPrompt(
            saved.prompt ??
              (saved.layout.id.startsWith("pricing")
                ? "Build a pricing section"
                : "Create a hero section"),
          );
          setNotice({
            kind: "success",
            text: "Your saved section is restored. Pick up where you left off.",
          });
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setNotice({
            kind: "error",
            text:
              error instanceof Error
                ? error.message
                : "Could not restore your saved section.",
          });
      } finally {
        if (!controller.signal.aborted) setBusy(null);
      }
    }
    void restore();
    return () => controller.abort();
  }, []);
  async function generate() {
    if (!prompt.trim()) {
      setNotice({
        kind: "error",
        text: "Describe a hero or pricing section to get started.",
      });
      return;
    }
    if (dirty && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    setConfirmReplace(false);
    setBusy("generate");
    setNotice(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "Could not generate your section. Try again.",
        );
      setLayout(layoutSchema.parse(data.layout));
      setRevision((value) => value + 1);
      setDirty(true);
      setSavedAt(null);
      setTab("preview");
      setNotice({
        kind: "success",
        text: "Your section is ready. Click any text to make it yours.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong. Try again.",
      });
    } finally {
      setBusy(null);
    }
  }
  async function save() {
    if (!layout) return;
    setBusy("save");
    setNotice(null);
    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout, prompt }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not save changes. Try again.");
      setSavedAt(data.savedAt);
      setDirty(false);
      setConfirmReplace(false);
      setNotice({
        kind: "success",
        text: "Changes saved to disk. Your section will be here when you return.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Unable to save. Try again.",
      });
    } finally {
      setBusy(null);
    }
  }
  function edit(id: string, text: string) {
    setLayout((current) =>
      current ? updateNodeText(current, id, text) : current,
    );
    setDirty(true);
    setNotice(null);
    setConfirmReplace(false);
  }
  function format(id: string, props: NonNullable<UINode["props"]>) {
    setLayout((current) =>
      current ? updateNodeProps(current, id, props) : current,
    );
    setDirty(true);
  }
  return (
    <div className="builder-shell min-h-screen">
      <header className="builder-toolbar">
        <Link className="brand" href="/" aria-label="Uncody home">
          <svg
            width="22"
            height="24"
            viewBox="0 0 24 26"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="logo-gradient"
                x1="3"
                y1="3"
                x2="22"
                y2="23"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#40d5ce" />
                <stop offset=".5" stopColor="#3589dc" />
                <stop offset="1" stopColor="#3e53c9" />
              </linearGradient>
            </defs>
            <path
              d="M3 12v4a9 9 0 0 0 18 0V2h-3a3 3 0 0 0-3 3v11a3 3 0 0 1-6 0v-9l-6 5Z"
              fill="url(#logo-gradient)"
            />
            <path d="M3 10V7a3 3 0 0 1 6 0L3 12" fill="#62ddcf" />
          </svg>
          <span>Uncody</span>
        </Link>
        <form
          className="prompt-form"
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <label className="sr-only" htmlFor="prompt">
            Describe your section
          </label>
          <input
            id="prompt"
            value={prompt}
            maxLength={2000}
            disabled={!!busy}
            list="prompt-examples"
            placeholder={
              'Enter your prompt, e.g., "a pricing section with 3 tiers"...'
            }
            onChange={(event) => {
              setPrompt(event.target.value);
              setConfirmReplace(false);
            }}
          />
          <datalist id="prompt-examples">
            <option value="Build a pricing section with 3 tiers" />
            <option value="Create a modern hero section" />
            <option
              value={
                'Pricing for "Orbit" with 4 tiers, annual billing in EUR, dark theme and indigo accent'
              }
            />
          </datalist>
          <button
            className="generate-button"
            type="submit"
            aria-label="Generate section"
            disabled={!!busy}
          >
            {busy === "generate" ? (
              <LoaderCircle className="spin" size={13} />
            ) : (
              "Generate"
            )}
          </button>
        </form>
        <button
          className="save-button"
          type="button"
          aria-label="Save changes"
          disabled={!layout || !!busy || !dirty}
          onClick={() => void save()}
        >
          {busy === "save" ? "Saving…" : "Save Changes"}
        </button>
      </header>
      <main className="workspace" aria-label="Section editor">
        <PreviewCanvas
          layout={layout}
          busy={busy}
          tab={tab}
          setTab={setTab}
          mobile={mobile}
          setMobile={setMobile}
          revision={revision}
          edit={edit}
          format={format}
          setPrompt={setPrompt}
        />
        {confirmReplace && (
          <div className="replace-confirm" role="alert">
            <p>Generating a new section will replace your unsaved work.</p>
            <button type="button" onClick={() => void generate()}>
              Replace section
            </button>
            <button type="button" onClick={() => setConfirmReplace(false)}>
              Keep editing
            </button>
          </div>
        )}
        <div
          className={`feedback ${notice?.kind ?? ""}`}
          role="status"
          aria-live="polite"
        >
          {notice?.text ?? (savedAt && !dirty ? "All changes saved" : "")}
        </div>
      </main>
    </div>
  );
}
