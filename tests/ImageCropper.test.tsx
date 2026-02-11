import { render, screen, fireEvent } from "@testing-library/react";
import ImageCropper from "../src/components/ImageCropper";

// Mock Image constructor to simulate image loading
class MockImage {
  onload: (() => void) | null = null;
  src = "";
  width = 800;
  height = 600;
  constructor() {
    setTimeout(() => this.onload?.(), 0);
  }
}

vi.stubGlobal("Image", MockImage);

describe("ImageCropper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders instruction text", () => {
    render(
      <ImageCropper
        src="data:image/png;base64,test"
        onCrop={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Drag to pan, pinch or scroll to zoom")).toBeInTheDocument();
  });

  it("renders Crop & Use and Cancel buttons", () => {
    render(
      <ImageCropper
        src="data:image/png;base64,test"
        onCrop={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Crop & Use")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onCancel when Cancel clicked", () => {
    const onCancel = vi.fn();
    render(
      <ImageCropper
        src="data:image/png;base64,test"
        onCrop={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("has both primary and secondary button variants", () => {
    render(
      <ImageCropper
        src="data:image/png;base64,test"
        onCrop={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const cropBtn = screen.getByText("Crop & Use");
    const cancelBtn = screen.getByText("Cancel");
    expect(cropBtn.className).toContain("btn-primary");
    expect(cancelBtn.className).toContain("btn-secondary");
  });

  it("renders a canvas element", () => {
    const { container } = render(
      <ImageCropper
        src="data:image/png;base64,test"
        onCrop={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("renders crop border overlay", () => {
    const { container } = render(
      <ImageCropper
        src="data:image/png;base64,test"
        onCrop={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // The overlay div with border classes and pointer-events-none
    const overlay = container.querySelector(".pointer-events-none");
    expect(overlay).toBeInTheDocument();
  });

  it("sets cursor-move on crop area for pan affordance", () => {
    const { container } = render(
      <ImageCropper
        src="data:image/png;base64,test"
        onCrop={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const cropArea = container.querySelector(".cursor-move");
    expect(cropArea).toBeInTheDocument();
  });

  it("sets select-none for controlled interaction handling", () => {
    const { container } = render(
      <ImageCropper
        src="data:image/png;base64,test"
        onCrop={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const cropArea = container.querySelector(".select-none");
    expect(cropArea).toBeInTheDocument();
  });
});
