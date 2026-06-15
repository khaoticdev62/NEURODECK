import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Cpu } from "lucide-react";

describe("MetricCard", () => {
  const defaultProps = {
    label: "CPU Usage",
    value: "42%",
    icon: Cpu,
    hint: "Average over last 5 min",
  };

  it("renders the label", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByText("CPU Usage")).toBeDefined();
  });

  it("renders the value", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByText("42%")).toBeDefined();
  });

  it("renders the hint", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByText("Average over last 5 min")).toBeDefined();
  });

  it("renders numeric value", () => {
    render(<MetricCard {...defaultProps} value={99} />);
    expect(screen.getByText("99")).toBeDefined();
  });
});
