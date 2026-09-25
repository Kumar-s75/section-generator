"use client";

import { type ReactNode } from "react";
import { InlineText as Editable } from "./inline-text";
import { CircleCheck } from "lucide-react";
import type { UINode } from "@/lib/schema";

type RendererProps = {
  node: UINode;
  onTextChange: (id: string, text: string) => void;
  disabled?: boolean;
  onPropsChange?: (id: string, props: NonNullable<UINode["props"]>) => void;
};
type NodeViewProps = RendererProps & { children: ReactNode };
const views: Record<UINode["type"], (props: NodeViewProps) => ReactNode> = {
  section: ({ node, children }) => (
    <section
      className={`generated-section theme-${node.props?.theme ?? "light"} accent-${node.props?.accent ?? "sage"}`}
    >
      {children}
    </section>
  ),
  container: ({ node, children }) => (
    <div
      className={`node-container ${node.props?.arrangement === "row" ? "node-row" : ""}`}
    >
      {children}
    </div>
  ),
  heading: (props) => (
    <>
      <Editable {...props} as={`h${props.node.props?.level ?? 2}`} />
      {props.children}
    </>
  ),
  paragraph: (props) => (
    <>
      <Editable
        {...props}
        as="p"
        className={`text-${props.node.props?.variant ?? "default"}`}
      />
      {props.children}
    </>
  ),
  button: (props) => (
    <>
      <Editable
        {...props}
        as="button"
        className={`preview-button ${props.node.props?.variant === "primary" ? "preview-primary" : "preview-secondary"}`}
      />
      {props.children}
    </>
  ),
  pricingGrid: ({ node, children }) => (
    <div
      className="pricing-grid"
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, Math.min(node.children?.length ?? 3, 4))}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  ),
  price: ({ node }) => (
    <div className="price">
      {node.props?.price}
      <span>{node.props?.billingPeriod}</span>
    </div>
  ),
  pricingCard: ({ node, children }) => (
    <article
      className={`pricing-card ${node.props?.highlighted ? "highlighted" : ""}`}
    >
      {node.props?.planName && (
        <>
          <div className="plan-label">
            <h2>{node.props.planName}</h2>
          </div>
          <div className="price">
            {node.props.price}
            <span>{node.props.billingPeriod}</span>
          </div>
        </>
      )}
      {children}
    </article>
  ),
  featureList: ({ children }) => <ul className="feature-list">{children}</ul>,
  featureItem: (props) => (
    <li>
      <CircleCheck aria-hidden="true" size={12} />
      <Editable {...props} as="span" />
      {props.children}
    </li>
  ),
};
export function RecursiveRenderer({
  node,
  onTextChange,
  disabled = false,
  onPropsChange,
}: RendererProps) {
  const View = views[node.type];
  const children = node.children?.map((child) => (
    <RecursiveRenderer
      key={child.id}
      node={child}
      onTextChange={onTextChange}
      disabled={disabled}
      onPropsChange={onPropsChange}
    />
  ));
  if (!View)
    return (
      <div className="unsupported-node" role="note">
        Unsupported element{children}
      </div>
    );
  return (
    <View
      node={node}
      onTextChange={onTextChange}
      disabled={disabled}
      onPropsChange={onPropsChange}
    >
      {children}
    </View>
  );
}
