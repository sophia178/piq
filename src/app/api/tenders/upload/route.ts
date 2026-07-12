export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient, extractTextFromFile, TenderUploadSchema, trackAuditEvent } from "@/lib/platform";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const metadata = TenderUploadSchema.safeParse({
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      issuingBody: formData.get("issuingBody"),
    });

    if (!metadata.success || !(file instanceof File)) {
      return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
    }

    const text = await extractTextFromFile(file);
    const supabase = createServiceSupabaseClient();

    if (supabase) {
      try {
        const path = `${metadata.data.projectId}/${Date.now()}-${file.name}`;
        await supabase.storage.from("tenders").upload(path, file, { upsert: false });
        await supabase.from("tender_uploads").insert({
          project_id: metadata.data.projectId,
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          storage_path: path,
          extracted_text: text.slice(0, 50000),
          title: metadata.data.title,
          issuing_body: metadata.data.issuingBody,
        });
      } catch (dbError) {
        console.error('Database error during tender upload:', dbError);
      }
    }

    await trackAuditEvent({
      action: "tender.uploaded",
      entityType: "tender_upload",
      entityId: metadata.data.projectId,
      metadata: { fileName: file.name, size: file.size },
    });

    return NextResponse.json({
      message: "Upload completed.",
      projectId: metadata.data.projectId,
      fileName: file.name,
      textPreview: text.slice(0, 4000),
    });
  } catch (error) {
    console.error('Tender upload error:', error);
    return NextResponse.json({ error: "Failed to upload tender." }, { status: 500 });
  }
}
