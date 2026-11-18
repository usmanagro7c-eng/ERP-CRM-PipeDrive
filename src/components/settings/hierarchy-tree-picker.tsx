import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Mail,
  User,
  AlertCircle,
  Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { HierarchyNode } from "@/lib/api";

export interface HierarchyTreePickerProps {
  nodes: HierarchyNode[];
  selectedNodes: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

interface TreeNode extends HierarchyNode {
  children: TreeNode[];
  depth: number;
}

function buildTree(nodes: HierarchyNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  for (const n of nodes) {
    nodeMap.set(n.name, { ...n, children: [], depth: 0 });
  }

  const roots: TreeNode[] = [];
  for (const n of nodes) {
    const current = nodeMap.get(n.name);
    if (!current) continue;

    if (n.parent && nodeMap.has(n.parent)) {
      const parentNode = nodeMap.get(n.parent)!;
      parentNode.children.push(current);
    } else {
      roots.push(current);
    }
  }

  function setDepth(node: TreeNode, depth: number) {
    node.depth = depth;
    for (const child of node.children) {
      setDepth(child, depth + 1);
    }
  }

  for (const root of roots) {
    setDepth(root, 0);
  }

  return roots;
}

function flattenVisibleNodes(
  tree: TreeNode[],
  expanded: Set<string>,
  searchTerm: string,
): TreeNode[] {
  const flat: TreeNode[] = [];

  function walk(node: TreeNode, matchesParent: boolean) {
    const term = searchTerm.toLowerCase().trim();
    const matchesSelf =
      !term ||
      node.label.toLowerCase().includes(term) ||
      node.name.toLowerCase().includes(term) ||
      (node.email && node.email.toLowerCase().includes(term)) ||
      (node.user && node.user.toLowerCase().includes(term));

    // Check if any descendant matches
    const descendantMatches = (n: TreeNode): boolean => {
      if (
        n.label.toLowerCase().includes(term) ||
        n.name.toLowerCase().includes(term) ||
        (n.email && n.email.toLowerCase().includes(term)) ||
        (n.user && n.user.toLowerCase().includes(term))
      ) {
        return true;
      }
      return n.children.some(descendantMatches);
    };

    const hasMatchingDescendant = term ? node.children.some(descendantMatches) : false;

    if (!term || matchesSelf || matchesParent || hasMatchingDescendant) {
      flat.push(node);
      const isExpanded = term ? true : expanded.has(node.name);
      if (isExpanded) {
        for (const child of node.children) {
          walk(child, matchesSelf || matchesParent);
        }
      }
    }
  }

  for (const root of tree) {
    walk(root, false);
  }

  return flat;
}

export function HierarchyTreePicker({
  nodes,
  selectedNodes,
  onChange,
  disabled = false,
}: HierarchyTreePickerProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const tree = React.useMemo(() => buildTree(nodes), [nodes]);

  // Default expand all nodes initially
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    return new Set(nodes.map((n) => n.name));
  });

  const visibleNodes = React.useMemo(() => {
    return flattenVisibleNodes(tree, expanded, searchTerm);
  }, [tree, expanded, searchTerm]);

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(nodes.map((n) => n.name)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const handleToggleNode = (node: HierarchyNode) => {
    if (disabled || !node.email) return;
    const isSelected = selectedNodes.includes(node.name);
    if (isSelected) {
      onChange(selectedNodes.filter((id) => id !== node.name));
    } else {
      onChange([...selectedNodes, node.name]);
    }
  };

  const handleSelectAllValid = () => {
    if (disabled) return;
    const validIds = nodes.filter((n) => n.email && n.email.includes("@")).map((n) => n.name);
    onChange(Array.from(new Set([...selectedNodes, ...validIds])));
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hierarchy nodes or emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={expandAll}
            disabled={disabled}
            className="h-8 px-2 text-xs"
          >
            Expand All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            disabled={disabled}
            className="h-8 px-2 text-xs"
          >
            Collapse All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAllValid}
            disabled={disabled}
            className="h-8 px-2.5 text-xs"
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDeselectAll}
            disabled={disabled || selectedNodes.length === 0}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-md border bg-background/50 p-2 divide-y divide-border/40">
        {visibleNodes.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No hierarchy nodes found.
          </div>
        ) : (
          visibleNodes.map((node) => {
            const isSelected = selectedNodes.includes(node.name);
            const hasChildren = node.children.length > 0;
            const isNodeExpanded = searchTerm ? true : expanded.has(node.name);
            const hasEmail = Boolean(node.email && node.email.includes("@"));

            return (
              <div
                key={node.name}
                className="flex items-center justify-between py-1.5 pr-2 hover:bg-muted/40 rounded transition-colors group"
                style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(node.name)}
                      className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                      disabled={disabled}
                      aria-label={isNodeExpanded ? "Collapse" : "Expand"}
                    >
                      {isNodeExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <span className="w-5" />
                  )}

                  <Checkbox
                    id={`node-${node.name}`}
                    checked={isSelected}
                    onCheckedChange={() => handleToggleNode(node)}
                    disabled={disabled || !hasEmail}
                    className="h-4 w-4"
                  />

                  <label
                    htmlFor={`node-${node.name}`}
                    className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none truncate ${
                      !hasEmail ? "text-muted-foreground/60 cursor-not-allowed" : "text-foreground"
                    }`}
                  >
                    {node.is_group ? (
                      isNodeExpanded ? (
                        <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )
                    ) : (
                      <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    )}
                    <span className="truncate">{node.label}</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pl-2 shrink-0">
                  {hasEmail ? (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="font-mono">{node.email}</span>
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 flex items-center gap-1 py-0 px-1.5"
                    >
                      <AlertCircle className="h-2.5 w-2.5" />
                      No email
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1">
        <span>
          Selected: <strong className="text-foreground">{selectedNodes.length}</strong> node
          {selectedNodes.length === 1 ? "" : "s"}
        </span>
        <span>
          Total in hierarchy: <strong>{nodes.length}</strong>
        </span>
      </div>
    </div>
  );
}
