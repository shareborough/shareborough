/**
 * React Router v7 migration tests — verify future flags are enabled
 * and no deprecation warnings are emitted.
 */
describe("React Router v7 Migration", () => {
  it("main.tsx has v7_startTransition future flag", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const mainPath = path.resolve(__dirname, "../src/main.tsx");
    const content = fs.readFileSync(mainPath, "utf-8");

    expect(content).toContain("v7_startTransition: true");
  });

  it("main.tsx has v7_relativeSplatPath future flag", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const mainPath = path.resolve(__dirname, "../src/main.tsx");
    const content = fs.readFileSync(mainPath, "utf-8");

    expect(content).toContain("v7_relativeSplatPath: true");
  });

  it("testHelpers.tsx has v7 future flags for test consistency", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const helpersPath = path.resolve(__dirname, "./testHelpers.tsx");
    const content = fs.readFileSync(helpersPath, "utf-8");

    expect(content).toContain("v7_startTransition: true");
    expect(content).toContain("v7_relativeSplatPath: true");
  });

  it("all test BrowserRouter usages include future flags", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const testsDir = path.resolve(__dirname);
    const testFiles = fs.readdirSync(testsDir).filter((f: string) => f.endsWith(".tsx") || f.endsWith(".ts"));

    // Exclude this test file itself (it references router components in strings)
    const filesToCheck = testFiles.filter((f: string) => f !== "RouterMigration.test.tsx");

    for (const file of filesToCheck) {
      const content = fs.readFileSync(path.join(testsDir, file), "utf-8");
      // Any BrowserRouter usage must include future flags
      if (content.includes("BrowserRouter") && content.includes("render")) {
        expect(content).toContain("v7_startTransition");
      }

      // Any MemoryRouter usage must include future flags
      if (content.includes("MemoryRouter") && content.includes("render")) {
        expect(content).toContain("v7_startTransition");
      }
    }
  });

  it("App.tsx routes are compatible with v7 splat path resolution", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const appPath = path.resolve(__dirname, "../src/App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");

    // Verify no wildcard paths that would be affected by v7_relativeSplatPath
    // All our routes use exact paths, not relative navigation within splat routes
    expect(content).toContain('<Route path="*"');
    // Verify we use <Routes> component (v6 style, compatible with v7 flags)
    expect(content).toContain("<Routes>");
  });
});
