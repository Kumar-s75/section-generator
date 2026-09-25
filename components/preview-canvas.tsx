"use client";
import { useEffect } from "react";
import {
  Code2,
  Monitor,
  Smartphone,
  MoreHorizontal,
  LoaderCircle,
} from "lucide-react";
import { RecursiveRenderer } from "./recursive-renderer";
import type { UINode } from "@/lib/schema";
type Props = {
  layout: UINode | null;
  busy: "generate" | "save" | "restore" | null;
  tab: "preview" | "json";
  setTab: (tab: "preview" | "json") => void;
  mobile: boolean;
  setMobile: (mobile: boolean) => void;
  revision: number;
  edit: (id: string, text: string) => void;
  format: (id: string, props: NonNullable<UINode["props"]>) => void;
  setPrompt: (prompt: string) => void;
};
export function PreviewCanvas({
  layout,
  busy,
  tab,
  setTab,
  mobile,
  setMobile,
  revision,
  edit,
  format,
  setPrompt,
}: Props) {
  useEffect(() => {
    if (!revision || tab !== "preview") return;
    const target = document.querySelector<HTMLElement>(
      '[data-node-id="plan-name-1"]',
    );
    target?.focus();
    if (target) window.getSelection()?.selectAllChildren(target);
  }, [revision, tab]);
  return (
    <>
      <div
        className={`canvas-content ${mobile ? "mobile-preview" : ""}`}
        aria-label="Preview canvas"
        aria-busy={!!busy}
      >
        {busy === "generate" || busy === "restore" ? (
          <div className="empty-state">
            <LoaderCircle className="spin" size={22} />
            <p>
              {busy === "restore"
                ? "Restoring your saved section…"
                : "Generating your section…"}
            </p>
          </div>
        ) : tab === "json" ? (
          <pre className="json-view" tabIndex={0}>
            {layout
              ? JSON.stringify(layout, null, 2)
              : "// Generate a section to inspect its JSON."}
          </pre>
        ) : layout ? (
          <div className="preview-page">
            <RecursiveRenderer
              key={revision}
              node={layout}
              onTextChange={edit}
              onPropsChange={format}
              disabled={!!busy}
            />
          </div>
        ) : (
          <div className="empty-state">
            <h1>What would you like to build?</h1>
            <p>Enter a prompt above to generate an editable section.</p>
            <div>
              <button
                type="button"
                onClick={() =>
                  setPrompt("Build a pricing section with 3 tiers")
                }
              >
                Pricing section
              </button>
              <button
                type="button"
                onClick={() => setPrompt("Create a modern hero section")}
              >
                Hero section
              </button>
            </div>
          </div>
        )}
      </div>
      <details className="view-options">
        <summary aria-label="View options">
          <MoreHorizontal size={18} />
        </summary>
        <div className="view-options-panel">
          <div role="tablist" aria-label="Canvas view">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "preview"}
              onClick={() => setTab("preview")}
            >
              <Monitor size={14} />
              Preview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "json"}
              onClick={() => setTab("json")}
            >
              <Code2 size={14} />
              JSON
            </button>
          </div>
          <div>
            <button
              type="button"
              aria-label="Desktop preview"
              aria-pressed={!mobile}
              onClick={() => setMobile(false)}
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              aria-label="Mobile preview"
              aria-pressed={mobile}
              onClick={() => setMobile(true)}
            >
              <Smartphone size={14} />
            </button>
          </div>
        </div>
      </details>
    </>
  );
}
