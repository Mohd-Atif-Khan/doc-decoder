import { NextRequest, NextResponse } from "next/server";
import { ExplainRequestSchema } from "@/lib/schema";
import { explainReport } from "@/lib/gemma";
import { flagAllTests } from "@/lib/flags";
import { sanitizeExplanationText, STANDARD_DISCLAIMER, mergeRiskAlerts } from "@/lib/safety";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ExplainRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { docType, language, documentTitle, tests, medicines, radiologyFindings, keyObservations } =
      parsed.data;

    // Deterministic re-check on user-verified tests
    const { flaggedTests, riskAlerts: deterministicAlerts } = flagAllTests(tests);

    // AI Pass 2: Comprehensive Plain Language Synthesis
    const aiExplanation = await explainReport({
      docType,
      language,
      documentTitle,
      tests: flaggedTests,
      medicines,
      radiologyFindings,
      keyObservations,
    });

    // Safety Engine: Sanitize summary and findings
    const { sanitized: sanitizedSummary } = sanitizeExplanationText(aiExplanation.summary);

    const sanitizedFindings = (aiExplanation.findings || []).map((f) => ({
      ...f,
      simpleExplanation: sanitizeExplanationText(f.simpleExplanation).sanitized,
      clinicalSignificance: f.clinicalSignificance
        ? sanitizeExplanationText(f.clinicalSignificance).sanitized
        : undefined,
    }));

    // Merge deterministic lab critical alerts with AI risks (e.g. X-ray fractures, drug warnings)
    const finalRiskAlerts = mergeRiskAlerts(deterministicAlerts, aiExplanation.risksAndAlerts || []);

    return NextResponse.json({
      summary: sanitizedSummary,
      docType: aiExplanation.docType || docType,
      risksAndAlerts: finalRiskAlerts,
      findings: sanitizedFindings,
      medicationRoutine: aiExplanation.medicationRoutine || [],
      doctorQuestions: aiExplanation.doctorQuestions || [],
      lifestyleAndCareNotes: aiExplanation.lifestyleAndCareNotes,
      disclaimer: STANDARD_DISCLAIMER,
    });
  } catch (err: any) {
    console.error("Error in /api/explain:", err);
    return NextResponse.json(
      {
        error: err.message || "Failed to generate report explanation",
      },
      { status: 500 }
    );
  }
}
