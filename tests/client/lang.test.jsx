import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../../src/App";
import { pickLang, strings } from "../../src/utils/lang";
import {
  ProcessingNoticeProvider,
  useProcessingNotice,
} from "../../src/components/ProcessingNotice";
import OfflineIndicator from "../../src/components/OfflineIndicator";
import InstallPrompt from "../../src/components/InstallPrompt";

beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  ),
);
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
  document.documentElement.lang = "en";
});

describe("language", () => {
  it("picks Spanish from ?lang=es or a Spanish browser, English otherwise", () => {
    expect(pickLang("?lang=es", "en-US")).toBe("es");
    expect(pickLang("", "es-MX")).toBe("es");
    expect(pickLang("", "en-US")).toBe("en");
    // Only English and Spanish exist; anything else falls back to English.
    expect(pickLang("?lang=fr", "fr-FR")).toBe("en");
  });

  it("has every English string in Spanish", () => {
    const flatten = (o, prefix = "") =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" && !Array.isArray(v)
          ? flatten(v, `${prefix}${k}.`)
          : [`${prefix}${k}`],
      );
    expect(flatten(strings("es")).sort()).toEqual(
      flatten(strings("en")).sort(),
    );
  });

  it("opens in Spanish from the URL and marks the document language", () => {
    window.history.replaceState({}, "", "/?lang=es");
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Pide ayuda" }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es");
  });

  it("switches language from Settings and tells Spanish speakers which screens are still English", () => {
    render(<App />);
    expect(screen.queryByText(/Esta pantalla está en inglés/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Idioma/), {
      target: { value: "es" },
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Haz un plan con lo que tienes.",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Suministros" })[0]);
    expect(
      screen.getAllByText(/Esta pantalla está en inglés/).length,
    ).toBeGreaterThan(0);
    // The guide is fully translated, so it carries no such note.
    fireEvent.change(screen.getByLabelText(/Idioma/), {
      target: { value: "en" },
    });
    expect(screen.queryByText(/Esta pantalla está en inglés/)).toBeNull();
    expect(document.documentElement.lang).toBe("en");
  });

  it("shows the processing notice in Spanish", async () => {
    function Consumer() {
      const confirm = useProcessingNotice("photo");
      return <button onClick={() => confirm()}>Go</button>;
    }
    render(
      <ProcessingNoticeProvider lang="es">
        <Consumer />
      </ProcessingNoticeProvider>,
    );
    fireEvent.click(screen.getByText("Go"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("¿Enviar esta foto a Google?");
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(
      screen.getByText("Aceptar y no volver a preguntar"),
    ).toBeInTheDocument();
    expect(dialog).toHaveAttribute("lang", "es");
  });

  it("puts the 211 line above the tools in both languages", () => {
    render(<App />);
    expect(screen.getByTestId("help-now")).toHaveTextContent("Call 211");
    fireEvent.change(screen.getByLabelText(/Idioma/), {
      target: { value: "es" },
    });
    expect(screen.getByTestId("help-now")).toHaveTextContent("Llama al 211");
  });

  it("shows the offline and install banners in Spanish too", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<OfflineIndicator lang="es" />);
    expect(screen.getByRole("status")).toHaveTextContent("Estás sin conexión");
    render(<InstallPrompt lang="es" />);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = vi.fn().mockResolvedValue();
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    fireEvent(window, event);
    expect(await screen.findByText("Instalar la app")).toBeInTheDocument();
    expect(screen.getByText("Cerrar")).toBeInTheDocument();
  });
});
