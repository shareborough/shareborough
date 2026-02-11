/**
 * PWA Manifest tests — verify index.html has all required meta tags
 * and manifest.json is properly configured for "Add to Home Screen".
 */
describe("PWA Manifest", () => {

  it("manifest.json contains required PWA fields", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    expect(manifest.name).toBe("Shareborough — Lend stuff to your friends");
    expect(manifest.short_name).toBe("Shareborough");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBeDefined();
    expect(manifest.theme_color).toBeDefined();
  });

  it("manifest.json has 192x192 and 512x512 icons", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("manifest.json has maskable icons for Android adaptive icons", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    const maskable = manifest.icons.filter(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    );
    expect(maskable.length).toBeGreaterThanOrEqual(1);
  });

  it("manifest.json icons are all PNG format", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    for (const icon of manifest.icons) {
      expect(icon.type).toBe("image/png");
      expect(icon.src).toMatch(/\.png$/);
    }
  });

  it("icon files exist on disk", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const iconsDir = path.resolve(__dirname, "../public/icons");

    expect(fs.existsSync(path.join(iconsDir, "icon-192.png"))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, "icon-512.png"))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, "icon-maskable-192.png"))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, "icon-maskable-512.png"))).toBe(true);
  });

  it("index.html has theme-color meta tag", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const htmlPath = path.resolve(__dirname, "../index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('name="theme-color"');
    expect(html).toContain('content="#4a7c59"');
  });

  it("index.html has manifest link tag", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const htmlPath = path.resolve(__dirname, "../index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('rel="manifest"');
    expect(html).toContain('href="/manifest.json"');
  });

  it("index.html has apple-touch-icon for iOS home screen", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const htmlPath = path.resolve(__dirname, "../index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('rel="apple-touch-icon"');
  });

  it("index.html has apple-mobile-web-app-capable meta tag", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const htmlPath = path.resolve(__dirname, "../index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('name="apple-mobile-web-app-capable"');
    expect(html).toContain('content="yes"');
  });

  it("index.html has apple-mobile-web-app-title meta tag", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const htmlPath = path.resolve(__dirname, "../index.html");
    const html = fs.readFileSync(htmlPath, "utf-8");

    expect(html).toContain('name="apple-mobile-web-app-title"');
    expect(html).toContain('content="Shareborough"');
  });

  it("manifest theme_color matches sage brand color", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // Sage green brand color
    expect(manifest.theme_color).toBe("#4a7c59");
  });

  it("manifest background_color is warm-50 for splash screen", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // Warm-50 background matches app background
    expect(manifest.background_color).toBe("#faf9f7");
  });

  it("manifest has portrait-primary orientation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    expect(manifest.orientation).toBe("portrait-primary");
  });

  it("manifest scope is root", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    expect(manifest.scope).toBe("/");
  });
});
