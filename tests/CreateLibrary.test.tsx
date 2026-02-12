import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./testHelpers";
import CreateLibrary from "../src/components/CreateLibrary";

const mockCreate = vi.fn();
const mockMe = vi.fn();

vi.mock("../src/lib/ayb", () => ({
  ayb: {
    auth: {
      me: (...args: unknown[]) => mockMe(...args),
    },
    records: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

describe("CreateLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form with name and description fields", () => {
    renderWithProviders(<CreateLibrary onCreated={() => {}} />);

    expect(screen.getByText("New Library")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Power Tools/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/What kind of stuff/)).toBeInTheDocument();
    expect(screen.getByText("Create Library")).toBeInTheDocument();
  });

  it("shows slug preview when name is entered", () => {
    renderWithProviders(<CreateLibrary onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Power Tools/), {
      target: { value: "My Board Games" },
    });

    expect(screen.getByText(/my-board-games/)).toBeInTheDocument();
  });

  it("calls ayb to create library on submit and fires onCreated", async () => {
    const lib = {
      id: "lib-1",
      name: "Power Tools",
      slug: "power-tools-a1b2",
      owner_id: "user-1",
    };
    mockMe.mockResolvedValue({ id: "user-1" });
    mockCreate.mockResolvedValue(lib);
    const onCreated = vi.fn();

    renderWithProviders(<CreateLibrary onCreated={onCreated} />);

    fireEvent.change(screen.getByPlaceholderText(/Power Tools/), {
      target: { value: "Power Tools" },
    });
    fireEvent.submit(screen.getByText("Create Library").closest("form")!);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(lib);
    });

    expect(mockMe).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith(
      "libraries",
      expect.objectContaining({
        name: "Power Tools",
        slug: expect.stringMatching(/^power-tools-[a-z0-9]{4}$/),
        owner_id: "user-1",
        description: null,
        is_public: true,
      }),
    );
  });

  it("shows error on create failure", async () => {
    mockMe.mockResolvedValue({ id: "user-1" });
    mockCreate.mockRejectedValue(new Error("Slug already exists"));

    renderWithProviders(<CreateLibrary onCreated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Power Tools/), {
      target: { value: "Duplicate" },
    });
    fireEvent.submit(screen.getByText("Create Library").closest("form")!);

    expect(await screen.findByText("Slug already exists")).toBeInTheDocument();
  });
});
