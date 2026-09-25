import type { UINode } from "./schema";
export function updateNodeProps(
  node: UINode,
  id: string,
  props: NonNullable<UINode["props"]>,
): UINode {
  if (node.id === id) return { ...node, props: { ...node.props, ...props } };
  if (!node.children) return node;
  const children = node.children.map((child) =>
    updateNodeProps(child, id, props),
  );
  return children.every((child, index) => child === node.children![index])
    ? node
    : { ...node, children };
}
export function countNodes(node: UINode): number {
  return (
    1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) ?? 0)
  );
}

export function updateNodeText(node: UINode, id: string, text: string): UINode {
  return updateNodeProps(node, id, { text });
}
