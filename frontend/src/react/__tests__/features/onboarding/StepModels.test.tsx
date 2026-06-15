import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepModels } from "../../../components/onboarding/steps/StepModels";

const DEFAULT_PROPS = {
  providerType: "ollama" as const,
  endpointUrl: "http://127.0.0.1:11434",
  modelId: "llama3",
  apiKey: "",
  showApiKey: false,
  testingConnection: false,
  testResult: null,
  onProviderChange: vi.fn(),
  onEndpointChange: vi.fn(),
  onModelIdChange: vi.fn(),
  onApiKeyChange: vi.fn(),
  onToggleShowApiKey: vi.fn(),
  onTestConnection: vi.fn(),
};

describe("StepModels", () => {
  it("renders heading", () => {
    render(<StepModels {...DEFAULT_PROPS} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
  });

  it("shows endpoint and model fields for ollama provider", () => {
    render(<StepModels {...DEFAULT_PROPS} providerType="ollama" />);
    expect(screen.getByDisplayValue("http://127.0.0.1:11434")).toBeDefined();
    expect(screen.getByDisplayValue("llama3")).toBeDefined();
  });

  it("hides API key field for ollama", () => {
    render(<StepModels {...DEFAULT_PROPS} providerType="ollama" />);
    expect(screen.queryByLabelText(/api token/i)).toBeNull();
  });

  it("shows API key field for openai_compat provider", () => {
    render(<StepModels {...DEFAULT_PROPS} providerType="openai_compat" />);
    expect(screen.getByLabelText(/api token/i)).toBeDefined();
  });

  it("API key input type is password by default", () => {
    render(
      <StepModels
        {...DEFAULT_PROPS}
        providerType="openai_compat"
        apiKey="sk-test"
        showApiKey={false}
      />
    );
    const input = screen.getByLabelText(/api token/i) as HTMLInputElement;
    expect(input.type).toBe("password");
  });

  it("API key input type is text when showApiKey=true", () => {
    render(
      <StepModels
        {...DEFAULT_PROPS}
        providerType="openai_compat"
        apiKey="sk-test"
        showApiKey={true}
      />
    );
    const input = screen.getByLabelText(/api token/i) as HTMLInputElement;
    expect(input.type).toBe("text");
  });

  it("calls onToggleShowApiKey when visibility button is clicked", async () => {
    const onToggleShowApiKey = vi.fn();
    render(
      <StepModels
        {...DEFAULT_PROPS}
        providerType="openai_compat"
        onToggleShowApiKey={onToggleShowApiKey}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /show api key/i }));
    expect(onToggleShowApiKey).toHaveBeenCalledOnce();
  });

  it("hides endpoint and model fields for skip provider", () => {
    render(<StepModels {...DEFAULT_PROPS} providerType="skip" />);
    expect(screen.queryByLabelText(/endpoint url/i)).toBeNull();
    expect(screen.queryByLabelText(/model identifier/i)).toBeNull();
  });

  it("shows offline warning text for skip provider", () => {
    render(<StepModels {...DEFAULT_PROPS} providerType="skip" />);
    expect(screen.getByText(/selecting offline planning skips/i)).toBeDefined();
  });

  it("calls onTestConnection when test button is clicked", async () => {
    const onTestConnection = vi.fn();
    render(<StepModels {...DEFAULT_PROPS} onTestConnection={onTestConnection} />);
    await userEvent.click(screen.getByRole("button", { name: /test connection/i }));
    expect(onTestConnection).toHaveBeenCalledOnce();
  });

  it("shows Testing... when testingConnection=true", () => {
    render(<StepModels {...DEFAULT_PROPS} testingConnection={true} />);
    expect(screen.getByText("Testing...")).toBeDefined();
  });

  it("disables test button while testing", () => {
    render(<StepModels {...DEFAULT_PROPS} testingConnection={true} />);
    const btn = screen.getByRole("button", { name: /testing/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders success test result", () => {
    render(
      <StepModels
        {...DEFAULT_PROPS}
        testResult={{ success: true, message: "Connected to Ollama. Found models: llama3" }}
      />
    );
    expect(screen.getByText(/connected to ollama/i)).toBeDefined();
  });

  it("renders failure test result", () => {
    render(
      <StepModels
        {...DEFAULT_PROPS}
        testResult={{ success: false, message: "Connection timed out" }}
      />
    );
    expect(screen.getByText(/connection timed out/i)).toBeDefined();
  });

  it("calls onProviderChange when provider select changes", async () => {
    const onProviderChange = vi.fn();
    render(<StepModels {...DEFAULT_PROPS} onProviderChange={onProviderChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "skip");
    expect(onProviderChange).toHaveBeenCalledWith("skip");
  });
});
