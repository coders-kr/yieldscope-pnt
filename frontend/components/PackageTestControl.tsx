"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, Check, CircleDashed, Download, Layers3, RotateCcw, ShieldAlert } from "lucide-react";

import {
  PACKAGE_PLAN_STORAGE_KEY,
  PACKAGE_PROFILES,
  createEmptyPackagePlan,
  type PackageCheck,
  type PackageCheckRecord,
  type PackageCheckStatus,
  type PackagePlanState,
  type PackageProfile,
  type PackageProfileKey,
} from "@/lib/package-testing";

const STATUS_OPTIONS: PackageCheckStatus[] = ["미실행", "PASS", "WATCH", "FAIL", "N/A"];

const statusClasses: Record<PackageCheckStatus, string> = {
  미실행: "border-white/[0.1] bg-white/[0.035] text-[#9aa8bb]",
  PASS: "border-[#31c7a2]/20 bg-[#31c7a2]/[0.08] text-[#6de0c2]",
  WATCH: "border-[#f2b84b]/20 bg-[#f2b84b]/[0.08] text-[#ffd16b]",
  FAIL: "border-[#f36b78]/20 bg-[#f36b78]/[0.08] text-[#ff9aa3]",
  "N/A": "border-[#55b8f6]/20 bg-[#55b8f6]/[0.07] text-[#a9d9f4]",
};

function validProfile(value: unknown): value is PackageProfileKey {
  return typeof value === "string" && PACKAGE_PROFILES.some((item) => item.key === value);
}

function validRecord(value: unknown): value is PackageCheckRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return STATUS_OPTIONS.includes(item.status as PackageCheckStatus) && typeof item.result === "string" && typeof item.evidence === "string";
}

function recordFor(plan: PackagePlanState, check: PackageCheck): PackageCheckRecord {
  const stored = plan.records[check.id];
  return stored && validRecord(stored) ? stored : { status: "미실행", result: "", evidence: "" };
}

