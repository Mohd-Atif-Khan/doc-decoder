"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  HelpCircle,
  Activity,
  FileCheck,
  Pill,
  Clock,
  HeartHandshake,
  ShieldAlert,
} from "lucide-react";
import { ExplainResponse } from "@/lib/schema";

interface ResultsViewProps {
  explanation: ExplainResponse;
  language: string;
  onReset: () => void;
}

export function ResultsView({ explanation, language, onReset }: ResultsViewProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState<number | null>(null);
  const [allQuestionsCopied, setAllQuestionsCopied] = useState(false);

  const toggleSpeech = () => {
    if (!window.speechSynthesis) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const textParts = [explanation.summary];

    if (explanation.risksAndAlerts && explanation.risksAndAlerts.length > 0) {
      textParts.push(
        ...explanation.risksAndAlerts.map(
          (r) => `Dhyan dein: ${r.title}. ${r.riskDetail}. ${r.immediateAction}`
        )
      );
    }

    if (explanation.medicationRoutine && explanation.medicationRoutine.length > 0) {
      textParts.push(
        ...explanation.medicationRoutine.map(
          (m) =>
            `${m.name}. ${m.purpose}. Yeh ${m.whenToTake} ${m.mealTiming} lena hai. ${m.howToTake}`
        )
      );
    }

    const utterance = new SpeechSynthesisUtterance(textParts.join(". "));

    if (language === "hindi" || language === "hinglish") {
      utterance.lang = "hi-IN";
    } else {
      utterance.lang = "en-US";
    }

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  const copyQuestion = (q: string, idx: number) => {
    navigator.clipboard.writeText(q);
    setCopiedQuestionIdx(idx);
    setTimeout(() => setCopiedQuestionIdx(null), 2000);
  };

  const copyAllQuestions = () => {
    const text = explanation.doctorQuestions
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setAllQuestionsCopied(true);
    setTimeout(() => setAllQuestionsCopied(false), 2000);
  };

  const getChipClass = (flag?: string) => {
    const f = flag?.toLowerCase() || "";
    if (f.includes("normal") || f.includes("clear") || f.includes("safe")) {
      return "chip chip-normal";
    }
    if (f.includes("critical") || f.includes("urgent") || f.includes("fracture")) {
      return "chip chip-critical";
    }
    if (f.includes("high") || f.includes("low") || f.includes("mild") || f.includes("abnormal")) {
      return "chip chip-low";
    }
    return "chip chip-unknown";
  };

  return (
    <div style={{ maxWidth: "1050px", margin: "28px auto" }}>
      {/* 1. Risks & Red-Flags Alert Banners */}
      {explanation.risksAndAlerts && explanation.risksAndAlerts.length > 0 && (
        <div style={{ marginBottom: "28px", display: "grid", gap: "12px" }}>
          {explanation.risksAndAlerts.map((alert, i) => (
            <div
              key={i}
              className="urgent-banner"
              style={{
                background:
                  alert.severity === "urgent" ? "var(--status-danger-bg)" : "var(--status-warn-bg)",
                borderColor:
                  alert.severity === "urgent"
                    ? "var(--status-danger-border)"
                    : "var(--status-warn-border)",
                color:
                  alert.severity === "urgent"
                    ? "var(--status-danger-text)"
                    : "var(--status-warn-text)",
              }}
            >
              {alert.severity === "urgent" ? (
                <ShieldAlert size={26} style={{ flexShrink: 0, marginTop: "2px" }} />
              ) : (
                <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: "2px" }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h4 style={{ fontSize: "15.5px", fontWeight: 800 }}>{alert.title}</h4>
                  <span
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: 800,
                      background: "rgba(0,0,0,0.06)",
                    }}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p style={{ fontSize: "13.5px", lineHeight: "1.5", marginBottom: "6px" }}>
                  {alert.riskDetail}
                </p>
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    padding: "6px 10px",
                    background: "rgba(255,255,255,0.6)",
                    borderRadius: "4px",
                    display: "inline-block",
                  }}
                >
                  👉 Next Step: {alert.immediateAction}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Plain Language Report Summary */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "24px",
          marginBottom: "28px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileCheck size={20} style={{ color: "var(--brand-blue)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>
              Plain Language Report Summary
            </h3>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={toggleSpeech}
            style={{ fontSize: "12.5px", padding: "6px 12px" }}
          >
            {isPlayingAudio ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isPlayingAudio ? "Stop Audio" : "Listen in Voice"}</span>
          </button>
        </div>

        <p
          className="editorial"
          style={{
            fontSize: "16.5px",
            lineHeight: "1.65",
            color: "var(--text-main)",
          }}
        >
          {explanation.summary}
        </p>

        {explanation.lifestyleAndCareNotes && (
          <div
            style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "13px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <HeartHandshake size={18} style={{ color: "var(--brand-blue)", flexShrink: 0 }} />
            <div>
              <strong>Daily Care & Wellness:</strong> {explanation.lifestyleAndCareNotes}
            </div>
          </div>
        )}
      </div>

      {/* 3. Prescription Routine: Exact Medicine Schedule */}
      {explanation.medicationRoutine && explanation.medicationRoutine.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Pill size={20} style={{ color: "var(--brand-blue)" }} />
            <h4 style={{ fontSize: "17px", fontWeight: 800 }}>
              Prescribed Medicines: How & When to Take ({explanation.medicationRoutine.length})
            </h4>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            {explanation.medicationRoutine.map((med, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Header: Name & Form */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h5 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-main)" }}>
                        {med.name}
                      </h5>
                      {med.dose && (
                        <span className="mono" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
                          ({med.dose})
                        </span>
                      )}
                    </div>
                    {med.genericName && (
                      <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "2px" }}>
                        Salt/Formula: {med.genericName}
                      </div>
                    )}
                  </div>

                  {med.duration && (
                    <span
                      style={{
                        padding: "4px 10px",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--brand-blue)",
                      }}
                    >
                      Duration: {med.duration}
                    </span>
                  )}
                </div>

                {/* Purpose */}
                <div style={{ fontSize: "13.5px", color: "var(--text-main)", marginBottom: "14px" }}>
                  <strong>Kyun diya gaya hai:</strong> {med.purpose}
                </div>

                {/* When and How to Take Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "12px",
                    background: "var(--bg-subtle)",
                    padding: "14px",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                      <Clock size={12} />
                      Kab lena hai (Daily Timing)
                    </div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--brand-navy)" }}>
                      {med.whenToTake}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {med.mealTiming}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                      Kaise lena hai (How to take)
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-main)" }}>
                      {med.howToTake}
                    </div>
                  </div>
                </div>

                {/* Precaution */}
                {med.keyPrecautions && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--status-warn-text)",
                      background: "var(--status-warn-bg)",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      border: "1px solid var(--status-warn-border)",
                    }}
                  >
                    <strong>⚠️ Dhyan rakhein:</strong> {med.keyPrecautions}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Test & Imaging Findings Breakdown */}
      {explanation.findings && explanation.findings.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Activity size={18} style={{ color: "var(--brand-navy)" }} />
            <h4 style={{ fontSize: "17px", fontWeight: 800 }}>
              Specific Findings & Values Explained ({explanation.findings.length})
            </h4>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {explanation.findings.map((f, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: 700, fontSize: "15px" }}>{f.parameterOrArea}</span>
                    <span className={getChipClass(f.flagOrStatus)}>{f.flagOrStatus}</span>
                  </div>

                  {f.valueText && (
                    <span className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {f.valueText}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "13.5px", color: "var(--text-main)", marginTop: "4px" }}>
                  {f.simpleExplanation}
                </p>

                {f.clinicalSignificance && (
                  <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "2px" }}>
                    • {f.clinicalSignificance}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Doctor Consultation Checklist */}
      {explanation.doctorQuestions && explanation.doctorQuestions.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <HelpCircle size={18} style={{ color: "var(--brand-blue)" }} />
              <h4 style={{ fontSize: "16px", fontWeight: 700 }}>
                Questions to Ask Your Doctor at Your Visit
              </h4>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={copyAllQuestions}
              style={{ fontSize: "12px", padding: "5px 10px" }}
            >
              {allQuestionsCopied ? <Check size={13} /> : <Copy size={13} />}
              <span>{allQuestionsCopied ? "Copied All!" : "Copy Checklist"}</span>
            </button>
          </div>

          <div>
            {explanation.doctorQuestions.map((q, idx) => (
              <div key={idx} className="question-card">
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--brand-blue)",
                      marginTop: "1px",
                    }}
                  >
                    Q{idx + 1}.
                  </span>
                  <span style={{ fontSize: "13.5px", color: "var(--text-main)" }}>{q}</span>
                </div>

                <button
                  type="button"
                  onClick={() => copyQuestion(q, idx)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-light)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                  title="Copy question"
                >
                  {copiedQuestionIdx === idx ? (
                    <Check size={14} style={{ color: "#10b981" }} />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Medical Disclaimer */}
      <div
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "16px",
          fontSize: "12px",
          color: "var(--text-muted)",
          marginBottom: "28px",
          lineHeight: "1.6",
        }}
      >
        <strong>Clinical Disclaimer:</strong> {explanation.disclaimer}
      </div>

      {/* 7. Reset Action */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
          style={{ padding: "10px 20px" }}
        >
          <RotateCcw size={15} />
          <span>Decode Another Report or Prescription</span>
        </button>
      </div>
    </div>
  );
}
