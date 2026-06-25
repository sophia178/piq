import { NextRequest, NextResponse } from "next/server";
import { runSubmissionValidation, SubmissionValidationRunSchema } from "@/lib/submission-export";

export async function POST(request: NextRequest) {
  const payload = SubmissionValidationRunSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid submission validation payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const validation = await runSubmissionValidation(payload.data);
    return NextResponse.json(validation);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run final submission validation." },
      { status: 500 },
    );
  }
}
