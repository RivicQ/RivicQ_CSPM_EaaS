import type { QuotationStatus } from "@prisma/client";
import { HttpError } from "./api";

export const QUOTATION_STATUSES: QuotationStatus[] = [
  "DRAFT",
  "INTERNAL_REVIEW",
  "APPROVED",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED_TO_INVOICE",
];

const TRANSITIONS: Record<QuotationStatus, readonly QuotationStatus[]> = {
  DRAFT: ["INTERNAL_REVIEW", "EXPIRED"],
  INTERNAL_REVIEW: ["APPROVED", "REJECTED", "EXPIRED"],
  APPROVED: ["SENT", "ACCEPTED", "EXPIRED"],
  SENT: ["VIEWED", "ACCEPTED", "EXPIRED"],
  VIEWED: ["ACCEPTED", "EXPIRED"],
  ACCEPTED: ["CONVERTED_TO_INVOICE"],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED_TO_INVOICE: [],
};

export function assertQuotationTransition(from: QuotationStatus, to: QuotationStatus) {
  if (from === to) return;
  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new HttpError(409, `Invalid quotation transition: ${from} -> ${to}`);
  }
  if ((from === "REJECTED" || from === "EXPIRED") && (to === "APPROVED" || to === "ACCEPTED")) {
    throw new HttpError(409, `Invalid quotation transition: ${from} -> ${to}`);
  }
}

export function quotationUpdateData(input: {
  from: QuotationStatus;
  to: QuotationStatus;
  actorId: string;
  now?: Date;
  existingApprovedAt: Date | null;
  existingApprovedById: string | null;
  existingAcceptedAt: Date | null;
}) {
  assertQuotationTransition(input.from, input.to);
  const now = input.now ?? new Date();
  return {
    status: input.to,
    approvedAt: input.to === "APPROVED" ? now : input.existingApprovedAt,
    approvedById: input.to === "APPROVED" ? input.actorId : input.existingApprovedById,
    acceptedAt: input.to === "ACCEPTED" ? now : input.existingAcceptedAt,
  };
}

export function isQuotationStatus(value: string): value is QuotationStatus {
  return (QUOTATION_STATUSES as string[]).includes(value);
}
