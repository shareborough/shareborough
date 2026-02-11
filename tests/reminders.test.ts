// Mock the AYB client before importing
vi.mock("../src/lib/ayb", () => ({
  ayb: {
    records: {
      create: vi.fn().mockResolvedValue({ id: "reminder-1" }),
    },
  },
}));

import { scheduleReminders } from "../src/lib/reminders";
import { ayb } from "../src/lib/ayb";

describe("scheduleReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates confirmation reminder immediately", async () => {
    const count = await scheduleReminders({
      loanId: "loan-1",
      itemName: "Drill",
      ownerName: "Stuart",
      borrowerName: "Alice",
      returnBy: null,
    });

    expect(count).toBe(1);
    expect(ayb.records.create).toHaveBeenCalledTimes(1);
    expect(ayb.records.create).toHaveBeenCalledWith(
      "reminders",
      expect.objectContaining({
        loan_id: "loan-1",
        reminder_type: "confirmation",
        message: expect.stringContaining("Alice"),
      }),
    );
  });

  it("schedules full reminder set when return_by is provided", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    const count = await scheduleReminders({
      loanId: "loan-2",
      itemName: "Circular Saw",
      ownerName: "Stuart",
      borrowerName: "Bob",
      returnBy: futureDate.toISOString(),
    });

    // confirmation + upcoming + due_today + overdue_1d + overdue_3d + overdue_7d = 6
    expect(count).toBe(6);
    expect(ayb.records.create).toHaveBeenCalledTimes(6);
  });

  it("includes item name in all messages", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    await scheduleReminders({
      loanId: "loan-3",
      itemName: "Table Saw",
      ownerName: "Stuart",
      borrowerName: "Carol",
      returnBy: futureDate.toISOString(),
    });

    const calls = vi.mocked(ayb.records.create).mock.calls;
    for (const call of calls) {
      const reminder = call[1] as { message: string };
      expect(reminder.message).toContain("Table Saw");
    }
  });

  it("skips upcoming reminder if less than 2 days away", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await scheduleReminders({
      loanId: "loan-4",
      itemName: "Hammer",
      ownerName: "Stuart",
      borrowerName: "Dave",
      returnBy: tomorrow.toISOString(),
    });

    // Should skip upcoming (would be in past), but include: confirmation + due_today + overdue_1d + overdue_3d + overdue_7d = 5
    expect(count).toBe(5);
  });
});
