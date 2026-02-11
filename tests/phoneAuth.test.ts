import {
  normalizePhone,
  quickPhoneAuth,
  getPhoneSession,
  clearPhoneSession,
  isPhoneAuthed,
  isSessionVerified,
  setStoredName,
  getStoredName,
} from "../src/lib/phoneAuth";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("phoneAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  // --- normalizePhone ---

  describe("normalizePhone", () => {
    it("adds +1 prefix to 10-digit US number", () => {
      expect(normalizePhone("4053069556")).toBe("+14053069556");
    });

    it("adds + prefix to 11-digit number starting with 1", () => {
      expect(normalizePhone("14053069556")).toBe("+14053069556");
    });

    it("strips non-digit characters", () => {
      expect(normalizePhone("(405) 306-9556")).toBe("+14053069556");
    });

    it("preserves existing + prefix", () => {
      expect(normalizePhone("+14053069556")).toBe("+14053069556");
    });

    it("handles international numbers", () => {
      expect(normalizePhone("+447911123456")).toBe("+447911123456");
    });

    it("adds + to raw digits without country code", () => {
      expect(normalizePhone("447911123456")).toBe("+447911123456");
    });
  });

  // --- quickPhoneAuth ---

  describe("quickPhoneAuth", () => {
    it("creates a phone session and stores it", () => {
      const session = quickPhoneAuth("4053069556", "Alice");
      expect(session.phone).toBe("+14053069556");
      expect(session.name).toBe("Alice");
      expect(session.verified).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("sets expiration to 30 days from now", () => {
      const before = Date.now();
      const session = quickPhoneAuth("4053069556", "Bob");
      const expires = new Date(session.expiresAt).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(expires).toBeGreaterThanOrEqual(before + thirtyDaysMs - 1000);
      expect(expires).toBeLessThanOrEqual(before + thirtyDaysMs + 1000);
    });
  });

  // --- getPhoneSession / clearPhoneSession ---

  describe("session management", () => {
    it("returns null when no session exists", () => {
      expect(getPhoneSession()).toBeNull();
    });

    it("returns session after quickPhoneAuth", () => {
      quickPhoneAuth("4053069556", "Alice");
      const session = getPhoneSession();
      expect(session).not.toBeNull();
      expect(session!.phone).toBe("+14053069556");
      expect(session!.name).toBe("Alice");
    });

    it("returns null after clearPhoneSession", () => {
      quickPhoneAuth("4053069556", "Alice");
      clearPhoneSession();
      expect(getPhoneSession()).toBeNull();
    });

    it("returns null for expired session", () => {
      quickPhoneAuth("4053069556", "Alice");
      // Manually set expired session
      const session = JSON.parse(store["shareborough_phone_session"]);
      session.expiresAt = new Date(Date.now() - 1000).toISOString();
      store["shareborough_phone_session"] = JSON.stringify(session);
      expect(getPhoneSession()).toBeNull();
    });
  });

  // --- isPhoneAuthed ---

  describe("isPhoneAuthed", () => {
    it("returns false when no session", () => {
      expect(isPhoneAuthed()).toBe(false);
    });

    it("returns true after auth", () => {
      quickPhoneAuth("4053069556", "Alice");
      expect(isPhoneAuthed()).toBe(true);
    });
  });

  // --- isSessionVerified ---

  describe("isSessionVerified", () => {
    it("returns false when no session exists", () => {
      expect(isSessionVerified()).toBe(false);
    });

    it("returns false for unverified quick auth session", () => {
      quickPhoneAuth("4053069556", "Alice");
      expect(isSessionVerified()).toBe(false);
    });

    it("returns true when session is verified", () => {
      quickPhoneAuth("4053069556", "Alice");
      // Manually set verified flag in stored session
      const raw = store["shareborough_phone_session"];
      const session = JSON.parse(raw);
      session.verified = true;
      store["shareborough_phone_session"] = JSON.stringify(session);
      expect(isSessionVerified()).toBe(true);
    });
  });

  // --- Name storage ---

  describe("name storage", () => {
    it("stores and retrieves name", () => {
      setStoredName("Carol");
      expect(getStoredName()).toBe("Carol");
    });

    it("updates session name when session exists", () => {
      quickPhoneAuth("4053069556", "Alice");
      setStoredName("Updated Alice");
      const session = getPhoneSession();
      expect(session!.name).toBe("Updated Alice");
    });

    it("returns null when no name stored", () => {
      expect(getStoredName()).toBeNull();
    });

    it("stores name to separate key", () => {
      setStoredName("TestName");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "shareborough_phone_name",
        "TestName",
      );
    });
  });

  // --- normalizePhone edge cases ---

  describe("normalizePhone edge cases", () => {
    it("handles empty string", () => {
      const result = normalizePhone("");
      expect(result).toBe("+");
    });

    it("handles string with only non-digits", () => {
      const result = normalizePhone("---");
      expect(result).toBe("+");
    });

    it("handles very short number", () => {
      const result = normalizePhone("123");
      expect(result).toBe("+123");
    });

    it("handles 11-digit non-US number", () => {
      const result = normalizePhone("22345678901");
      expect(result).toBe("+22345678901");
    });
  });

  // --- Session persistence ---

  describe("session persistence", () => {
    it("quickPhoneAuth stores name in separate key", () => {
      quickPhoneAuth("4053069556", "TestUser");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "shareborough_phone_name",
        "TestUser",
      );
    });

    it("clearPhoneSession removes from localStorage", () => {
      quickPhoneAuth("4053069556", "Alice");
      clearPhoneSession();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "shareborough_phone_session",
      );
    });

    it("handles malformed JSON in localStorage", () => {
      store["shareborough_phone_session"] = "not-valid-json{";
      const session = getPhoneSession();
      expect(session).toBeNull();
    });

    it("expired session is cleared from storage on access", () => {
      quickPhoneAuth("4053069556", "Alice");
      const session = JSON.parse(store["shareborough_phone_session"]);
      session.expiresAt = new Date(Date.now() - 1000).toISOString();
      store["shareborough_phone_session"] = JSON.stringify(session);

      getPhoneSession();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "shareborough_phone_session",
      );
    });
  });
});
