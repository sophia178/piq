import { NextRequest, NextResponse } from "next/server";
import { exportProjectDocument, ExportSchema, trackAuditEvent } from "@/lib/platform";
import { generateSubmissionExport, SubmissionExportRequestSchema } from "@/lib/submission-export";
import { slugify } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const submissionPayload = SubmissionExportRequestSchema.safeParse(body);

    if (submissionPayload.success) {
      const file = await generateSubmissionExport(submissionPayload.data);

      return new NextResponse(file.buffer, {
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `attachment; filename=\"${file.fileName}.${file.extension}\"`,
          "X-Submission-Recommendation": file.validation.finalSubmissionRecommendation,
          "X-Export-Risk-Score": String(file.validation.exportRiskScore),
        },
      });
    }

    const payload = ExportSchema.safeParse(body);

    if (!payload.success) {
      return NextResponse.json({ error: "Invalid export payload.", issues: payload.error.flatten() }, { status: 400 });
    }

    const file = await exportProjectDocument(payload.data);
    await trackAuditEvent({
      action: "workspace.exported",
      entityType: "project",
      metadata: { format: payload.data.format, title: payload.data.projectTitle },
    });

    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename=\"${slugify(payload.data.projectTitle)}.${file.extension}\"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: "Failed to export document." }, { status: 500 });
  }
}
