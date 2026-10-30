import { GoogleGenerativeAI } from "@google/generative-ai";
import { UNIVERSAL_EXTRACTION_PROMPT, buildUniversalExplanationPrompt } from "./prompts";
import {
  ExtractResponse,
  ExtractResponseSchema,
  ExplainResponse,
  ExplainResponseSchema,
  TestItem,
  MedicineItem,
  RadiologyFinding,
} from "./schema";

/**
 * Robust JSON extraction from raw model strings
 * Strips code fences, removes markdown prefixes, repairs trailing commas
 */
export function cleanAndParseJSON<T>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  // Find outermost JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Remove potential trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  return JSON.parse(cleaned) as T;
}

export function getGeminiClient(): { client: GoogleGenerativeAI; primaryModel: string } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured in .env.local. Please check your API key."
    );
  }

  const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(apiKey);

  return { client, primaryModel };
}

/**
 * Ordered candidate models for automatic failover.
 * If Google servers have a 503 spike on Flash, it automatically switches to Gemma 4,
 * Flash-Lite, or alternative Gemma variants without breaking the user experience.
 */
const FALLBACK_MODELS = [
  "gemma-4-31b-it",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemma-4-26b-a4b-it",
  "gemini-flash-latest",
];

/**
 * Executes a generation with automatic model failover and retries.
 * Handles 503 (High Demand), 429 (Rate Limits), and network spikes seamlessly.
 */
