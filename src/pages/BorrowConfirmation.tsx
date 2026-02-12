import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ayb } from "../lib/ayb";
import { friendlyError } from "../lib/errorMessages";
import { useToast } from "../hooks/useToast";
import type { BorrowRequest, Item } from "../types";
import Skeleton from "../components/Skeleton";
import Footer from "../components/Footer";

export default function BorrowConfirmation() {
  const { requestId } = useParams<{ requestId: string }>();
  const [request, setRequest] = useState<BorrowRequest | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!requestId) return;
    ayb.records
      .get<BorrowRequest>("borrow_requests", requestId)
      .then(async (req) => {
        setRequest(req);
        const it = await ayb.records.get<Item>("items", req.item_id);
        setItem(it);
      })
      .catch((err) => {
        const { message } = friendlyError(err);
        toast.showError("Couldn't load request", message);
      })
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-warm-50 dark:bg-gray-900" aria-label="Loading request">
        <div className="card p-8 max-w-md w-full flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12" round />
          <Skeleton className="h-7 w-48" />
          <Skeleton.Text lines={2} className="w-full" />
          <Skeleton className="h-10 w-40 rounded-lg mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-warm-50 dark:bg-gray-900">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">
          {request?.status === "approved"
            ? "\ud83c\udf89"
            : request?.status === "declined"
              ? "\ud83d\ude14"
              : "\ud83d\udcec"}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {request?.status === "approved"
            ? "Request Approved!"
            : request?.status === "declined"
              ? "Request Declined"
              : "Request Sent!"}
        </h1>
        {request?.status === "pending" && (
          <>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Your request to borrow{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100">{item?.name ?? "this item"}</span>{" "}
              has been sent to the owner.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              You'll get a text message when they respond. No need to create an
              account or do anything else!
            </p>
          </>
        )}
        {request?.status === "approved" && (
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You've been approved to borrow{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">{item?.name ?? "this item"}</span>.
            Check your texts for details.
          </p>
        )}
        {request?.status === "declined" && (
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            The owner has declined your request for{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">{item?.name ?? "this item"}</span>.
            Maybe try another item?
          </p>
        )}
        <Link to="/" className="btn-secondary">
          Back to Shareborough
        </Link>
      </div>
      <Footer />
    </div>
  );
}
