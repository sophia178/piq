import { NextRequest, NextResponse } from "next/server";
import { BrandingSettingsSchema, saveOrganizationBrandingSettings } from "@/lib/submission-export";

export async function PATCH(request: NextRequest) {
  const payload = BrandingSettingsSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid branding settings payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const branding = await saveOrganizationBrandingSettings(payload.data);
    return NextResponse.json(branding);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save branding settings." },
      { status: 500 },
    );
  }
}
