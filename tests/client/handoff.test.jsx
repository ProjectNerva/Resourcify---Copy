import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import EligibilityForm from "../../src/screens/EligibilityForm";

// Research on how people experiencing homelessness reach services: a list of
// links is where many drop out; a concrete next step with words to say is
// what carries someone through the call.
describe("benefits finder hand-off", () => {
  it("ends with a call-211 step that names the topic and the programs", () => {
    render(<EligibilityForm />);
    fireEvent.click(screen.getByLabelText("Food"));
    fireEvent.click(screen.getByText("Find programs"));
    const step = screen.getByLabelText("Next step");
    expect(within(step).getByRole("heading")).toHaveTextContent("call 211");
    expect(step).toHaveTextContent("dial 711");
    expect(step).toHaveTextContent(/help with food/i);
    expect(step).toHaveTextContent(/SNAP/);
  });

  it("points local help at 211 San Diego, not the national directory", () => {
    render(<EligibilityForm />);
    expect(screen.getByRole("link", { name: "211 San Diego" })).toHaveAttribute(
      "href",
      "https://211sandiego.org/",
    );
  });

  it("shows no hand-off when nothing matched", () => {
    render(<EligibilityForm />);
    fireEvent.click(screen.getByText("Find programs"));
    expect(screen.queryByLabelText("Next step")).toBeNull();
  });
});
