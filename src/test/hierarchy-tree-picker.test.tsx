import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HierarchyTreePicker } from "@/components/settings/hierarchy-tree-picker";
import type { HierarchyNode } from "@/lib/api";

const mockNodes: HierarchyNode[] = [
  {
    name: "jtoli5bt23",
    label: "Administrator",
    parent: "",
    is_group: 1,
    user: "admin@example.com",
    email: "admin@example.com",
  },
  {
    name: "jb5com8e9s",
    label: "Usman",
    parent: "jtoli5bt23",
    is_group: 1,
    user: "usman.agro7c@gmail.com",
    email: "usman.agro7c@gmail.com",
  },
  {
    name: "kdta38psjp",
    label: "Test Leader",
    parent: "jb5com8e9s",
    is_group: 1,
    user: "test@example.com",
    email: "test@example.com",
  },
  {
    name: "uv77i7rkvq",
    label: "QA Employee",
    parent: "kdta38psjp",
    is_group: 0,
    user: "qa_employee@example.com",
    email: "qa_employee@example.com",
  },
  {
    name: "no_email_node",
    label: "Vacant Role",
    parent: "jb5com8e9s",
    is_group: 0,
    user: "",
    email: "",
  },
];

describe("HierarchyTreePicker Component", () => {
  it("renders tree nodes with labels and emails", () => {
    const handleChange = vi.fn();
    render(
      <HierarchyTreePicker
        nodes={mockNodes}
        selectedNodes={["jb5com8e9s"]}
        onChange={handleChange}
      />,
    );

    expect(screen.getByText("Administrator")).toBeDefined();
    expect(screen.getByText("admin@example.com")).toBeDefined();
    expect(screen.getByText("Usman")).toBeDefined();
    expect(screen.getByText("usman.agro7c@gmail.com")).toBeDefined();
    expect(screen.getByText("Vacant Role")).toBeDefined();
    expect(screen.getByText("No email")).toBeDefined();
  });

  it("disables selection for nodes without valid emails", () => {
    const handleChange = vi.fn();
    render(<HierarchyTreePicker nodes={mockNodes} selectedNodes={[]} onChange={handleChange} />);

    const vacantCheckbox = screen.getByLabelText("Vacant Role") as HTMLInputElement;
    expect(vacantCheckbox.disabled).toBe(true);
  });

  it("calls onChange when an enabled node checkbox is clicked", () => {
    const handleChange = vi.fn();
    render(
      <HierarchyTreePicker
        nodes={mockNodes}
        selectedNodes={["jb5com8e9s"]}
        onChange={handleChange}
      />,
    );

    const qaCheckbox = screen.getByLabelText("QA Employee");
    fireEvent.click(qaCheckbox);

    expect(handleChange).toHaveBeenCalledWith(["jb5com8e9s", "uv77i7rkvq"]);
  });

  it("selects all valid nodes when 'Select All' is clicked", () => {
    const handleChange = vi.fn();
    render(<HierarchyTreePicker nodes={mockNodes} selectedNodes={[]} onChange={handleChange} />);

    const selectAllBtn = screen.getByRole("button", { name: "Select All" });
    fireEvent.click(selectAllBtn);

    // Only nodes with valid emails should be selected (4 nodes, excluding vacant)
    expect(handleChange).toHaveBeenCalledWith([
      "jtoli5bt23",
      "jb5com8e9s",
      "kdta38psjp",
      "uv77i7rkvq",
    ]);
  });
});
