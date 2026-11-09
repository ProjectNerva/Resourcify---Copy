import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Guide from "../../src/screens/Guide";

const response = (data) => ({ ok: true, json: async () => data });
const answer = {
  answer: "CalFresh is paid monthly on an EBT card.",
  sources: [
    {
      title: "Food assistance",
      url: "https://211sandiego.org/food-assistance-resources",
    },
  ],
  notice: "Answers come from 211 material and may be out of date.",
  crisis: false,
};

beforeEach(() =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(answer))),
);
afterEach(() => vi.unstubAllGlobals());

describe("guide", () => {
  it("asks a question and shows the answer with its 211 link", async () => {
    render(<Guide capabilities={{ guide: true }} />);
    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "how do i get food stamps" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Ask the guide" }));
    await screen.findByText(answer.answer);
    expect(
      screen.getByRole("link", { name: /211 San Diego: Food assistance/ }),
    ).toHaveAttribute(
      "href",
      "https://211sandiego.org/food-assistance-resources",
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      question: "how do i get food stamps",
    });
    // The input clears so the next question starts fresh.
    expect(screen.getByLabelText("Your question")).toHaveValue("");
  });

  it("marks a crisis answer differently from an ordinary one", async () => {
    fetch.mockResolvedValue(
      response({
        answer: "Call or text 988 to reach the Suicide and Crisis Lifeline.",
        sources: [],
        notice: "This is an automatic safety message, not a person.",
        crisis: true,
      }),
    );
    const { container } = render(<Guide capabilities={{ guide: true }} />);
    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "i want to die" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Ask the guide" }));
    await screen.findByText(/988/);
    expect(container.querySelector(".guide-answer.crisis")).toBeTruthy();
  });

  it("sends a suggested question when one is clicked", async () => {
    render(<Guide capabilities={{ guide: true }} />);
    fireEvent.click(
      screen.getByText("What are some ways to get financial help?"),
    );
    await screen.findByText(answer.answer);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      question: "What are some ways to get financial help?",
    });
  });

  it("reports a failure without losing the thread", async () => {
    fetch.mockRejectedValueOnce(new Error("Service is busy."));
    render(<Guide capabilities={{ guide: true }} />);
    fireEvent.change(screen.getByLabelText("Your question"), {
      target: { value: "anything" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Ask the guide" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Service is busy."),
    );
  });

  it("says so when the guide is not configured", () => {
    render(<Guide capabilities={{ guide: false }} />);
    expect(screen.getByRole("status")).toHaveTextContent("not configured");
  });

  it("will not submit an empty question", () => {
    render(<Guide capabilities={{ guide: true }} />);
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Ask the guide" }));
    expect(fetch).not.toHaveBeenCalled();
  });
});
