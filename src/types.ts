export interface Library {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_photo: string | null;
  is_public: boolean;
  show_borrower_names: boolean;
  show_return_dates: boolean;
  created_at: string;
  updated_at: string;
}

export interface FacetDefinition {
  id: string;
  library_id: string;
  name: string;
  facet_type: "text" | "number" | "boolean";
  options: string[] | null;
  position: number;
  created_at: string;
}

export interface Item {
  id: string;
  library_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  status: "available" | "borrowed" | "unavailable";
  max_borrow_days: number | null;
  visibility: "public" | "circle";
  circle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemFacet {
  id: string;
  item_id: string;
  facet_definition_id: string;
  value: string;
}

export interface Borrower {
  id: string;
  phone: string;
  name: string;
  user_id: string | null;
  created_at: string;
}

export interface BorrowRequest {
  id: string;
  item_id: string;
  borrower_id: string;
  message: string | null;
  status: "pending" | "approved" | "declined" | "cancelled";
  return_by: string | null;
  private_possession: boolean;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  item_id: string;
  borrower_id: string;
  request_id: string | null;
  borrowed_at: string;
  return_by: string | null;
  returned_at: string | null;
  status: "active" | "returned" | "late";
  notes: string | null;
  private_possession: boolean;
  created_at: string;
  updated_at: string;
}

export interface Circle {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  phone: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  loan_id: string;
  reminder_type: string;
  scheduled_for: string;
  sent_at: string | null;
  message: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  unit_system: "metric" | "imperial" | null;
  created_at: string;
  updated_at: string;
}

export interface PhoneAuthCode {
  id: string;
  phone: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}
