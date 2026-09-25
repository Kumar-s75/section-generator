"use client";

import { createElement, useState, type CSSProperties } from "react";
import { Bold, Italic, Link2, ChevronDown, Underline } from "lucide-react";
import type { UINode } from "@/lib/schema";

export type TextProps = {
  node: UINode;
  onTextChange: (id: string, text: string) => void;
  onPropsChange?: (id: string, props: NonNullable<UINode["props"]>) => void;
  disabled?: boolean;
};
export function InlineText({
  node,
  onTextChange,
  onPropsChange,
  disabled,
  as,
  className = "",
}: TextProps & { as: string; className?: string }) {
  const [initialText] = useState(node.props?.text ?? "");
  const [active, setActive] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState(node.props?.href ?? "");
  const [linkError, setLinkError] = useState("");
  const props = node.props ?? {};
  const change = (patch: NonNullable<UINode["props"]>) =>
    onPropsChange?.(node.id, patch);
  const style: CSSProperties = {
    fontWeight: props.bold === undefined ? undefined : props.bold ? 700 : 400,
    fontStyle: props.italic ? "italic" : undefined,
    textDecoration: props.underline || props.href ? "underline" : undefined,
    color: props.color,
  };
  return (
    <div
      className={`editable-shell ${active ? "is-selected" : ""} ${as === "span" ? "inline-shell" : ""}`}
      onFocus={() => setActive(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setActive(false);
          setLinkOpen(false);
        }
      }}
    >
      {createElement(
        as,
        {
          className: `editable ${className}`,
          style,
          contentEditable: !disabled,
          suppressContentEditableWarning: true,
          role: "textbox",
          "aria-label": `Edit ${node.id}`,
          "aria-multiline": as !== "button",
          tabIndex: disabled ? -1 : 0,
          "data-node-id": node.id,
          spellCheck: false,
          ...(as === "button" ? { type: "button" } : {}),
          onInput: (event: React.FormEvent<HTMLElement>) =>
            onTextChange(node.id, event.currentTarget.textContent ?? ""),
          onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
            if (
              event.key === "Escape" ||
              (event.key === "Enter" && (as === "button" || !event.shiftKey))
            ) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          },
          onPaste: (event: React.ClipboardEvent<HTMLElement>) => {
            event.preventDefault();
            const selection = window.getSelection();
            if (!selection?.rangeCount) return;
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const plain = document.createTextNode(
              event.clipboardData.getData("text/plain"),
            );
            range.insertNode(plain);
            range.setStartAfter(plain);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            onTextChange(node.id, event.currentTarget.textContent ?? "");
          },
        },
        initialText,
      )}
      {active && !disabled && (
        <>
          <span className="selection-handles" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          {onPropsChange && (
            <div
              className="format-toolbar"
              role="toolbar"
              aria-label="Text formatting"
              onMouseDown={(event) => {
                if (!(event.target instanceof HTMLInputElement))
                  event.preventDefault();
              }}
            >
              <button
                type="button"
                aria-label="Bold"
                aria-pressed={props.bold ?? /^h[123]$/.test(as)}
                onClick={() =>
                  change({ bold: !(props.bold ?? /^h[123]$/.test(as)) })
                }
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                aria-label="Italic"
                aria-pressed={!!props.italic}
                onClick={() => change({ italic: !props.italic })}
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                aria-label="Edit link"
                aria-expanded={linkOpen}
                onClick={() => {
                  setLink(props.href ?? "");
                  setLinkOpen(!linkOpen);
                }}
              >
                <Link2 size={14} />
              </button>
              <button
                type="button"
                aria-label="Underline"
                aria-pressed={!!props.underline}
                onClick={() => change({ underline: !props.underline })}
              >
                <ChevronDown size={11} />
                <Underline className="sr-only" />
              </button>
              <span className="format-divider" />
              <label className="color-control" aria-label="Text color">
                <input
                  aria-label="Text color"
                  type="color"
                  value={props.color ?? "#111111"}
                  onChange={(event) => change({ color: event.target.value })}
                />
              </label>
              {linkOpen && (
                <div className="link-popover">
                  <label>
                    Link URL
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={link}
                      onChange={(event) => {
                        setLink(event.target.value);
                        setLinkError("");
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (link && !/^https?:\/\//i.test(link)) {
                        setLinkError("Use an http or https URL.");
                        return;
                      }
                      try {
                        if (link) new URL(link);
                      } catch {
                        setLinkError("Enter a valid URL.");
                        return;
                      }
                      change({ href: link || undefined });
                      setLinkOpen(false);
                    }}
                  >
                    Apply
                  </button>
                  {linkError && <span role="alert">{linkError}</span>}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
