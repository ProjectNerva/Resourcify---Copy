import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import {
  ProcessingNoticeProvider,
  useProcessingNotice,
} from "../../src/components/ProcessingNotice";

// A tiny consumer: pressing Go asks for the "photo" notice and reports what
// the dialog answered.
function Consumer({ onResult }) {
  const confirm = useProcessingNotice("photo");
  return <button onClick={async () => onResult(await confirm())}>Go</button>;
}

function mount() {
  const onResult = vi.fn();
  render(
    <ProcessingNoticeProvider>
      <Consumer onResult={onResult} />
    </ProcessingNoticeProvider>,
  );
  return onResult;
}

describe("processing notice", () => {
  it("shows the notice for the kind requested and cancels cleanly", async () => {
    const onResult = mount();
    fireEvent.click(screen.getByText("Go"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Send this photo to Google?");
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("accepts once and asks again next time", async () => {
    const onResult = mount();
    fireEvent.click(screen.getByText("Go"));
    fireEvent.click(await screen.findByText("Accept"));
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(true));
    fireEvent.click(screen.getByText("Go"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("remembers 'don't ask again' for the session only", async () => {
    const onResult = mount();
    fireEvent.click(screen.getByText("Go"));
    fireEvent.click(await screen.findByText("Accept and don't ask again"));
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(true));
    fireEvent.click(screen.getByText("Go"));
    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).toBeNull();
    // Nothing was written anywhere durable.
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("is a real modal: focus starts on Accept, Tab stays inside, Escape cancels", async () => {
    const onResult = mount();
    fireEvent.click(screen.getByText("Go"));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent("Accept"),
    );
    const link = within(dialog).getByRole("link");
    const buttons = within(dialog).getAllByRole("button");
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(link);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("treats the notice as accepted when no provider is mounted", async () => {
    const onResult = vi.fn();
    render(<Consumer onResult={onResult} />);
    fireEvent.click(screen.getByText("Go"));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
