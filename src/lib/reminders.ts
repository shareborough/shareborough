/**
 * Reminder scheduling utilities.
 * When a loan is approved, we create reminder records in the database
 * that a cron worker picks up and sends via SMS.
 */

import { ayb } from "./ayb";

interface ScheduleParams {
  loanId: string;
  itemName: string;
  ownerName: string;
  borrowerName: string;
  returnBy: string | null;
}

export async function scheduleReminders({
  loanId,
  itemName,
  ownerName,
  borrowerName,
  returnBy,
}: ScheduleParams) {
  const reminders: Array<{
    loan_id: string;
    reminder_type: string;
    scheduled_for: string;
    message: string;
  }> = [];

  // Confirmation — send immediately
  reminders.push({
    loan_id: loanId,
    reminder_type: "confirmation",
    scheduled_for: new Date().toISOString(),
    message: `Hi ${borrowerName}! You're borrowing "${itemName}" from ${ownerName}.${
      returnBy
        ? ` Please return by ${new Date(returnBy).toLocaleDateString()}.`
        : ""
    } Thanks for using Shareborough!`,
  });

  if (returnBy) {
    const due = new Date(returnBy);

    // 2 days before
    const twoBefore = new Date(due);
    twoBefore.setDate(twoBefore.getDate() - 2);
    if (twoBefore > new Date()) {
      reminders.push({
        loan_id: loanId,
        reminder_type: "upcoming",
        scheduled_for: twoBefore.toISOString(),
        message: `Friendly reminder: "${itemName}" is due back to ${ownerName} in 2 days!`,
      });
    }

    // Due today
    reminders.push({
      loan_id: loanId,
      reminder_type: "due_today",
      scheduled_for: due.toISOString(),
      message: `Today's the day! Time to return "${itemName}" to ${ownerName}. Thanks!`,
    });

    // 1 day overdue
    const oneAfter = new Date(due);
    oneAfter.setDate(oneAfter.getDate() + 1);
    reminders.push({
      loan_id: loanId,
      reminder_type: "overdue_1d",
      scheduled_for: oneAfter.toISOString(),
      message: `"${itemName}" was due yesterday — please return to ${ownerName} when you can!`,
    });

    // 3 days overdue
    const threeAfter = new Date(due);
    threeAfter.setDate(threeAfter.getDate() + 3);
    reminders.push({
      loan_id: loanId,
      reminder_type: "overdue_3d",
      scheduled_for: threeAfter.toISOString(),
      message: `"${itemName}" is 3 days overdue. ${ownerName} would appreciate it back!`,
    });

    // 7 days overdue
    const sevenAfter = new Date(due);
    sevenAfter.setDate(sevenAfter.getDate() + 7);
    reminders.push({
      loan_id: loanId,
      reminder_type: "overdue_7d",
      scheduled_for: sevenAfter.toISOString(),
      message: `Hey, "${itemName}" is a week overdue now. Please return to ${ownerName}.`,
    });
  }

  // Create all reminders via batch
  for (const reminder of reminders) {
    await ayb.records.create("reminders", reminder);
  }

  return reminders.length;
}