function evidenceComplete(plan: PackagePlanState, check: PackageCheck): boolean {
  const record = recordFor(plan, check);
  return record.status === "PASS" && record.result.trim().length > 0 && record.evidence.trim().length > 0;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function PackageCheckCard({
  check,
  record,
  onChange,
}: {
  check: PackageCheck;
  record: PackageCheckRecord;
  onChange: (id: string, next: PackageCheckRecord) => void;
}) {
  const evidenceRequired = check.required;
  return (
    <article className="min-w-0 rounded-xl border border-white/[0.07] bg-[#0a1320]/65 p-4 sm:p-4.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[8px]">
            <span className="rounded-md border border-[#55b8f6]/15 bg-[#55b8f6]/[0.06] px-1.5 py-1 font-medium text-[#9bcfea]">{check.stage}</span>
            <span className="text-[#68778d]">{check.required ? "RELEASE GATE" : "POLICY-BASED"}</span>
          </div>
          <h4 className="mt-2.5 break-words text-[12px] font-semibold leading-5 text-[#dce5ef]">{check.title}</h4>
          <p className="mt-1 break-words text-[9px] font-medium leading-4 text-[#8b9aae]">{check.format}</p>
        </div>
        <label className="shrink-0">
          <span className="sr-only">{check.title} 상태</span>
          <select
            value={record.status}
            onChange={(event) => onChange(check.id, { ...record, status: event.target.value as PackageCheckStatus })}
            className={`min-h-10 w-full rounded-lg border px-3 text-[10px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#55b8f6]/60 sm:w-[126px] ${statusClasses[record.status]}`}
          >
            {STATUS_OPTIONS.map((status) => <option key={status} value={status} className="bg-[#101a29] text-white">{status}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-3 text-[9px] leading-5 text-[#7f8ea2]">{check.purpose}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="mb-1 block text-[8px] font-medium text-[#738198]">결과 / 표본 수 {evidenceRequired && <span className="text-[#e3b95d]">· PASS 증거 필수</span>}</span>
          <input
            value={record.result}
            onChange={(event) => onChange(check.id, { ...record, result: event.target.value })}
            maxLength={120}
            placeholder="예: 24 / 24 통과, corner 측정값"
            className="min-h-10 w-full min-w-0 rounded-lg border border-white/[0.075] bg-[#080f1a] px-3 text-[9px] text-[#d4deea] outline-none placeholder:text-[#4e5e74] focus:border-[#55b8f6]/35 focus:ring-2 focus:ring-[#55b8f6]/10"
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[8px] font-medium text-[#738198]">기준 출처 / 증거 ID {evidenceRequired && <span className="text-[#e3b95d]">· 필수</span>}</span>
          <input
            value={record.evidence}
            onChange={(event) => onChange(check.id, { ...record, evidence: event.target.value })}
            maxLength={120}
            placeholder="Databook rev, Qual plan, report ID"
            className="min-h-10 w-full min-w-0 rounded-lg border border-white/[0.075] bg-[#080f1a] px-3 text-[9px] text-[#d4deea] outline-none placeholder:text-[#4e5e74] focus:border-[#55b8f6]/35 focus:ring-2 focus:ring-[#55b8f6]/10"
          />
        </label>
      </div>
      {record.status === "PASS" && evidenceRequired && (!record.result.trim() || !record.evidence.trim()) && (
        <p className="mt-2 flex items-center gap-1.5 text-[8px] text-[#ffd16b]"><ShieldAlert className="size-3 shrink-0" /> 결과와 기준/증거 ID를 기록해야 gate 완료로 집계됩니다.</p>
      )}
    </article>
  );
}

function PlanLane({
  profile,
  plan,
  scope,
  onChange,
}: {
  profile: PackageProfile;
  plan: PackagePlanState;
  scope: "production" | "qualification";
  onChange: (id: string, next: PackageCheckRecord) => void;
}) {
  const checks = profile.checks.filter((check) => check.scope === scope);
  const required = checks.filter((check) => check.required);
  const complete = required.filter((check) => evidenceComplete(plan, check)).length;
  const failing = checks.filter((check) => recordFor(plan, check).status === "FAIL").length;
  const label = scope === "production" ? "PRODUCTION SCREEN" : "RELIABILITY QUALIFICATION";
  const title = scope === "production" ? "양산 선별 · 전기 검사" : "샘플 기반 신뢰성 · 구조 검증";
  const caption = scope === "production"
    ? "제품 / LOT 판정에 연결되는 release gate. 해당 제품의 승인된 coverage와 limit을 입력합니다."
    : "별도 표본·stress 계획으로 qualification 상태를 관리합니다. 양산 LOT screen과 수량·판정 의미가 다릅니다.";
  const laneStatus = failing > 0 ? "FAIL" : complete === required.length ? "CLOSED" : "OPEN";

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0c1523]/55 p-4 sm:p-5" aria-label={title}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[8px] font-semibold tracking-[0.14em] text-[#728198]">{label}</p>
          <h3 className="mt-1.5 text-[14px] font-semibold text-[#e4ebf4]">{title}</h3>
          <p className="mt-1 max-w-3xl text-[9px] leading-5 text-[#78879c]">{caption}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-lg border px-2.5 py-1.5 text-[8px] font-semibold ${laneStatus === "CLOSED" ? "border-[#31c7a2]/20 bg-[#31c7a2]/[0.06] text-[#6de0c2]" : laneStatus === "FAIL" ? "border-[#f36b78]/20 bg-[#f36b78]/[0.06] text-[#ff9aa3]" : "border-[#f2b84b]/20 bg-[#f2b84b]/[0.06] text-[#ffd16b]"}`}>
            {scope === "production" ? (laneStatus === "CLOSED" ? "READY" : laneStatus === "FAIL" ? "HOLD" : "CONDITIONAL") : laneStatus === "CLOSED" ? "QUALIFIED" : laneStatus === "FAIL" ? "ISSUE" : "QUAL OPEN"}
          </span>
          <span className="text-[9px] tabular-nums text-[#8290a4]">{complete}/{required.length} 증거완료</span>
        </div>
      </div>
      <div className="mt-4 grid min-w-0 gap-2.5 xl:grid-cols-2">
        {checks.map((check) => (
          <PackageCheckCard key={check.id} check={check} record={recordFor(plan, check)} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

export function PackageTestControl() {
  const [plan, setPlan] = useState<PackagePlanState>(createEmptyPackagePlan);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const profile = useMemo(() => PACKAGE_PROFILES.find((item) => item.key === plan.profile) ?? PACKAGE_PROFILES[0], [plan.profile]);
  const productionChecks = profile.checks.filter((check) => check.scope === "production" && check.required);
  const productionComplete = productionChecks.filter((check) => evidenceComplete(plan, check)).length;
  const productionFailed = profile.checks.some((check) => check.scope === "production" && recordFor(plan, check).status === "FAIL");
  const productionReady = productionComplete === productionChecks.length;
  const qualificationChecks = profile.checks.filter((check) => check.scope === "qualification" && check.required);
  const qualificationComplete = qualificationChecks.filter((check) => evidenceComplete(plan, check)).length;
  const qualificationFailed = qualificationChecks.some((check) => recordFor(plan, check).status === "FAIL");
  const qualificationClosed = qualificationComplete === qualificationChecks.length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(PACKAGE_PLAN_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PackagePlanState>;
          if (validProfile(parsed.profile) && parsed.records && typeof parsed.records === "object") {
            const validRecords: PackagePlanState["records"] = {};
            for (const [id, record] of Object.entries(parsed.records)) {
              if (validRecord(record)) validRecords[id] = record;
            }
            setPlan({ profile: parsed.profile, records: validRecords });
          }
        }
      } catch {
        setNotice("저장된 Package Plan을 읽지 못해 빈 계획으로 열었습니다.");
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(PACKAGE_PLAN_STORAGE_KEY, JSON.stringify(plan));
    } catch {
      window.setTimeout(() => setNotice("브라우저 저장 공간을 사용할 수 없습니다. CSV를 내려받아 보관하세요."), 0);
    }
  }, [hydrated, plan]);

  function updateRecord(id: string, next: PackageCheckRecord) {
    setPlan((current) => ({ ...current, records: { ...current.records, [id]: next } }));
    setNotice("현재 브라우저에 저장했습니다.");
  }

  function loadSampleResults() {
    const records = { ...plan.records };
    for (const check of profile.checks) records[check.id] = check.demo;
    setPlan((current) => ({ ...current, records }));
    setNotice("합성 예시 결과를 불러왔습니다. 실제 생산 데이터가 아닙니다.");
  }

  function resetProfile() {
    const selectedIds = new Set(profile.checks.map((check) => check.id));
    const records = Object.fromEntries(Object.entries(plan.records).filter(([id]) => !selectedIds.has(id)));
    setPlan((current) => ({ ...current, records }));
    setNotice(`${profile.label} 상태를 초기화했습니다.`);
  }

  function exportCsv() {
    const rows = [
      ["Package Profile", "Architecture", "Scope", "Stage", "Test", "Format", "Required", "Status", "Result / Sample", "Criteria / Evidence ID"],
      ...profile.checks.map((check) => {
        const record = recordFor(plan, check);
        return [profile.label, profile.architecture, check.scope === "production" ? "양산 screen" : "신뢰성 qualification", check.stage, check.title, check.format, check.required ? "Y" : "Policy", record.status, record.result, record.evidence];
      }),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => csvCell(String(value))).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `yieldscope-${profile.key}-test-plan.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("현재 Package Test Plan을 CSV로 내보냈습니다.");
  }

  return (
    <PanelShell>
      <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:p-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.15em] text-[#8fcbe9]"><Layers3 className="size-3.5" /> PACKAGE TEST CONTROL</div>
          <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#eef4fb] sm:text-[20px]">패키지 구조별 Test Plan</h2>
          <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[#8392a7]">HBM 적층, 2.5D SiP, 3DS 메모리 모듈, UTV/WLP 프로파일을 고르고 양산 screen과 reliability qualification을 각각 기록합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadSampleResults} className="min-h-10 rounded-lg border border-[#55b8f6]/20 bg-[#55b8f6]/[0.055] px-3 text-[9px] font-medium text-[#b4dcf3] transition hover:bg-[#55b8f6]/[0.1]">예시 결과 불러오기</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/[0.09] px-3 text-[9px] font-medium text-[#aab7c8] transition hover:bg-white/[0.04] hover:text-white"><Download className="size-3.5" /> CSV 내보내기</button>
          <button type="button" onClick={resetProfile} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/[0.07] px-3 text-[9px] font-medium text-[#79889d] transition hover:bg-white/[0.035] hover:text-[#d5deea]"><RotateCcw className="size-3" /> 현재 프로파일 초기화</button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Package profile 선택">
          {PACKAGE_PROFILES.map((item) => {
            const active = item.key === plan.profile;
            return (
              <button key={item.key} type="button" aria-pressed={active} onClick={() => { setPlan((current) => ({ ...current, profile: item.key })); setNotice(`${item.label} 프로파일을 선택했습니다.`); }} className={`min-h-[76px] min-w-0 rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55b8f6]/50 ${active ? "border-[#55b8f6]/35 bg-[#55b8f6]/[0.075]" : "border-white/[0.065] bg-[#0a1320]/55 hover:border-white/[0.13] hover:bg-white/[0.025]"}`}>
                <span className={`block text-[10px] font-semibold ${active ? "text-[#d9effb]" : "text-[#a9b6c7]"}`}>{item.label}</span>
                <span className="mt-1.5 block break-words text-[8px] leading-4 text-[#6f8096]">{item.architecture}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
          <div className="min-w-0 rounded-xl border border-white/[0.06] bg-[#09121f]/60 p-4 sm:p-5">
            <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#55b8f6]/15 bg-[#55b8f6]/[0.06] text-[#8fcbe9]"><Activity className="size-4" /></span><div className="min-w-0"><p className="text-[8px] font-semibold tracking-[0.12em] text-[#64758d]">PACKAGE ARCHITECTURE</p><p className="mt-1 text-[12px] font-semibold text-[#dce5ef]">{profile.packageTechnology}</p><p className="mt-1 text-[9px] leading-5 text-[#7c8ba0]">{profile.summary}</p></div></div>
            <p className="mt-3 rounded-lg border border-[#f2b84b]/12 bg-[#f2b84b]/[0.035] px-3 py-2 text-[8px] leading-5 text-[#a8956f]">경계 · {profile.boundary}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SummaryTile icon={<Check className="size-3.5" />} label="PRODUCTION GATES" value={`${productionComplete} / ${productionChecks.length}`} state={productionFailed ? "fail" : productionReady ? "pass" : "watch"} status={productionFailed ? "HOLD" : productionReady ? "READY" : "CONDITIONAL"} />
            <SummaryTile icon={<CircleDashed className="size-3.5" />} label="QUALIFICATION" value={`${qualificationComplete} / ${qualificationChecks.length}`} state={qualificationFailed ? "fail" : qualificationClosed ? "pass" : "watch"} status={qualificationFailed ? "ISSUE" : qualificationClosed ? "CLOSED" : "OPEN"} />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <PlanLane profile={profile} plan={plan} scope="production" onChange={updateRecord} />
          <PlanLane profile={profile} plan={plan} scope="qualification" onChange={updateRecord} />
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/[0.055] bg-white/[0.015] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-4xl text-[8px] leading-5 text-[#68788e]">판정 의미 · 생산 gate는 필수 screen 결과와 증거가 모두 있어야 READY입니다. 신뢰성 시험은 표본 기반 qualification lane으로 별도 집계합니다. 이 공개 데모는 합성 데이터이며 사내 test recipe·규격·출하 승인을 대체하지 않습니다.</p>
          <span aria-live="polite" className="shrink-0 text-[8px] text-[#8fcbe9]">{notice || "변경 사항은 이 브라우저에 자동 저장됩니다."}</span>
        </div>
      </div>
    </PanelShell>
  );
}

function SummaryTile({ icon, label, value, state, status }: { icon: ReactNode; label: string; value: string; state: "pass" | "watch" | "fail"; status: string }) {
  const color = state === "pass" ? "text-[#6de0c2] border-[#31c7a2]/18 bg-[#31c7a2]/[0.045]" : state === "fail" ? "text-[#ff9aa3] border-[#f36b78]/18 bg-[#f36b78]/[0.045]" : "text-[#ffd16b] border-[#f2b84b]/18 bg-[#f2b84b]/[0.045]";
  return <div className={`flex min-w-0 flex-col justify-between rounded-xl border p-3.5 ${color}`}><div className="flex items-center justify-between gap-2"><span className="text-[7px] font-semibold tracking-[0.12em] text-[#718097]">{label}</span>{icon}</div><strong className="mt-3 text-[17px] font-semibold tabular-nums">{value}</strong><span className="mt-1 text-[8px] font-medium tracking-[0.06em]">{status}</span></div>;
}

function PanelShell({ children }: { children: ReactNode }) {
  return <div className="mt-4 overflow-hidden rounded-2xl border border-[#55b8f6]/15 bg-[linear-gradient(145deg,rgba(85,184,246,0.04),rgba(17,27,43,0.84)_42%,rgba(49,199,162,0.025))]">{children}</div>;
}
