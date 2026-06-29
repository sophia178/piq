export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { indexKnowledgeDocument, KnowledgeUploadSchema } from "@/lib/knowledge";
import { createServiceSupabaseClient, extractTextFromFile, trackAuditEvent } from "@/lib/platform";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A knowledge document file is required." }, { status: 400 });
    }

    const text = await extractTextFromFile(file);
    const storagePath = `knowledge/${String(formData.get("organizationId") ?? "org")}/${Date.now()}-${file.name}`;
    const payload = KnowledgeUploadSchema.safeParse({
      organizationId: formData.get("organizationId"),
      title: formData.get("title") ?? file.name.replace(/\.[^.]+$/, ""),
      description: formData.get("description") ?? undefined,
      documentType: formData.get("documentType"),
      storagePath,
      sourceFile: file.name,
      extractedText: text,
    });

    if (!payload.success) {
      return NextResponse.json({ error: "Invalid knowledge upload payload.", issues: payload.error.flatten() }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    if (supabase) {
      const { error: uploadError } = await supabase.storage.from("tenders").upload(storagePath, file, { upsert: false });
      if (uploadError) {
        throw new Error(uploadError.message);
      }
    }

    const result = await indexKnowledgeDocument(payload.data);

    await trackAuditEvent({
      action: "knowledge.document_uploaded",
      entityType: "knowledge_document",
      entityId: result.documentId,
      organizationId: payload.data.organizationId,
      metadata: {
        documentType: payload.data.documentType,
        title: payload.data.title,
        chunkCount: result.chunkCount,
        fileName: file.name,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to index knowledge document." },
      { status: 500 },
    );
  }
}
