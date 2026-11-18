import { describe, expect, it } from "vitest";
import { quotationUpdateData } from "../lib/quotation-workflow";

describe("quotation state machine", () => {
  it("rejects invalid transitions", () => {
    expect(() =>
      quotationUpdateData({
        from: "DRAFT",
        to: "APPROVED",
        actorId: "staff_1",
        existingApprovedAt: null,
        existingApprovedById: null,
        existingAcceptedAt: null,
      }),
    ).toThrow(/Invalid quotation transition/);

    expect(() =>
      quotationUpdateData({
        from: "SENT",
        to: "INTERNAL_REVIEW",
        actorId: "staff_1",
        existingApprovedAt: new Date(),
        existingApprovedById: "staff_prev",
        existingAcceptedAt: null,
      }),
    ).toThrow(/Invalid quotation transition/);
  });

  it("prevents REJECTED or EXPIRED from moving directly to APPROVED or ACCEPTED", () => {
    for (const from of ["REJECTED", "EXPIRED"] as const) {
      for (const to of ["APPROVED", "ACCEPTED"] as const) {
        expect(() =>
          quotationUpdateData({
            from,
            to,
            actorId: "staff_1",
            existingApprovedAt: null,
            existingApprovedById: null,
            existingAcceptedAt: null,
          }),
        ).toThrow(/Invalid quotation transition/);
      }
    }
  });

  it("sets approved metadata consistently and preserves approval history", () => {
    const approved = quotationUpdateData({
      from: "INTERNAL_REVIEW",
      to: "APPROVED",
      actorId: "approver_1",
      now: new Date("2026-11-18T12:00:00.000Z"),
      existingApprovedAt: null,
      existingApprovedById: null,
      existingAcceptedAt: null,
    });
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedById).toBe("approver_1");
    expect(approved.approvedAt?.toISOString()).toBe("2026-11-18T12:00:00.000Z");

    const sent = quotationUpdateData({
      from: "APPROVED",
      to: "SENT",
      actorId: "sender_1",
      existingApprovedAt: approved.approvedAt,
      existingApprovedById: approved.approvedById,
      existingAcceptedAt: null,
    });
    expect(sent.status).toBe("SENT");
    expect(sent.approvedAt).toEqual(approved.approvedAt);
    expect(sent.approvedById).toBe("approver_1");

    const accepted = quotationUpdateData({
      from: "SENT",
      to: "ACCEPTED",
      actorId: "customer_agent",
      now: new Date("2026-11-19T12:00:00.000Z"),
      existingApprovedAt: sent.approvedAt,
      existingApprovedById: sent.approvedById,
      existingAcceptedAt: null,
    });
    expect(accepted.acceptedAt?.toISOString()).toBe("2026-11-19T12:00:00.000Z");
    expect(accepted.approvedById).toBe("approver_1");
  });

  it("keeps approval immutable except through valid workflow transitions", () => {
    expect(() =>
      quotationUpdateData({
        from: "ACCEPTED",
        to: "APPROVED",
        actorId: "staff_1",
        existingApprovedAt: new Date("2026-11-10T00:00:00.000Z"),
        existingApprovedById: "approver_1",
        existingAcceptedAt: new Date("2026-11-11T00:00:00.000Z"),
      }),
    ).toThrow(/Invalid quotation transition/);
  });
});