async function generateWithModelFallback(
  client: GoogleGenerativeAI,
  parts: any[],
  generationConfig: any,
  preferredModel: string
): Promise<{ text: string; modelUsed: string }> {
  const modelsToTry = [
    preferredModel,
    ...FALLBACK_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[DocDecoder AI] Requesting inference from: ${modelName}...`);
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig,
      });

      const result = await model.generateContent(parts);
      const text = result.response.text();

      if (text && text.trim().length > 0) {
        console.log(`[DocDecoder AI] Successful response from: ${modelName}`);
        return { text, modelUsed: modelName };
      }
    } catch (err: any) {
      console.warn(`[DocDecoder AI] Model ${modelName} returned error: ${err?.message || err}`);
      lastError = err;

      const errMsg = String(err?.message || "").toLowerCase();
      // If 503 (high demand) or 429 (quota) or 500/unavailable, proceed to next fallback model immediately!
      if (
        errMsg.includes("503") ||
        errMsg.includes("high demand") ||
        errMsg.includes("unavailable") ||
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("resource has been exhausted")
      ) {
        console.log(`[DocDecoder AI] High demand on ${modelName}, failing over to next model in cascade...`);
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
    }
  }

  throw lastError || new Error("All AI models are temporarily unavailable. Please retry in a moment.");
}

/**
 * Universal safe sanitizer for extracted data.
 * Guarantees that even if the AI model sends nulls or unexpected types,
 * the application recovers gracefully and never crashes.
 */
function safeSanitizeExtraction(raw: any): ExtractResponse {
  const tests: TestItem[] = Array.isArray(raw?.tests)
    ? raw.tests.map((t: any) => {
        let val: number | null = null;
        if (typeof t?.value === "number") {
          val = isNaN(t.value) ? null : t.value;
        } else if (t?.value !== null && t?.value !== undefined && t?.value !== "") {
          const num = parseFloat(String(t.value).replace(/[^0-9.-]/g, ""));
          val = isNaN(num) ? null : num;
        }

        let refLow: number | null = null;
        if (typeof t?.refLow === "number") {
          refLow = isNaN(t.refLow) ? null : t.refLow;
        } else if (t?.refLow !== null && t?.refLow !== undefined && t?.refLow !== "") {
          const num = parseFloat(String(t.refLow).replace(/[^0-9.-]/g, ""));
          refLow = isNaN(num) ? null : num;
        }

        let refHigh: number | null = null;
        if (typeof t?.refHigh === "number") {
          refHigh = isNaN(t.refHigh) ? null : t.refHigh;
        } else if (t?.refHigh !== null && t?.refHigh !== undefined && t?.refHigh !== "") {
          const num = parseFloat(String(t.refHigh).replace(/[^0-9.-]/g, ""));
          refHigh = isNaN(num) ? null : num;
        }

        return {
          name: t?.name ? String(t.name) : "Test Parameter",
          value: val,
          unit: t?.unit ? String(t.unit) : "",
          refLow,
          refHigh,
          flag: t?.flag || "unknown",
          confidence: t?.confidence || "high",
          notes: t?.notes ? String(t.notes) : undefined,
        };
      })
    : [];

  const medicines: MedicineItem[] = Array.isArray(raw?.medicines)
    ? raw.medicines.map((m: any) => ({
        name: m?.name ? String(m.name) : "Medicine",
        genericName: m?.genericName ? String(m.genericName) : undefined,
        dose: m?.dose ? String(m.dose) : undefined,
        form: m?.form || "tablet",
        timing: m?.timing || {
          morning: true,
          afternoon: false,
          night: true,
          mealTiming: "after_food",
        },
        duration: m?.duration ? String(m.duration) : undefined,
        purpose: m?.purpose ? String(m.purpose) : undefined,
        precautions: m?.precautions ? String(m.precautions) : undefined,
      }))
    : [];

  const radiologyFindings: RadiologyFinding[] = Array.isArray(raw?.radiologyFindings)
    ? raw.radiologyFindings.map((r: any) => ({
        bodyPart: r?.bodyPart ? String(r.bodyPart) : "Area examined",
        studyType: r?.studyType ? String(r.studyType) : "Scan",
        observation: r?.observation ? String(r.observation) : "Standard imaging finding",
        impression: r?.impression ? String(r.impression) : "Report reviewed",
        isAbnormal: Boolean(r?.isAbnormal),
        severity: r?.severity || "normal",
      }))
    : [];

  return {
    docType: raw?.docType || "lab_report",
    documentTitle: raw?.documentTitle ? String(raw.documentTitle) : undefined,
    doctorOrHospital: raw?.doctorOrHospital ? String(raw.doctorOrHospital) : undefined,
    patientNotes: raw?.patientNotes ? String(raw.patientNotes) : undefined,
    tests,
    medicines,
    radiologyFindings,
    keyObservations: Array.isArray(raw?.keyObservations)
      ? raw.keyObservations.map(String)
      : [],
    warnings: Array.isArray(raw?.warnings) ? raw.warnings.map(String) : [],
  };
}

/**
 * Pass 1: Multimodal Vision extraction with automatic failover
 */
export async function extractFromImage(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<ExtractResponse> {
  const { client, primaryModel } = getGeminiClient();

  const cleanBase64 = base64Data.includes("base64,")
    ? base64Data.split("base64,")[1]
    : base64Data;

  const parts = [
    { text: UNIVERSAL_EXTRACTION_PROMPT },
    {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    },
  ];

  const config = {
    temperature: 0.1,
    topP: 0.95,
    responseMimeType: "application/json",
  };

  try {
    const { text: responseText } = await generateWithModelFallback(
      client,
      parts,
      config,
      primaryModel
    );

    const parsed = cleanAndParseJSON<unknown>(responseText);
    const validated = ExtractResponseSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }

    return safeSanitizeExtraction(parsed);
  } catch (err: any) {
    console.error("Extraction error after failover cascade:", err);
    throw new Error(
      `Failed to parse document: ${err?.message || "Invalid JSON or unreadable image"}`
    );
  }
}

/**
 * Pass 2: Universal Plain Language Explanation with automatic failover
 */
export async function explainReport(params: {
  docType: string;
  language: string;
  documentTitle?: string;
  tests: TestItem[];
  medicines: MedicineItem[];
  radiologyFindings?: RadiologyFinding[];
  keyObservations?: string[];
}): Promise<ExplainResponse> {
  const { client, primaryModel } = getGeminiClient();

  const prompt = buildUniversalExplanationPrompt({
    docType: params.docType,
    language: params.language,
    documentTitle: params.documentTitle,
    testsJson: JSON.stringify(params.tests, null, 2),
    medicinesJson: JSON.stringify(params.medicines, null, 2),
    radiologyJson: JSON.stringify(params.radiologyFindings || [], null, 2),
    keyObservationsJson: JSON.stringify(params.keyObservations || [], null, 2),
  });

  const config = {
    temperature: 0.2,
    topP: 0.95,
    responseMimeType: "application/json",
  };

  const { text: responseText, modelUsed } = await generateWithModelFallback(
    client,
    [{ text: prompt }],
    config,
    primaryModel
  );

  console.log(`[DocDecoder AI] Explanation synthesized successfully using ${modelUsed}`);

  const parsed = cleanAndParseJSON<unknown>(responseText);
  const validated = ExplainResponseSchema.safeParse(parsed);
  if (validated.success) {
    return validated.data;
  }

  const rawObj = parsed as any;
  return {
    summary: rawObj?.summary || "Report decoded successfully.",
    docType: rawObj?.docType || params.docType,
    risksAndAlerts: Array.isArray(rawObj?.risksAndAlerts) ? rawObj.risksAndAlerts : [],
    findings: Array.isArray(rawObj?.findings) ? rawObj.findings : [],
    medicationRoutine: Array.isArray(rawObj?.medicationRoutine) ? rawObj.medicationRoutine : [],
    doctorQuestions: Array.isArray(rawObj?.doctorQuestions) ? rawObj.doctorQuestions : [],
    lifestyleAndCareNotes: rawObj?.lifestyleAndCareNotes,
    disclaimer:
      "Important: Doc Decoder provides educational explanations. Always consult your licensed healthcare provider.",
  };
}
