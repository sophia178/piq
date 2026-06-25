import { NextRequest, NextResponse } from "next/server";
import { ExportTemplateUpsertSchema, saveExportTemplate } from "@/lib/submission-export";

export async function POST(request: NextRequest) {
  const payload = ExportTemplateUpsertSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid export template payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const template = await saveExportTemplate(payload.data);
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save export template." },
      { status: 500 },
    );
  }
}
