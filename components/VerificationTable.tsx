"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  AlertCircle,
  ArrowRight,
  Eye,
  ShieldCheck,
  Check,
  Pill,
  Activity,
  Scan,
} from "lucide-react";
import { TestItem, MedicineItem, RadiologyFinding, DocType } from "@/lib/schema";
import { evaluateTestFlag } from "@/lib/flags";

interface VerificationTableProps {
  docType: DocType;
  tests: TestItem[];
  medicines: MedicineItem[];
  radiologyFindings?: RadiologyFinding[];
  warnings: string[];
  previewUrl: string | null;
  onConfirm: (
    verifiedTests: TestItem[],
    verifiedMedicines: MedicineItem[],
    verifiedRadiology: RadiologyFinding[]
  ) => void;
  isLoading: boolean;
}

export function VerificationTable({
  docType,
  tests: initialTests,
  medicines: initialMedicines,
  radiologyFindings: initialRadiology = [],
  warnings,
  previewUrl,
  onConfirm,
  isLoading,
}: VerificationTableProps) {
  const [tests, setTests] = useState<TestItem[]>(initialTests);
  const [medicines, setMedicines] = useState<MedicineItem[]>(initialMedicines);
  const [radiology, setRadiology] = useState<RadiologyFinding[]>(initialRadiology);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Test row updates
  const updateTestField = (index: number, field: keyof TestItem, val: any) => {
    const updated = [...tests];
    const item = { ...updated[index], [field]: val };
    const evaluation = evaluateTestFlag(item);
    item.flag = evaluation.flag;
    if (evaluation.refLow !== null && item.refLow === null) item.refLow = evaluation.refLow;
    if (evaluation.refHigh !== null && item.refHigh === null) item.refHigh = evaluation.refHigh;
    updated[index] = item;
    setTests(updated);
  };

  const addTestRow = () => {
    setTests([
      ...tests,
      {
        name: "New Test",
        value: 0,
        unit: "",
        refLow: null,
        refHigh: null,
        flag: "unknown",
        confidence: "high",
      },
    ]);
  };

  const removeTestRow = (index: number) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  // Medicine row updates
  const updateMedicineField = (index: number, field: keyof MedicineItem, val: any) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: val };
    setMedicines(updated);
  };

  const updateMedicineTiming = (index: number, timingField: string, val: any) => {
    const updated = [...medicines];
    const timing = { ...updated[index].timing, [timingField]: val };
    updated[index] = { ...updated[index], timing };
    setMedicines(updated);
  };

  const addMedicineRow = () => {
    setMedicines([
      ...medicines,
      {
        name: "Medicine Name",
        genericName: "",
        dose: "1 Tablet",
        form: "tablet",
        timing: {
          morning: true,
          afternoon: false,
          night: true,
          mealTiming: "after_food",
          scheduleText: "1-0-1",
        },
        duration: "5 days",
        purpose: "Treatment",
      },
    ]);
  };

  const removeMedicineRow = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  // Radiology updates
  const updateRadiologyField = (index: number, field: keyof RadiologyFinding, val: any) => {
    const updated = [...radiology];
    updated[index] = { ...updated[index], [field]: val };
    setRadiology(updated);
  };

  const addRadiologyRow = () => {
    setRadiology([
      ...radiology,
      {
        bodyPart: "Examined Area",
        studyType: "X-Ray / Scan",
        observation: "Radiologist finding",
        impression: "Conclusion",
        isAbnormal: false,
        severity: "normal",
      },
    ]);
  };

  const removeRadiologyRow = (index: number) => {
    setRadiology(radiology.filter((_, i) => i !== index));
  };

  const getChipClass = (flag?: string) => {
    switch (flag) {
      case "normal":
        return "chip chip-normal";
      case "low":
      case "high":
        return "chip chip-low";
      case "critical":
        return "chip chip-critical";
      default:
        return "chip chip-unknown";
    }
  };

  return (
    <div style={{ margin: "28px auto", maxWidth: "1150px" }}>
      {/* Top Banner Notice */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldCheck size={22} style={{ color: "var(--brand-blue)" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: 700 }}>
                Human Verification Audit (Clinical Safety Check)
              </h4>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {docType.replace("_", " ")}
              </span>
            </div>
            <p style={{ fontSize: "12.5px", marginTop: "2px" }}>
              AI read this from your document. Please verify, fix any spelling or digits, and confirm.
            </p>
          </div>
        </div>

        {previewUrl && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "12px", padding: "6px 12px" }}
            onClick={() => setShowPreviewModal(!showPreviewModal)}
          >
            <Eye size={14} />
            <span>{showPreviewModal ? "Hide Document Photo" : "View Uploaded Photo"}</span>
          </button>
        )}
      </div>

      {/* Optional Photo Comparison */}
      {showPreviewModal && previewUrl && (
        <div
          style={{
            marginBottom: "24px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
            Original Uploaded Document (In-Memory Preprocessed)
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Original Document"
            style={{
              maxHeight: "380px",
              maxWidth: "100%",
              objectFit: "contain",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}
          />
        </div>
      )}

      {/* Model Warnings */}
      {warnings.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            background: "var(--status-warn-bg)",
            border: "1px solid var(--status-warn-border)",
            color: "var(--status-warn-text)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
            <AlertCircle size={15} />
            <span>Document Notes & Warnings:</span>
          </div>
          {warnings.map((w, idx) => (
            <div key={idx} style={{ marginLeft: "20px" }}>
              • {w}
            </div>
          ))}
        </div>
      )}

      {/* Section 1: Prescription Medicines */}
      {medicines.length > 0 && (
        <div className="table-container" style={{ marginBottom: "28px" }}>
          <div
            style={{
              padding: "14px 18px",
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Pill size={16} style={{ color: "var(--brand-blue)" }} />
              <span style={{ fontWeight: 700, fontSize: "14px" }}>
                Prescribed Medicines & Tablets ({medicines.length})
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "4px 10px" }}
              onClick={addMedicineRow}
            >
              <Plus size={13} />
              <span>Add Medicine</span>
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Medicine Name</th>
                  <th style={{ width: "16%" }}>Dosage / Form</th>
                  <th style={{ width: "20%" }}>Daily Schedule</th>
                  <th style={{ width: "20%" }}>When to Take</th>
                  <th style={{ width: "16%" }}>Duration</th>
                  <th style={{ width: "4%" }}></th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="table-input"
                        value={med.name}
                        placeholder="e.g. Pan-D / Augmentin"
                        onChange={(e) => updateMedicineField(idx, "name", e.target.value)}
                      />
                      {med.genericName && (
                        <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "2px" }}>
                          {med.genericName}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={med.dose || ""}
                        placeholder="e.g. 500mg, 1 Tab"
                        onChange={(e) => updateMedicineField(idx, "dose", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={med.timing?.scheduleText || "1-0-1"}
                        placeholder="1-0-1 (Subah/Raat)"
                        onChange={(e) => updateMedicineTiming(idx, "scheduleText", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="table-input"
                        value={med.timing?.mealTiming || "after_food"}
                        onChange={(e) => updateMedicineTiming(idx, "mealTiming", e.target.value)}
                      >
                        <option value="empty_stomach">Khali Pet (Before Food)</option>
                        <option value="after_food">Khane ke baad (After Food)</option>
                        <option value="with_food">Khane ke sath (With Meal)</option>
                        <option value="at_bedtime">Sote waqt (Bedtime / HS)</option>
                        <option value="as_needed">Dard/Bukhar me (SOS)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={med.duration || ""}
                        placeholder="e.g. 5 din / 1 month"
                        onChange={(e) => updateMedicineField(idx, "duration", e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeMedicineRow(idx)}
                        style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Lab Test Parameters */}
      {tests.length > 0 && (
        <div className="table-container" style={{ marginBottom: "28px" }}>
          <div
            style={{
              padding: "14px 18px",
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={16} style={{ color: "var(--brand-navy)" }} />
              <span style={{ fontWeight: 700, fontSize: "14px" }}>
                Lab Test Parameters ({tests.length})
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "4px 10px" }}
              onClick={addTestRow}
            >
              <Plus size={13} />
              <span>Add Test</span>
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Test Name</th>
                  <th style={{ width: "16%" }}>Observed Value</th>
                  <th style={{ width: "14%" }}>Unit</th>
                  <th style={{ width: "14%" }}>Printed Low</th>
                  <th style={{ width: "14%" }}>Printed High</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "4%" }}></th>
                </tr>
              </thead>
              <tbody>
                {tests.map((test, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="table-input"
                        value={test.name}
                        onChange={(e) => updateTestField(idx, "name", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        className="table-input mono"
                        value={test.value !== null ? test.value : ""}
                        placeholder="null"
                        onChange={(e) =>
                          updateTestField(
                            idx,
                            "value",
                            e.target.value === "" ? null : parseFloat(e.target.value)
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={test.unit || ""}
                        placeholder="e.g. g/dL"
                        onChange={(e) => updateTestField(idx, "unit", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        className="table-input mono"
                        value={test.refLow !== null ? test.refLow : ""}
                        placeholder="-"
                        onChange={(e) =>
                          updateTestField(
                            idx,
                            "refLow",
                            e.target.value === "" ? null : parseFloat(e.target.value)
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        className="table-input mono"
                        value={test.refHigh !== null ? test.refHigh : ""}
                        placeholder="-"
                        onChange={(e) =>
                          updateTestField(
                            idx,
                            "refHigh",
                            e.target.value === "" ? null : parseFloat(e.target.value)
                          )
                        }
                      />
                    </td>
                    <td>
                      <span className={getChipClass(test.flag)}>{test.flag || "unknown"}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => removeTestRow(idx)}
                        style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Radiology & Imaging Findings */}
      {radiology.length > 0 && (
        <div className="table-container" style={{ marginBottom: "28px" }}>
          <div
            style={{
              padding: "14px 18px",
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Scan size={16} style={{ color: "var(--brand-blue)" }} />
              <span style={{ fontWeight: 700, fontSize: "14px" }}>
                Radiology & Imaging Findings (X-Ray / MRI / CT) ({radiology.length})
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "4px 10px" }}
              onClick={addRadiologyRow}
            >
              <Plus size={13} />
              <span>Add Finding</span>
            </button>
          </div>

          <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
            {radiology.map((rad, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-page)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <input
                    className="table-input"
                    style={{ width: "45%", fontWeight: 700 }}
                    value={rad.bodyPart}
                    placeholder="Region (e.g. Chest / Right Knee)"
                    onChange={(e) => updateRadiologyField(idx, "bodyPart", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeRadiologyRow(idx)}
                    style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
                    Radiologist Observation:
                  </span>
                  <input
                    className="table-input"
                    value={rad.observation}
                    placeholder="e.g. Clear lung fields, no fracture"
                    onChange={(e) => updateRadiologyField(idx, "observation", e.target.value)}
                  />
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
                    Impression / Conclusion:
                  </span>
                  <input
                    className="table-input"
                    value={rad.impression}
                    placeholder="e.g. Normal chest radiograph"
                    onChange={(e) => updateRadiologyField(idx, "impression", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "16px",
          marginTop: "20px",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Patient verification complete. Zero hallucinated data will be fed into explanation.
        </span>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onConfirm(tests, medicines, radiology)}
          disabled={isLoading || (tests.length === 0 && medicines.length === 0 && radiology.length === 0)}
          style={{ padding: "12px 24px", fontSize: "14px" }}
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ borderLeftColor: "#ffffff" }} />
              <span>Analyzing with Gemini Flash...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Confirm & Decode Report</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
