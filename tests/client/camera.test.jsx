import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UploadForm from "../../src/components/UploadForm";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

// One control for camera and library. A `capture` attribute would force the
// camera and hide the photo library, so it must not be there: phones offer
// both from a plain image input.
describe("one photo control", () => {
  it("has a single image input that offers camera and library", () => {
    const { container } = render(
      <UploadForm enabled onAnalysisComplete={() => {}} />,
    );
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(1);
    const input = screen.getByLabelText("Add a photo");
    expect(input).not.toHaveAttribute("capture");
    expect(input.getAttribute("accept")).toContain("image/jpeg");
    expect(screen.queryByText("Take a photo")).toBeNull();
    expect(screen.getByText(/Take one with your camera/)).toBeInTheDocument();
  });

  it("previews the chosen photo inside the control and lets it be changed", () => {
    render(<UploadForm enabled onAnalysisComplete={() => {}} />);
    fireEvent.change(screen.getByLabelText("Add a photo"), {
      target: { files: [new File(["x"], "snap.jpg", { type: "image/jpeg" })] },
    });
    expect(
      screen.getByAltText("Selected items for analysis"),
    ).toBeInTheDocument();
    expect(screen.getByText("Change photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze photo" })).toBeEnabled();
  });
});
