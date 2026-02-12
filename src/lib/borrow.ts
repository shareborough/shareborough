/**
 * Public borrow flow — uses direct CRUD instead of RPC so it works
 * without authentication (borrowers don't have accounts).
 *
 * Falls back to RPC if CRUD fails, for servers where auth is not required.
 */

import { ayb } from "./ayb";
import { rpc } from "./rpc";
import type { Item, Borrower, BorrowRequest } from "../types";

interface RequestBorrowParams {
  itemId: string;
  name: string;
  phone: string;
  message: string | null;
  returnBy: string | null;
  privatePossession: boolean;
}

export async function requestBorrow(params: RequestBorrowParams): Promise<BorrowRequest> {
  // Try RPC first (works when function is SECURITY DEFINER — bypasses RLS)
  let rpcError: unknown = null;
  try {
    return await rpc<BorrowRequest>("request_borrow", {
      p_item_id: params.itemId,
      p_borrower_name: params.name,
      p_borrower_phone: params.phone,
      p_message: params.message,
      p_return_by: params.returnBy,
      p_private_possession: params.privatePossession,
    });
  } catch (err) {
    rpcError = err;
    // If the RPC returned a specific domain error (not just "RPC failed"), propagate it
    const msg = err instanceof Error ? err.message : String(err);
    if (msg && !msg.startsWith("RPC ") && !msg.includes("Failed to fetch") && !msg.includes("NetworkError")) {
      throw err;
    }
    // Otherwise fall through to CRUD fallback
  }

  // CRUD fallback: verify item is available first
  try {
    const item = await ayb.records.get<Item>("items", params.itemId);
    if (item.status !== "available") {
      throw new Error("Item is not available for borrowing");
    }

    // Find or create borrower
    let borrower: Borrower;
    try {
      borrower = await ayb.records.create<Borrower>("borrowers", {
        phone: params.phone,
        name: params.name,
      });
    } catch {
      // Phone already exists — look up existing borrower
      const existing = await ayb.records.list<Borrower>("borrowers", {
        filter: `phone='${params.phone}'`,
        perPage: 1,
      });
      if (existing.items.length === 0) {
        throw new Error("Failed to create borrower record");
      }
      borrower = existing.items[0];
      // Update name if different
      if (borrower.name !== params.name) {
        borrower = await ayb.records.update<Borrower>("borrowers", borrower.id, {
          name: params.name,
        });
      }
    }

    // Create borrow request
    const request = await ayb.records.create<BorrowRequest>("borrow_requests", {
      item_id: params.itemId,
      borrower_id: borrower.id,
      message: params.message,
      return_by: params.returnBy,
      private_possession: params.privatePossession,
    });

    return request;
  } catch (crudErr) {
    // Both RPC and CRUD failed — throw the more informative error
    if (rpcError) {
      const rpcMsg = rpcError instanceof Error ? rpcError.message : String(rpcError);
      const crudMsg = crudErr instanceof Error ? crudErr.message : String(crudErr);
      throw new Error(crudMsg || rpcMsg || "Failed to submit borrow request");
    }
    throw crudErr;
  }
}
