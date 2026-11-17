import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function handleRoute(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    if (error instanceof ZodError) return fail(400, "Invalid request payload");
    console.error("RevenueOS route error:", error instanceof Error ? error.message : "unknown");
    return fail(500, "Internal server error");
  }
}
