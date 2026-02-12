import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import AddFacet from "../src/components/AddFacet";

const mockCreate = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

describe("AddFacet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form with name input and type selector", () => {
    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    expect(screen.getByRole("heading", { name: "Add Facet" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Battery Size/)).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Number")).toBeInTheDocument();
    expect(screen.getByText("Yes/No")).toBeInTheDocument();
  });

  it("shows options input only for text facet type", () => {
    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    // Text is default, options input should be visible
    expect(screen.getByPlaceholderText(/Predefined options/)).toBeInTheDocument();
  });

  it("hides options input for number type", () => {
    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByDisplayValue("Text"), {
      target: { value: "number" },
    });

    expect(screen.queryByPlaceholderText(/Predefined options/)).not.toBeInTheDocument();
  });

  it("hides options input for boolean type", () => {
    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByDisplayValue("Text"), {
      target: { value: "boolean" },
    });

    expect(screen.queryByPlaceholderText(/Predefined options/)).not.toBeInTheDocument();
  });

  it("creates text facet with no options when options field is empty", async () => {
    const facet = { id: "fd-1", library_id: "lib-1", name: "Brand", facet_type: "text", options: null };
    mockCreate.mockResolvedValueOnce(facet);
    const onCreated = vi.fn();

    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={onCreated} />);

    fireEvent.change(screen.getByPlaceholderText(/Battery Size/), {
      target: { value: "Brand" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Facet" }).closest("form")!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("facet_definitions", {
        library_id: "lib-1",
        name: "Brand",
        facet_type: "text",
        options: null,
      });
    });
    expect(onCreated).toHaveBeenCalledWith(facet);
  });

  it("parses comma-separated options correctly", async () => {
    mockCreate.mockResolvedValueOnce({ id: "fd-1" });

    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Battery Size/), {
      target: { value: "Condition" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Predefined options/), {
      target: { value: "New, Used, Fair" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Facet" }).closest("form")!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("facet_definitions", {
        library_id: "lib-1",
        name: "Condition",
        facet_type: "text",
        options: ["New", "Used", "Fair"],
      });
    });
  });

  it("filters empty options from comma-separated input", async () => {
    mockCreate.mockResolvedValueOnce({ id: "fd-1" });

    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Battery Size/), {
      target: { value: "Size" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Predefined options/), {
      target: { value: "Small,,, Large, " },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Facet" }).closest("form")!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("facet_definitions", {
        library_id: "lib-1",
        name: "Size",
        facet_type: "text",
        options: ["Small", "Large"],
      });
    });
  });

  it("creates number facet without options", async () => {
    mockCreate.mockResolvedValueOnce({ id: "fd-1" });

    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Battery Size/), {
      target: { value: "Voltage" },
    });
    fireEvent.change(screen.getByDisplayValue("Text"), {
      target: { value: "number" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Facet" }).closest("form")!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("facet_definitions", {
        library_id: "lib-1",
        name: "Voltage",
        facet_type: "number",
        options: null,
      });
    });
  });

  it("creates boolean facet without options", async () => {
    mockCreate.mockResolvedValueOnce({ id: "fd-1" });

    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Battery Size/), {
      target: { value: "Has Case?" },
    });
    fireEvent.change(screen.getByDisplayValue("Text"), {
      target: { value: "boolean" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Facet" }).closest("form")!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("facet_definitions", {
        library_id: "lib-1",
        name: "Has Case?",
        facet_type: "boolean",
        options: null,
      });
    });
  });

  it("shows error message on failure", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Duplicate facet name"));

    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Battery Size/), {
      target: { value: "Brand" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Facet" }).closest("form")!);

    expect(await screen.findByText("Duplicate facet name")).toBeInTheDocument();
  });

  it("shows raw error for non-Error exceptions", async () => {
    mockCreate.mockRejectedValueOnce("unknown");

    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Battery Size/), {
      target: { value: "Brand" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Facet" }).closest("form")!);

    expect(await screen.findByText("unknown")).toBeInTheDocument();
  });

  it("shows loading state during submission", async () => {
    mockCreate.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AddFacet libraryId="lib-1" onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Battery Size/), {
      target: { value: "Brand" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Facet" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("...")).toBeInTheDocument();
    });
  });
});
