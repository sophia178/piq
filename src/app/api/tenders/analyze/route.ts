import { NextRequest, NextResponse } from "next/server";
import { extractTextFromFile, runTenderAnalysis, trackAuditEvent } from "@/lib/platform";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A tender file is required." }, { status: 400 });
  }

  const text = await extractTextFromFile(file);
  const analysis = await runTenderAnalysis(text);

  await trackAuditEvent({
    action: "tender.analyzed",
    entityType: "tender_upload",
    metadata: { fileName: file.name, requirements: analysis.requirements.length },
  });

  return NextResponse.json(analysis);
}
