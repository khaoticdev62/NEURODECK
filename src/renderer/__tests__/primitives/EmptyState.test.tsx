import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "../../components/primitives/EmptyState";
import { FolderOpen } from "lucide-react";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={FolderOpen}
        title="No files found"
        description="Upload files to get started."
      />
    );
    expect(screen.getByText("No files found")).toBeDefined();
    expect(screen.getByText("Upload files to get started.")).toBeDefined();
  });

  it("renders action slot when provided", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <EmptyState
        icon={FolderOpen}
        title="Empty"
        description="Nothing here."
        action={
          <button
            onClick={() => {
              clicked = true;
            }}
          >
            Add item
          </button>
        }
      />
    );
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(clicked).toBe(true);
  });

  it("does not render action slot when omitted", () => {
    render(<EmptyState icon={FolderOpen} title="Empty" description="Nothing here." />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("title is an h3 for correct heading hierarchy", () => {
    render(<EmptyState icon={FolderOpen} title="Empty" description="Nothing here." />);
    expect(screen.getByRole("heading", { level: 3, name: "Empty" })).toBeDefined();
  });
});
