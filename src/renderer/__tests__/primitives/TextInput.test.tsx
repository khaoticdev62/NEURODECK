import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextInput } from "../../components/primitives/TextInput";

describe("TextInput", () => {
  it("renders a text input", () => {
    render(<TextInput />);
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("renders label and associates it with input via htmlFor/id", () => {
    render(<TextInput label="Email address" />);
    const input = screen.getByLabelText("Email address");
    expect(input.tagName).toBe("INPUT");
  });

  it("derives id from label when id is not provided", () => {
    render(<TextInput label="Full name" />);
    const input = screen.getByLabelText("Full name") as HTMLInputElement;
    expect(input.id).toBe("full-name");
  });

  it("uses explicit id over label-derived id", () => {
    render(<TextInput label="Search" id="custom-search" />);
    const input = screen.getByLabelText("Search") as HTMLInputElement;
    expect(input.id).toBe("custom-search");
  });

  it('renders error message with role="alert"', () => {
    render(<TextInput label="Password" error="Password is required" />);
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Password is required")).toBeDefined();
  });

  it("sets aria-invalid=true when error is present", () => {
    render(<TextInput label="Email" error="Invalid email" />);
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("sets aria-invalid=false when no error", () => {
    render(<TextInput label="Name" />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("links input to error via aria-describedby", () => {
    render(<TextInput label="Username" error="Required" />);
    const input = screen.getByLabelText("Username") as HTMLInputElement;
    expect(input.getAttribute("aria-describedby")).toBe("username-error");
    expect(document.getElementById("username-error")?.textContent).toBe("Required");
  });

  it("renders hint text when no error", () => {
    render(<TextInput label="Bio" hint="Max 160 characters" />);
    expect(screen.getByText("Max 160 characters")).toBeDefined();
  });

  it("does not render hint when error is present (error takes priority)", () => {
    render(<TextInput label="Bio" error="Too long" hint="Max 160 characters" />);
    expect(screen.queryByText("Max 160 characters")).toBeNull();
    expect(screen.getByText("Too long")).toBeDefined();
  });

  it("links input to hint via aria-describedby when hint present and no error", () => {
    render(<TextInput label="Note" hint="Some hint" />);
    const input = screen.getByLabelText("Note") as HTMLInputElement;
    expect(input.getAttribute("aria-describedby")).toBe("note-hint");
  });

  it("renders required asterisk when required=true", () => {
    render(<TextInput label="Email" required />);
    // The asterisk span is aria-hidden; we just check it renders in the label
    const label = screen.getByText("Email").closest("label");
    expect(label?.textContent).toContain("*");
  });

  it("accepts typed user input", async () => {
    render(<TextInput label="Name" />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    await userEvent.type(input, "Alice");
    expect(input.value).toBe("Alice");
  });

  it("calls onChange handler", async () => {
    const onChange = vi.fn();
    render(<TextInput label="Search" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Search"), "hi");
    expect(onChange).toHaveBeenCalled();
  });

  it("is disabled when disabled=true", () => {
    render(<TextInput label="Field" disabled />);
    expect((screen.getByLabelText("Field") as HTMLInputElement).disabled).toBe(true);
  });

  it("applies fullWidth class", () => {
    const { container } = render(<TextInput fullWidth />);
    expect(container.querySelector("div")?.className).toContain("w-full");
  });

  it("forwards ref to the input element", () => {
    let ref: HTMLInputElement | null = null;
    render(
      <TextInput
        ref={(el) => {
          ref = el;
        }}
      />
    );
    expect(ref).not.toBeNull();
    expect((ref as HTMLInputElement | null)?.tagName).toBe("INPUT");
  });
});
