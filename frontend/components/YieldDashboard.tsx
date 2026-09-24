"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  GitBranch,
  Gauge,
  Layers3,
  LogIn,
  Microscope,
  Network,
  PanelLeft,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Settings2,
  Target,
  TestTube2,
  Timer,
  TrendingDown,
  Upload,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { signInHref } from "@/lib/identity";
import { PackageTestControl } from "@/components/PackageTestControl";
import {
  METRIC_DEFINITIONS,
  SCENARIO_ORDER,
  SCENARIOS,
  TEST_CONTROL_PLANS,
  TEST_OPERATIONS,
  TEST_PROGRAM_QUALIFICATIONS,
  type DispositionAction,
  type LotDisposition,
  type QualificationGateState,
  type Scenario,
  type TestFlowStageKey,
  type ScenarioKey,
} from "@/lib/quality";

const NAV = [
  { id: "overview", label: "Shift Command", icon: Gauge },
  { id: "test-ops", label: "Test Operations", icon: GitBranch },
  { id: "defects", label: "Defect Explorer", icon: BarChart3 },
  { id: "rca", label: "RCA Workbench", icon: Microscope },
  { id: "validation", label: "Action Validation", icon: ClipboardCheck },
];

const statusStyle: Record<string, string> = {
  격리: "border-[#f36b78]/25 bg-[#f36b78]/10 text-[#ff96a0]",
  "확인 중": "border-[#f2b84b]/25 bg-[#f2b84b]/10 text-[#ffd16b]",
  모니터링: "border-[#55b8f6]/25 bg-[#55b8f6]/10 text-[#86ceff]",
  해제: "border-[#31c7a2]/25 bg-[#31c7a2]/10 text-[#65ddbf]",
};

const dispositionStyle: Record<DispositionAction, string> = {
  hold: "border-[#f36b78]/25 bg-[#f36b78]/10 text-[#ff96a0]",
  release: "border-[#31c7a2]/25 bg-[#31c7a2]/10 text-[#65ddbf]",
  fa: "border-[#f2b84b]/25 bg-[#f2b84b]/10 text-[#ffd16b]",
};

const dispositionLabel: Record<DispositionAction, string> = {
  hold: "HOLD",
  release: "RELEASE",
  fa: "FA",
};

type ReleaseStatus = "GO" | "CONDITIONAL" | "HOLD";

const releaseStatusStyle: Record<ReleaseStatus, { border: string; background: string; text: string; dot: string }> = {
  GO: { border: "border-[#31c7a2]/25", background: "bg-[#31c7a2]/10", text: "text-[#6de0c2]", dot: "bg-[#31c7a2]" },
  CONDITIONAL: { border: "border-[#f2b84b]/25", background: "bg-[#f2b84b]/10", text: "text-[#ffd16b]", dot: "bg-[#f2b84b]" },
  HOLD: { border: "border-[#f36b78]/25", background: "bg-[#f36b78]/10", text: "text-[#ff9aa3]", dot: "bg-[#f36b78]" },
};

type RoleLens = "test" | "quality" | "manufacturing";

const ROLE_LENSES: Record<RoleLens, {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  focus: string;
  section: string;
}> = {
  test: {
    label: "P&T Test",
    eyebrow: "TEST ENGINEERING LENS",
    title: "불량을 빠르게 재현하고 양산 기준을 잠급니다.",
    description: "Bin·retest·tester correlation을 먼저 확인해 testability와 제품 기인 불량을 분리합니다.",
    focus: "Bin / Retest · Tester health · Program revision",
    section: "test-ops",
  },
  quality: {
    label: "Quality / QE",
    eyebrow: "QUALITY ENGINEERING LENS",
    title: "출하 판단에 필요한 증거와 책임을 한 줄로 연결합니다.",
    description: "Release gate, LOT disposition, FA evidence를 묶어 HOLD·RELEASE·FA의 근거를 남깁니다.",
    focus: "Release gate · LOT disposition · RCA evidence",
    section: "defects",
  },
  manufacturing: {
    label: "Manufacturing",
    eyebrow: "MANUFACTURING LENS",
    title: "수율·Capacity·교대 실행을 동시에 안정화합니다.",
    description: "FPY만 올리는 조치가 아니라 UPH·utilization·TAT와 다음 교대의 exit criteria까지 확인합니다.",
    focus: "FPY · UPH · Utilization · Shift handoff",
    section: "test-ops",
  },
};

type ScenarioSettings = {
  caseLabel: string;
  product: string;
  stage: "PACKAGE" | "TEST";
  programRev: string;
  tatTarget: string;
  window: string;
  signal: string;
  signalDetail: string;
  targetYield: number;
  dppmLimit: number;
  retestTarget: number;
  latestYield: number;
  activeFpy: number;
  activeDppm: number;
  activeRetestRecovery: number;
  topDefectShare: number;
};

type ScenarioSettingsMap = Record<ScenarioKey, ScenarioSettings>;

const SETTINGS_STORAGE_KEY = "yieldscope:pnt-scenario-settings:v1";

const DEFAULT_SCENARIO_SETTINGS: ScenarioSettingsMap = {
  stacker: {
    caseLabel: "Stacker 정렬 편차",
    product: "Stacked-M8",
    stage: "PACKAGE",
    programRev: "FT-M8-042",
    tatTarget: "≤ 18 h",
    window: "2026.08.05—08.18",
    signal: "Stack 공정 이후 Open / High-R 불량이 기준 대비 3.6배 높습니다.",
    signalDetail: "STK-03과 야간 Shift의 4개 LOT에 손실의 71%가 집중되었습니다.",
    targetYield: 97,
    dppmLimit: 15000,
    retestTarget: 60,
    latestYield: 97.34,
    activeFpy: 98.07,
    activeDppm: 19300,
    activeRetestRecovery: 63,
    topDefectShare: 47,
  },
  socket: {
    caseLabel: "Socket False Reject",
    product: "HBM-Socket evaluation lot",
    stage: "TEST",
    programRev: "FT-HBM-118",
    tatTarget: "≤ 12 h",
    window: "2026.07.22—08.04",
    signal: "SCK-07에서 최초 Fail의 76%가 alternate socket 재검에서 회복됩니다.",
    signalDetail: "패키지 기인 불량보다 contact 저항·오염에 의한 false reject 가능성이 우선입니다.",
    targetYield: 97,
    dppmLimit: 15000,
    retestTarget: 60,
    latestYield: 97.44,
    activeFpy: 97.44,
    activeDppm: 25600,
    activeRetestRecovery: 76,
    topDefectShare: 52,
  },
  muf: {
    caseLabel: "MUF Delamination",
    product: "Stacked-M12",
    stage: "PACKAGE",
    programRev: "FT-M12-205",
    tatTarget: "≤ 24 h",
    window: "2026.06.18—07.02",
    signal: "MUF-24B material lot에서 SAM delamination이 2주 기준 대비 3.9배 증가했습니다.",
    signalDetail: "Floor time 상단과 vacuum 편차가 겹친 3개 LOT에서 신호가 집중됩니다.",
    targetYield: 97,
    dppmLimit: 15000,
    retestTarget: 60,
    latestYield: 98.79,
    activeFpy: 98.63,
    activeDppm: 13700,
    activeRetestRecovery: 22,
    topDefectShare: 43,
  },
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function normalizeScenarioSettings(settings: ScenarioSettings): ScenarioSettings {
  return {
    ...settings,
    caseLabel: settings.caseLabel.trim().slice(0, 80) || "Untitled Case",
    product: settings.product.trim().slice(0, 80) || "Custom product",
    programRev: settings.programRev.trim().slice(0, 40) || "CUSTOM-REV",
    tatTarget: settings.tatTarget.trim().slice(0, 24) || "사용자 기준",
    window: settings.window.trim().slice(0, 40) || "사용자 입력 기간",
    signal: settings.signal.trim().slice(0, 180) || "사용자 품질 신호를 입력해 주세요.",
    signalDetail: settings.signalDetail.trim().slice(0, 240) || "신호가 집중된 LOT·장비·교대 조건을 입력해 주세요.",
    targetYield: clampNumber(settings.targetYield, 0, 100),
    dppmLimit: Math.round(clampNumber(settings.dppmLimit, 0, 1_000_000)),
    retestTarget: clampNumber(settings.retestTarget, 0, 100),
    latestYield: clampNumber(settings.latestYield, 0, 100),
    activeFpy: clampNumber(settings.activeFpy, 0, 100),
    activeDppm: Math.round(clampNumber(settings.activeDppm, 0, 1_000_000)),
    activeRetestRecovery: clampNumber(settings.activeRetestRecovery, 0, 100),
    topDefectShare: clampNumber(settings.topDefectShare, 0, 100),
  };
}

function parseScenarioSettingsMap(value: unknown): ScenarioSettingsMap | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const next = {} as ScenarioSettingsMap;
  for (const key of SCENARIO_ORDER) {
    const item = source[key];
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (
      typeof row.caseLabel !== "string" || typeof row.product !== "string" ||
      (row.stage !== "PACKAGE" && row.stage !== "TEST") || typeof row.programRev !== "string" ||
      typeof row.tatTarget !== "string" || typeof row.window !== "string" || typeof row.signal !== "string" || typeof row.signalDetail !== "string" ||
      !["targetYield", "dppmLimit", "retestTarget", "latestYield", "activeFpy", "activeDppm", "activeRetestRecovery", "topDefectShare"].every((field) => typeof row[field] === "number")
    ) return null;
    next[key] = normalizeScenarioSettings(row as unknown as ScenarioSettings);
  }
  return next;
}

type LotRecord = Scenario["lots"][number];
type CustomLotsMap = Record<ScenarioKey, LotRecord[] | null>;

const LOTS_STORAGE_KEY = "yieldscope:pnt-custom-lots:v1";

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseLotsCsv(csv: string): LotRecord[] | null {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const required = ["lot_id", "product", "tool", "units", "yield_pct", "top_defect", "shift", "status"];
  if (!required.every((field) => headers.includes(field))) return null;
  const indexOf = (field: string) => headers.indexOf(field);
  const allowedStatuses = new Set<LotRecord["status"]>(["격리", "확인 중", "모니터링", "해제"]);
  const rows: LotRecord[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const units = Number(cells[indexOf("units")]);
    const yieldValue = Number(cells[indexOf("yield_pct")]);
    const status = cells[indexOf("status")] as LotRecord["status"];
    const row: LotRecord = {
      id: cells[indexOf("lot_id")] ?? "",
      product: cells[indexOf("product")] ?? "",
      tool: cells[indexOf("tool")] ?? "",
      units,
      yield: yieldValue,
      defect: cells[indexOf("top_defect")] ?? "",
      shift: cells[indexOf("shift")] ?? "",
      status,
    };
    if (!row.id || !row.product || !row.tool || !row.defect || !row.shift || !Number.isFinite(units) || units <= 0 || !Number.isFinite(yieldValue) || yieldValue < 0 || yieldValue > 100 || !allowedStatuses.has(status)) return null;
    rows.push(row);
  }
  return rows.length ? rows : null;
}

function parseCustomLotsMap(value: unknown): CustomLotsMap | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const next = {} as CustomLotsMap;
  for (const key of SCENARIO_ORDER) {
    const rows = source[key];
    if (rows === null) {
      next[key] = null;
      continue;
    }
    if (!Array.isArray(rows)) return null;
    const parsed = rows.map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const status = item.status;
      if (typeof item.id !== "string" || typeof item.product !== "string" || typeof item.tool !== "string" || typeof item.units !== "number" || typeof item.yield !== "number" || typeof item.defect !== "string" || typeof item.shift !== "string" || (status !== "격리" && status !== "확인 중" && status !== "모니터링" && status !== "해제")) return null;
      return { id: item.id, product: item.product, tool: item.tool, units: item.units, yield: item.yield, defect: item.defect, shift: item.shift, status } as LotRecord;
    });
    if (parsed.some((row) => row === null)) return null;
    next[key] = parsed as LotRecord[];
  }
  return next;
}

export function YieldDashboard() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("stacker");
  const [roleLens, setRoleLens] = useState<RoleLens>("test");
  const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettingsMap>(DEFAULT_SCENARIO_SETTINGS);
  const [customLots, setCustomLots] = useState<CustomLotsMap>({ stacker: null, socket: null, muf: null });
  const [draftSettings, setDraftSettings] = useState<ScenarioSettings>(DEFAULT_SCENARIO_SETTINGS.stacker);
  const [dataStudioOpen, setDataStudioOpen] = useState(false);
  const scenario = SCENARIOS[scenarioKey];
  const operations = TEST_OPERATIONS[scenarioKey];
  const controlPlan = TEST_CONTROL_PLANS[scenarioKey];
  const qualification = TEST_PROGRAM_QUALIFICATIONS[scenarioKey];
  const activeSettings = scenarioSettings[scenarioKey];
  const activeLots = customLots[scenarioKey] ?? scenario.lots;
  const [selectedTrend, setSelectedTrend] = useState(scenario.trend.length - 1);
  const [selectedDefect, setSelectedDefect] = useState(scenario.pareto[0].code);
  const [activeFlowStage, setActiveFlowStage] = useState<TestFlowStageKey>("final-test");
  const [selectedBin, setSelectedBin] = useState(operations.bins[0].code);
  const [query, setQuery] = useState("");
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [review, setReview] = useState("");
  const [reviewState, setReviewState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dispositions, setDispositions] = useState<LotDisposition[]>([]);
  const [dispositionBusy, setDispositionBusy] = useState<string | null>(null);
  const [handoffAcknowledged, setHandoffAcknowledged] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsFileRef = useRef<HTMLInputElement>(null);
  const lotsFileRef = useRef<HTMLInputElement>(null);

  function selectScenario(key: ScenarioKey) {
    const nextScenario = SCENARIOS[key];
    setScenarioKey(key);
    setDraftSettings(scenarioSettings[key]);
    setSelectedTrend(nextScenario.trend.length - 1);
    setSelectedDefect(nextScenario.pareto[0].code);
    setActiveFlowStage("final-test");
    setSelectedBin(TEST_OPERATIONS[key].bins[0].code);
    setSelectedLots([]);
    setReview("");
    setReviewState("idle");
    setDispositions([]);
    setHandoffAcknowledged([]);
  }

  function persistScenarioSettings(next: ScenarioSettingsMap) {
    setScenarioSettings(next);
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }

  function persistCustomLots(next: CustomLotsMap) {
    setCustomLots(next);
    window.localStorage.setItem(LOTS_STORAGE_KEY, JSON.stringify(next));
  }

  function saveScenarioSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeScenarioSettings(draftSettings);
    const next = { ...scenarioSettings, [scenarioKey]: normalized };
    persistScenarioSettings(next);
    setDraftSettings(normalized);
    setDataStudioOpen(false);
    setNotice(`${normalized.caseLabel} 설정을 저장했습니다. 분석 지표에 즉시 반영됩니다.`);
  }

  function resetCurrentScenarioSettings() {
    const next = { ...scenarioSettings, [scenarioKey]: DEFAULT_SCENARIO_SETTINGS[scenarioKey] };
    const nextLots = { ...customLots, [scenarioKey]: null };
    persistScenarioSettings(next);
    persistCustomLots(nextLots);
    setDraftSettings(next[scenarioKey]);
    setNotice("현재 Case의 설정과 LOT 데이터를 기본값으로 복원했습니다.");
  }

  function exportScenarioSettings() {
    const payload = JSON.stringify(scenarioSettings, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "yieldscope-pnt-settings.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Case 설정 JSON을 내보냈습니다.");
  }

  async function importScenarioSettings(file: File) {
    try {
      const parsed = parseScenarioSettingsMap(JSON.parse(await file.text()));
      if (!parsed) throw new Error("invalid settings");
      persistScenarioSettings(parsed);
      setDraftSettings(parsed[scenarioKey]);
      setNotice("Case 설정을 불러왔습니다. 모든 지표에 반영했습니다.");
    } catch {
      setNotice("설정 파일을 읽지 못했습니다. Data Studio에서 내보낸 JSON인지 확인해 주세요.");
    }
  }

  async function importLots(file: File) {
    try {
      const parsed = parseLotsCsv(await file.text());
      if (!parsed) throw new Error("invalid lots");
      persistCustomLots({ ...customLots, [scenarioKey]: parsed });
      setSelectedLots([]);
      setNotice(`${parsed.length}개 LOT를 ${activeSettings.caseLabel}에 반영했습니다.`);
    } catch {
      setNotice("LOT CSV를 읽지 못했습니다. 필수 컬럼(lot_id, product, tool, units, yield_pct, top_defect, shift, status)을 확인해 주세요.");
    }
  }

  function handleSettingsFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void importScenarioSettings(file);
  }

  function handleLotsFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void importLots(file);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        searchRef.current?.blur();
        setDataStudioOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = stored ? parseScenarioSettingsMap(JSON.parse(stored)) : null;
      if (parsed) {
        window.setTimeout(() => {
          setScenarioSettings(parsed);
          setDraftSettings(parsed[scenarioKey]);
        }, 0);
      }
    } catch {
      // A malformed local setting must not block the read-only demo view.
    }
  }, [scenarioKey]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOTS_STORAGE_KEY);
      const parsed = stored ? parseCustomLotsMap(JSON.parse(stored)) : null;
      if (parsed) window.setTimeout(() => setCustomLots(parsed), 0);
    } catch {
      // A malformed local LOT file must not block the dashboard.
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let cancelled = false;
    async function loadDispositions() {
      try {
        const response = await fetch(`/api/quality/dispositions?scenario=${scenarioKey}`, { credentials: "include" });
        if (!response.ok) return;
        const data = (await response.json()) as LotDisposition[];
        if (!cancelled) setDispositions(data);
      } catch {
        // The read view remains useful when the API is warming or unavailable.
      }
    }
    void loadDispositions();
    return () => { cancelled = true; };
  }, [scenarioKey]);

  const filteredLots = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return activeLots;
    return activeLots.filter((lot) =>
      [lot.id, lot.product, lot.tool, lot.defect, lot.status]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [activeLots, query]);

  const configuredTrend = useMemo(
    () => scenario.trend.map((point, index) => index === scenario.trend.length - 1 ? { ...point, yield: activeSettings.latestYield } : point),
    [activeSettings.latestYield, scenario.trend],
  );
  const configuredPareto = useMemo(
    () => scenario.pareto.map((item, index) => index === 0 ? { ...item, share: activeSettings.topDefectShare } : item),
    [activeSettings.topDefectShare, scenario.pareto],
  );
  const selectedPoint = configuredTrend[selectedTrend] ?? configuredTrend[configuredTrend.length - 1];
  const baseActiveStage = operations.stages.find((stage) => stage.key === activeFlowStage) ?? operations.stages[3];
  const activeStage = useMemo(
    () => baseActiveStage.key === "final-test"
      ? { ...baseActiveStage, fpy: activeSettings.activeFpy, dppm: activeSettings.activeDppm, retestRecovery: activeSettings.activeRetestRecovery }
      : baseActiveStage,
    [activeSettings.activeDppm, activeSettings.activeFpy, activeSettings.activeRetestRecovery, baseActiveStage],
  );
  const activeBin = operations.bins.find((bin) => bin.code === selectedBin) ?? operations.bins[0];
  const trendMin = Math.min(...configuredTrend.map((point) => point.yield));
  const trendMax = Math.max(...configuredTrend.map((point) => point.yield));
  const targetLineTop = clampNumber(100 - (28 + ((activeSettings.targetYield - trendMin) / Math.max(0.01, trendMax - trendMin)) * 62), 5, 95);
  const maxPareto = Math.max(...scenario.pareto.map((item) => item.count));
  const maxValidation = Math.max(...scenario.validation.series.map((item) => item.value));
  const latestDispositionByLot = useMemo(() => {
    const latest = new Map<string, LotDisposition>();
    for (const item of dispositions) {
      if (!latest.has(item.lot_id)) latest.set(item.lot_id, item);
    }
    return latest;
  }, [dispositions]);

  const releaseReadiness = useMemo(() => {
    const gatePass = controlPlan.gates.filter((gate) => gate.state === "pass").length;
    const gateWatch = controlPlan.gates.filter((gate) => gate.state === "watch").length;
    const gatePending = controlPlan.gates.filter((gate) => gate.state === "pending");
    const holdStages = operations.stages.filter((stage) => stage.status === "hold");
    const attentionAssets = operations.assets.filter((asset) => asset.status !== "정상");
    const blockingAssets = operations.assets.filter((asset) => asset.status === "점검");
    const latestYield = configuredTrend[configuredTrend.length - 1]?.yield ?? 0;
    const yieldState = latestYield >= activeSettings.targetYield ? "pass" as const : latestYield >= activeSettings.targetYield - 0.5 ? "watch" as const : "pending" as const;
    const dppmState = activeStage.dppm <= activeSettings.dppmLimit ? "pass" as const : activeStage.dppm <= activeSettings.dppmLimit * 1.2 ? "watch" as const : "pending" as const;
    const score = Math.max(
      0,
      Math.round(((gatePass + gateWatch * 0.55) / controlPlan.gates.length) * 100 - holdStages.length * 12 - blockingAssets.length * 10 - (yieldState === "pending" ? 8 : yieldState === "watch" ? 3 : 0) - (dppmState === "pending" ? 6 : dppmState === "watch" ? 2 : 0)),
    );
    const status: ReleaseStatus = gatePending.length > 0 || holdStages.length > 0 || blockingAssets.length > 0 || yieldState === "pending" || dppmState === "pending"
      ? "HOLD"
      : gateWatch > 0 || attentionAssets.length > 0 || yieldState === "watch" || dppmState === "watch"
        ? "CONDITIONAL"
        : "GO";
    const checks = [
      { label: "Yield target", value: `${latestYield.toFixed(2)}% / ${activeSettings.targetYield.toFixed(2)}%`, state: yieldState },
      { label: "Final Test DPPM", value: `${activeStage.dppm.toLocaleString()} / ${activeSettings.dppmLimit.toLocaleString()}`, state: dppmState },
      ...controlPlan.gates.map((gate) => ({ label: gate.label, value: gate.value, state: gate.state })),
      { label: "Flow health", value: holdStages.length > 0 ? `${holdStages[0].label} stage hold` : "No stage hold", state: holdStages.length > 0 ? "pending" as const : "pass" as const },
      { label: "Tester / socket", value: blockingAssets.length > 0 ? `${blockingAssets[0].id} 점검 필요` : attentionAssets.length > 0 ? `${attentionAssets.length}개 자산 주의` : "All assets normal", state: blockingAssets.length > 0 ? "pending" as const : attentionAssets.length > 0 ? "watch" as const : "pass" as const },
    ];
    const nextAction = yieldState === "pending"
      ? `Yield target ${activeSettings.targetYield.toFixed(2)}% 미달 · 원인 재현 및 조치 후 재검`
      : dppmState === "pending"
        ? `Final Test DPPM ${activeSettings.dppmLimit.toLocaleString()} 초과 · Bin / tester correlation 확인`
        : gatePending[0]
      ? `${gatePending[0].label} 확인 후 Test QE 승인`
      : holdStages[0]
        ? `${holdStages[0].label}의 HOLD 원인 재현 및 교차 확인`
        : attentionAssets[0]
          ? `${attentionAssets[0].id} PM / 상태 확인 후 correlation 재검`
          : "다음 LOT의 golden sample과 TAT를 함께 확인";
    return { score, status, checks, nextAction, gatePass, gateWatch, gatePending: gatePending.length, holdStages: holdStages.length };
  }, [activeSettings.dppmLimit, activeSettings.targetYield, activeStage, configuredTrend, controlPlan, operations]);

  const testabilityFirst = activeStage.retestRecovery >= activeSettings.retestTarget && !/(package 원인 우선|SAM|물리 분석)/i.test(activeStage.note);
  const testTimeImprovement = ((qualification.baselineTestTime - qualification.candidateTestTime) / qualification.baselineTestTime) * 100;
  const uphImprovement = ((qualification.candidateUph - qualification.baselineUph) / qualification.baselineUph) * 100;
  const siteYieldMean = qualification.siteYields.reduce((sum, site) => sum + site.yield, 0) / qualification.siteYields.length;
  const maxSiteDeviation = Math.max(...qualification.siteYields.map((site) => Math.abs(site.yield - siteYieldMean)));

  const commandCenter = useMemo(() => {
    const attentionLots = activeLots.filter((lot) => lot.status !== "해제");
    const exposureUnits = attentionLots.reduce((sum, lot) => sum + lot.units, 0);
    const yieldGap = activeSettings.latestYield - activeSettings.targetYield;
    const dppmGap = activeStage.dppm - activeSettings.dppmLimit;
    const currentLoopStep = releaseReadiness.status === "GO" ? 4 : releaseReadiness.status === "CONDITIONAL" ? 3 : 2;
    const decisionStatement = releaseReadiness.status === "GO"
      ? "필수 Gate와 Flow가 닫혔습니다. 다음 LOT의 Golden sample과 TAT를 감시하며 투입합니다."
      : releaseReadiness.status === "HOLD"
        ? "Blocker가 남아 있습니다. 영향 LOT를 격리하고 재현·상관성 확인 전에는 투입하지 않습니다."
        : "조건부 투입입니다. Watch 항목의 Owner와 Exit criteria를 다음 교대까지 잠급니다.";
    return { attentionLots: attentionLots.length, exposureUnits, yieldGap, dppmGap, testabilityFirst, currentLoopStep, decisionStatement };
  }, [activeLots, activeSettings.dppmLimit, activeSettings.latestYield, activeSettings.targetYield, activeStage.dppm, releaseReadiness.status, testabilityFirst]);

  const lens = ROLE_LENSES[roleLens];
  const decisionBrief = useMemo(() => {
    const signal = roleLens === "test"
      ? `${activeStage.label} · ${activeStage.dppm.toLocaleString()} DPPM · retest ${activeStage.retestRecovery}%`
      : roleLens === "quality"
        ? `${releaseReadiness.gatePass}/${controlPlan.gates.length} gate pass · ${configuredPareto[0].share}% top defect share`
        : `${activeStage.fpy.toFixed(2)}% FPY · ${activeStage.uph.toLocaleString()} UPH · ${activeStage.utilization}% util.`;
    const signalDetail = roleLens === "test"
      ? `Testability 신호를 먼저 분리합니다. ${activeStage.note}`
      : roleLens === "quality"
        ? `현재 우선 불량은 ${configuredPareto[0].label}입니다. ${activeSettings.signalDetail}`
        : `현재 병목은 ${activeStage.label}입니다. ${operations.focus}`;
    const decision = roleLens === "test"
      ? `${testabilityFirst ? "Testability 우선" : "제품 / Package 원인 우선"} · ${releaseReadiness.status}`
      : roleLens === "quality"
        ? `${releaseReadiness.status} · ${releaseReadiness.score}% readiness`
        : `${activeStage.status === "hold" ? "Stage hold" : activeStage.status === "watch" ? "Watch" : "Stable"} · ${activeStage.loss}`;
    const decisionDetail = roleLens === "test"
      ? `alternate tester/socket 교차 확인 후 ${releaseReadiness.nextAction}`
      : roleLens === "quality"
        ? releaseReadiness.nextAction
        : `다음 교대는 ${operations.handoff[1]?.value ?? "exit criteria"}를 확인하고 ${operations.handoff[2]?.value ?? "안정화 조건"}를 닫습니다.`;
    const owner = roleLens === "test"
      ? `${activeStage.owner} · Test Engineering`
      : roleLens === "quality"
        ? "Test QE · Quality / FA"
        : `${activeStage.owner} · Manufacturing / PE`;
    return { signal, signalDetail, decision, decisionDetail, owner };
  }, [activeSettings.signalDetail, activeStage, configuredPareto, controlPlan.gates.length, operations, releaseReadiness, roleLens, testabilityFirst]);

  const handoffDone = operations.handoff.filter((item) => handoffAcknowledged.includes(`${scenarioKey}:${item.label}`)).length;

  function toggleHandoff(label: string) {
    const key = `${scenarioKey}:${label}`;
    setHandoffAcknowledged((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileNav(false);
  }

  function toggleLot(id: string) {
    setSelectedLots((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        setNotice("LOT 비교는 최대 3개까지 선택할 수 있습니다.");
        return current;
      }
      return [...current, id];
    });
  }

  function exportCsv() {
    const rows = [
      ["lot_id", "product", "tool", "units", "yield_pct", "top_defect", "shift", "status", "latest_disposition"],
      ...filteredLots.map((lot) => [
        lot.id,
        lot.product,
        lot.tool,
        String(lot.units),
        String(lot.yield),
        lot.defect,
        lot.shift,
        lot.status,
        latestDispositionByLot.get(lot.id)?.action ?? "none",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `yieldscope-${scenarioKey}-lots.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("현재 LOT 목록을 CSV로 내보냈습니다.");
  }

  async function saveReview() {
    if (!review.trim() || reviewState === "saving") return;
    setReviewState("saving");
    try {
      const response = await fetch("/api/quality/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scenario: scenarioKey, note: review.trim() }),
      });
      if (requiresSignIn(response)) {
        window.location.href = signInHref();
        return;
      }
      if (!response.ok) throw new Error("save failed");
      setReviewState("saved");
      setNotice("검토 노트를 저장했습니다.");
    } catch {
      setReviewState("error");
    }
  }

  async function createDisposition(lotId: string, action: DispositionAction, defect: string) {
    const busyKey = `${lotId}:${action}`;
    if (dispositionBusy) return;
    setDispositionBusy(busyKey);
    const reason = action === "hold"
      ? `${defect} 원인 재현 및 교차 tester 확인 전 출하 보류`
      : action === "fa"
        ? `${defect} 표본을 FA 의뢰하고 package·die 원인 분리`
        : `${defect} 확인 완료 · golden sample 및 출하 기준 충족`;
    try {
      const response = await fetch("/api/quality/dispositions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scenario: scenarioKey, lot_id: lotId, action, reason, owner: "Test QE" }),
      });
      if (requiresSignIn(response)) {
        window.location.href = signInHref();
        return;
      }
      if (!response.ok) throw new Error("disposition failed");
      const created = (await response.json()) as LotDisposition;
      setDispositions((current) => [created, ...current]);
      setNotice(`${lotId} · ${dispositionLabel[action]} 결정을 감사 로그에 기록했습니다.`);
    } catch {
      setNotice("결정 기록에 실패했습니다. API가 준비된 뒤 다시 시도해 주세요.");
    } finally {
      setDispositionBusy(null);
    }
  }

  return (
    <div className="min-h-screen text-[#edf3fc]">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-[#f2b84b] px-4 py-2 text-sm font-semibold text-[#17110a] focus:translate-y-0"
      >
        본문 바로가기
      </a>

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#08101d]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="메뉴 열기"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav((open) => !open)}
            className="grid size-9 place-items-center rounded-xl border border-white/[0.08] text-[#9aa8bc] lg:hidden"
          >
            {mobileNav ? <X className="size-4" /> : <PanelLeft className="size-4" />}
          </button>

          <button type="button" onClick={() => scrollTo("overview")} className="flex shrink-0 items-center gap-3 text-left">
            <span className="relative grid size-9 place-items-center overflow-hidden rounded-xl border border-[#f2b84b]/35 bg-[#f2b84b]/10 text-[#f2b84b]">
              <CircleDot className="size-[18px]" />
              <span className="absolute inset-x-2 bottom-1 h-px bg-[#31c7a2]" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-[-0.02em]">YieldScope</span>
              <span className="block text-[9px] font-semibold tracking-[0.2em] text-[#7d8ba0]">P&amp;T ENGINEERING OS</span>
            </span>
          </button>

          <label className="ml-2 hidden h-10 max-w-[430px] flex-1 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-sm text-[#7f8ea3] transition focus-within:border-[#f2b84b]/40 focus-within:bg-white/[0.05] md:flex">
            <Search className="size-4 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="LOT, 장비, 불량 코드를 검색하세요"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#dbe4f1] outline-none placeholder:text-[#64738a]"
            />
            {query ? (
              <button type="button" aria-label="검색어 지우기" onClick={() => setQuery("")} className="text-[#718097] hover:text-white"><X className="size-3.5" /></button>
            ) : (
              <kbd className="rounded-md border border-white/10 bg-[#0b1422] px-1.5 py-0.5 text-[9px]">⌘ K</kbd>
            )}
          </label>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 text-[11px] text-[#76859b] xl:flex">
              <span className="size-1.5 rounded-full bg-[#31c7a2] shadow-[0_0_0_3px_rgba(49,199,162,0.09)]" />
              DATA SNAPSHOT · {activeSettings.window}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden h-9 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 text-[11px] font-medium text-[#b8c4d4] transition hover:border-white/20 hover:text-white sm:flex"
            >
              <FileText className="size-3.5" /> 분석 리포트
            </button>
            <button
              type="button"
              onClick={() => { setDraftSettings(activeSettings); setDataStudioOpen(true); }}
              className="hidden h-9 items-center gap-2 rounded-xl border border-[#55b8f6]/20 bg-[#55b8f6]/[0.06] px-3.5 text-[11px] font-medium text-[#b4ddf3] transition hover:border-[#55b8f6]/35 hover:bg-[#55b8f6]/[0.11] sm:flex"
            >
              <Settings2 className="size-3.5" /> 데이터 설정
            </button>
            <span className="rounded-full border border-[#31c7a2]/20 bg-[#31c7a2]/10 px-2.5 py-1.5 text-[10px] font-medium text-[#6ee0c3]">100% 합성 데이터</span>
          </div>
        </div>

        {mobileNav && (
          <nav className="border-t border-white/[0.07] bg-[#09111f] p-3 lg:hidden" aria-label="모바일 내비게이션">
            <div className="grid grid-cols-2 gap-2">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => scrollTo(id)} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-left text-xs text-[#a8b5c7]">
                  <Icon className="size-4 text-[#f2b84b]" /> {label}
                </button>
              ))}
              <button type="button" onClick={() => { setDraftSettings(activeSettings); setDataStudioOpen(true); setMobileNav(false); }} className="flex items-center gap-2 rounded-xl border border-[#55b8f6]/20 bg-[#55b8f6]/[0.06] px-3 py-3 text-left text-xs text-[#b4ddf3]">
                <Settings2 className="size-4 text-[#55b8f6]" /> 데이터 설정
              </button>
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] border-r border-white/[0.065] px-4 py-7 lg:flex lg:flex-col">
          <p className="px-3 text-[9px] font-semibold tracking-[0.18em] text-[#5f6e84]">ENGINEERING FLOW</p>
          <nav className="mt-3 space-y-1" aria-label="분석 단계">
            {NAV.map(({ id, label, icon: Icon }, index) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] transition ${index === 0 ? "bg-[#f2b84b]/10 text-[#ffd470]" : "text-[#8593a8] hover:bg-white/[0.035] hover:text-white"}`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {index === 0 && <span className="ml-auto size-1.5 rounded-full bg-[#f2b84b]" />}
              </button>
            ))}
          </nav>

          <div className="mt-8 px-3">
            <p className="text-[9px] font-semibold tracking-[0.18em] text-[#5f6e84]">ACTIVE CASE</p>
            <div className="mt-3 space-y-2">
              {SCENARIO_ORDER.map((key, index) => {
                const active = key === scenarioKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { selectScenario(key); scrollTo("overview"); }}
                    className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-[#f2b84b]/25 bg-[#f2b84b]/[0.07]" : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.025]"}`}
                  >
                    <span className={`text-[9px] font-semibold tracking-[0.12em] ${active ? "text-[#dcb45e]" : "text-[#5f6e84]"}`}>CASE 0{index + 1}</span>
                    <span className={`mt-1 block truncate text-[11px] font-medium ${active ? "text-[#e8edf5]" : "text-[#8795aa]"}`} title={scenarioSettings[key].caseLabel}>{scenarioSettings[key].caseLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[#bbc6d5]"><Sparkles className="size-3.5 text-[#f2b84b]" /> 해석 가드레일</div>
            <p className="mt-2 text-[10px] leading-5 text-[#66758c]">상관 신호는 원인 확정이 아닙니다. 재현 시험, 물리 분석, 개선 후 검증을 함께 확인하세요.</p>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 px-4 pb-16 pt-7 sm:px-6 lg:px-8 lg:pt-9 xl:px-10">
          <section id="overview" className="scroll-mt-24">
            <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.15em] text-[#f2b84b]">
                  <span className="h-px w-6 bg-[#f2b84b]" /> P&amp;T MASS PRODUCTION INTELLIGENCE
                </div>
                <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">양산 Test를 더 빠르고, 더 정확하게.</h1>
                <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#8391a6] sm:text-sm">Test program release부터 불량 격리, 원인 재현, 생산성 검증까지 연결해 수율·품질·TAT를 한 번에 판단합니다.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[#a7b4c6]">
                  기간
                  <select className="bg-transparent font-medium text-[#e3eaf4] outline-none" defaultValue="30"><option className="bg-[#101a29]" value="30">최근 30일</option><option className="bg-[#101a29]" value="90">최근 90일</option></select>
                </label>
                <span className="max-w-[220px] truncate rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[#a7b4c6]" title={activeSettings.product}>제품군 <strong className="ml-2 font-medium text-[#e3eaf4]">{activeSettings.product}</strong></span>
                <span className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[#a7b4c6]">공정 <strong className="ml-2 font-medium text-[#e3eaf4]">{activeSettings.stage}</strong></span>
                <button type="button" onClick={() => { setQuery(""); setSelectedLots([]); }} className="grid size-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#8b9aaf] transition hover:text-white" aria-label="필터 초기화"><RotateCcw className="size-3.5" /></button>
              </div>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-1 sm:hidden">
              {SCENARIO_ORDER.map((key) => {
                const item = SCENARIOS[key];
                return <button key={key} type="button" onClick={() => selectScenario(key)} className={`shrink-0 rounded-full border px-3 py-2 text-[11px] ${key === scenarioKey ? "border-[#f2b84b]/40 bg-[#f2b84b]/10 text-[#ffd16b]" : "border-white/[0.08] text-[#8593a8]"}`}>{item.shortLabel}</button>;
              })}
            </div>

            <article className="relative mt-7 overflow-hidden rounded-[22px] border border-[#f2b84b]/20 bg-[#0b1422] shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
              <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#f2b84b]/[0.055] blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-1/3 size-64 rounded-full bg-[#31c7a2]/[0.045] blur-3xl" />

              <div className="relative flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="relative grid size-9 place-items-center rounded-xl border border-[#f2b84b]/25 bg-[#f2b84b]/10 text-[#f2b84b]">
                    <Network className="size-4" />
                    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-[#0b1422] bg-[#31c7a2]" />
                  </span>
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.18em] text-[#f2b84b]">P&amp;T SHIFT COMMAND CENTER</p>
                    <p className="mt-1 text-[10px] text-[#6f7f95]">Release · Loss · Exposure · Owner · SLA</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[8px] font-medium tracking-[0.08em] text-[#7d8ca1]">
                  <span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5">{activeSettings.programRev}</span>
                  <span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5">{activeSettings.window}</span>
                  <span className={`rounded-lg border px-2.5 py-1.5 ${customLots[scenarioKey] ? "border-[#55b8f6]/20 bg-[#55b8f6]/[0.07] text-[#a9dcf6]" : "border-[#31c7a2]/20 bg-[#31c7a2]/[0.06] text-[#77d8bf]"}`}>{customLots[scenarioKey] ? "USER LOT DATA" : "SYNTHETIC BASELINE"}</span>
                </div>
              </div>

              <div className="relative grid xl:grid-cols-[minmax(0,1.16fr)_minmax(330px,0.92fr)] 2xl:grid-cols-[minmax(0,1.18fr)_minmax(330px,0.82fr)_minmax(300px,0.78fr)]">
                <section className="border-b border-white/[0.07] p-5 sm:p-6 xl:border-b-0 xl:border-r" aria-labelledby="shift-decision-title">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[8px] font-semibold tracking-[0.15em] text-[#6f7f95]">SHIFT DECISION</p>
                      <h2 id="shift-decision-title" className={`mt-2 text-[29px] font-semibold tracking-[-0.045em] ${releaseStatusStyle[releaseReadiness.status].text}`}>{releaseReadiness.status}</h2>
                      <p className="mt-3 max-w-xl text-[12px] font-medium leading-6 text-[#d4deea]">{commandCenter.decisionStatement}</p>
                    </div>
                    <div className="grid size-[76px] shrink-0 place-items-center rounded-full p-[6px]" style={{ background: `conic-gradient(${releaseReadiness.status === "GO" ? "#31c7a2" : releaseReadiness.status === "HOLD" ? "#f36b78" : "#f2b84b"} ${releaseReadiness.score}%, rgba(255,255,255,0.07) 0)` }} aria-label={`Release readiness ${releaseReadiness.score}%`}>
                      <span className="grid size-full place-items-center rounded-full bg-[#0b1422] text-center"><span><strong className="block text-lg font-semibold tabular-nums text-[#edf3fc]">{releaseReadiness.score}</strong><span className="block text-[7px] tracking-[0.12em] text-[#69788e]">READINESS</span></span></span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <div className="flex items-center gap-2 text-[8px] font-semibold tracking-[0.13em] text-[#75849a]"><Zap className="size-3 text-[#f2b84b]" /> NEXT REQUIRED CHECK</div>
                    <p className="mt-2 text-[11px] leading-5 text-[#c6d2df]">{releaseReadiness.nextAction}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => scrollTo("test-ops")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f2b84b] px-3 py-2 text-[9px] font-semibold text-[#181208] transition hover:bg-[#ffd16b]">Test 조건 확인 <ArrowRight className="size-3" /></button>
                      <button type="button" onClick={() => scrollTo("rca")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.035] px-3 py-2 text-[9px] font-medium text-[#aab8c9] transition hover:border-white/20 hover:text-white">FA 근거 보기</button>
                    </div>
                  </div>
                </section>

                <section className="border-b border-white/[0.07] p-5 sm:p-6 2xl:border-b-0 2xl:border-r" aria-labelledby="loss-exposure-title">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-[8px] font-semibold tracking-[0.15em] text-[#6f7f95]">LOSS &amp; EXPOSURE</p><h2 id="loss-exposure-title" className="mt-1.5 text-[13px] font-semibold text-[#dce5ef]">손실 규모와 원인 방향</h2></div>
                    <span className="rounded-lg border border-[#f36b78]/18 bg-[#f36b78]/[0.06] px-2 py-1 text-[8px] font-medium text-[#ff9aa3]">{commandCenter.attentionLots} LOT ATTENTION</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <CommandMetric label="YIELD GAP" value={`${commandCenter.yieldGap >= 0 ? "+" : ""}${commandCenter.yieldGap.toFixed(2)}%p`} detail={`Target ${activeSettings.targetYield.toFixed(2)}%`} tone={commandCenter.yieldGap >= 0 ? "good" : "alert"} />
                    <CommandMetric label="DPPM GAP" value={`${commandCenter.dppmGap > 0 ? "+" : ""}${commandCenter.dppmGap.toLocaleString()}`} detail={`Limit ${activeSettings.dppmLimit.toLocaleString()}`} tone={commandCenter.dppmGap <= 0 ? "good" : "alert"} />
                    <CommandMetric label="EXPOSED UNITS" value={commandCenter.exposureUnits.toLocaleString()} detail={`${commandCenter.attentionLots} lots · 미해제`} tone={commandCenter.exposureUnits > 0 ? "warn" : "good"} />
                    <CommandMetric label="RETEST BRANCH" value={commandCenter.testabilityFirst ? "TESTABILITY" : "PRODUCT / PKG"} detail={`${activeStage.retestRecovery}% recovery · 기준 ${activeSettings.retestTarget}%`} tone={commandCenter.testabilityFirst ? "warn" : "neutral"} />
                  </div>
                  <p className="mt-3 text-[8px] leading-4 text-[#59697f]">Retest branch는 원인 확정이 아니라 교차 tester/socket 또는 Package FA의 선확인 방향입니다.</p>
                </section>

                <section className="p-5 sm:p-6 xl:col-span-2 2xl:col-span-1" aria-labelledby="action-queue-title">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-semibold tracking-[0.15em] text-[#6f7f95]">NEXT 120 MINUTES</p><h2 id="action-queue-title" className="mt-1.5 text-[13px] font-semibold text-[#dce5ef]">Owner가 보이는 Action queue</h2></div><Timer className="size-4 text-[#31c7a2]" /></div>
                  <div className="mt-4 space-y-2">
                    {operations.handoff.map((item, index) => (
                      <CommandAction key={item.label} label={item.label} value={item.value} owner={index === 0 ? "Shift Leader" : index === 1 ? "Test QE" : "MFG / PE"} sla={index === 0 ? "NOW" : index === 1 ? "+60 MIN" : "+120 MIN"} tone={item.tone} onClick={() => scrollTo(index === 0 ? "defects" : index === 1 ? "test-ops" : "validation")} />
                    ))}
                  </div>
                </section>
              </div>

              <div className="relative flex flex-col gap-4 border-t border-white/[0.07] bg-[#07101c]/55 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 xl:pb-0" aria-label="품질 Control loop">
                  {(["Detect", "Contain", "Reproduce", "Decide", "Verify"] as const).map((step, index) => {
                    const complete = index < commandCenter.currentLoopStep;
                    const active = index === commandCenter.currentLoopStep;
                    return <div key={step} className="flex shrink-0 items-center gap-2"><span className={`grid size-6 place-items-center rounded-full border text-[8px] font-semibold ${complete ? "border-[#31c7a2]/30 bg-[#31c7a2]/10 text-[#6de0c2]" : active ? "border-[#f2b84b]/40 bg-[#f2b84b]/10 text-[#ffd16b]" : "border-white/[0.08] bg-white/[0.025] text-[#5b6a80]"}`}>{complete ? <Check className="size-3" /> : index + 1}</span><span className={`text-[8px] font-medium uppercase tracking-[0.08em] ${active ? "text-[#e6bd68]" : complete ? "text-[#829f9b]" : "text-[#526177]"}`}>{step}</span>{index < 4 && <ArrowRight className="size-3 text-[#35445a]" />}</div>;
                  })}
                </div>
                <p className="shrink-0 text-[8px] text-[#59697f]">ACTIVE CASE · <span className="font-medium text-[#91a0b4]">{activeSettings.caseLabel}</span></p>
              </div>
            </article>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {scenario.kpis.map((kpi) => (
                <article key={kpi.label} className="group rounded-2xl border border-white/[0.075] bg-[#111b2b]/78 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5 hover:border-white/[0.13]">
                  <div className="flex items-center justify-between text-[11px] text-[#7d8ba0]">
                    <span>{kpi.label}</span>
                    <span className={`size-1.5 rounded-full ${kpi.tone === "good" ? "bg-[#31c7a2]" : kpi.tone === "alert" ? "bg-[#f36b78]" : kpi.tone === "warn" ? "bg-[#ff9254]" : "bg-[#59687e]"}`} />
                  </div>
                  <div className="mt-3 flex items-end gap-1.5">
                    <strong className="text-[27px] font-semibold tracking-[-0.045em] tabular-nums">{kpi.value}</strong>
                    {kpi.unit && <span className="mb-1 text-[11px] text-[#7d8ba0]">{kpi.unit}</span>}
                  </div>
                  <p className={`mt-2 text-[10px] ${kpi.tone === "good" ? "text-[#54d7b7]" : kpi.tone === "alert" ? "text-[#ff8e99]" : kpi.tone === "warn" ? "text-[#ffad68]" : "text-[#718097]"}`}>{kpi.delta}</p>
                  <p className="mt-3 border-t border-white/[0.055] pt-3 text-[9px] text-[#56657b] opacity-0 transition group-hover:opacity-100">{kpi.hint}</p>
                </article>
              ))}
            </div>

            <Panel className="mt-4 overflow-hidden">
              <div className="grid gap-5 p-5 sm:p-6 2xl:grid-cols-[minmax(0,1.35fr)_290px]">
                <div>
                  <PanelHeading
                    eyebrow="P&T RELEASE READINESS"
                    title="양산 투입 판단을 근거와 함께 잠급니다"
                    description="수율만 보는 대신 Databook·Golden sample·Tester correlation·Flow health를 동시에 확인합니다."
                    action={<span className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[9px] font-semibold ${releaseStatusStyle[releaseReadiness.status].border} ${releaseStatusStyle[releaseReadiness.status].background} ${releaseStatusStyle[releaseReadiness.status].text}`}><span className={`size-1.5 rounded-full ${releaseStatusStyle[releaseReadiness.status].dot}`} /> {releaseReadiness.score}% readiness</span>}
                  />
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <DataPoint label="PASS GATES" value={`${releaseReadiness.gatePass} / ${controlPlan.gates.length}`} good={releaseReadiness.gatePending === 0} />
                    <DataPoint label="WATCH GATES" value={`${releaseReadiness.gateWatch}`} accent={releaseReadiness.gateWatch > 0} />
                    <DataPoint label="FLOW HOLD" value={`${releaseReadiness.holdStages}`} accent={releaseReadiness.holdStages > 0} />
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {releaseReadiness.checks.map((check) => (
                      <div key={check.label} className={`rounded-xl border p-3 ${check.state === "pass" ? "border-[#31c7a2]/15 bg-[#31c7a2]/[0.035]" : check.state === "watch" ? "border-[#f2b84b]/15 bg-[#f2b84b]/[0.035]" : "border-[#f36b78]/15 bg-[#f36b78]/[0.035]"}`}>
                        <div className="flex items-center justify-between gap-2"><span className="text-[8px] text-[#718097]">{check.label}</span><span className={`size-1.5 rounded-full ${check.state === "pass" ? "bg-[#31c7a2]" : check.state === "watch" ? "bg-[#f2b84b]" : "bg-[#f36b78]"}`} /></div>
                        <p className="mt-2 truncate text-[10px] font-medium text-[#d7e1ec]" title={check.value}>{check.value}</p>
                        <p className={`mt-1 text-[8px] uppercase tracking-[0.1em] ${check.state === "pass" ? "text-[#68ddbf]" : check.state === "watch" ? "text-[#ffd16b]" : "text-[#ff9aa3]"}`}>{check.state}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`flex flex-col justify-between rounded-2xl border p-5 ${releaseStatusStyle[releaseReadiness.status].border} ${releaseStatusStyle[releaseReadiness.status].background}`}>
                  <div>
                    <div className="flex items-center gap-2"><span className={`grid size-9 place-items-center rounded-xl ${releaseStatusStyle[releaseReadiness.status].background} ${releaseStatusStyle[releaseReadiness.status].text}`}>{releaseReadiness.status === "GO" ? <CheckCircle2 className="size-5" /> : releaseReadiness.status === "HOLD" ? <AlertTriangle className="size-5" /> : <ShieldCheck className="size-5" />}</span><div><p className="text-[8px] font-semibold tracking-[0.14em] text-[#79889c]">CURRENT DECISION</p><p className={`mt-1 text-lg font-semibold tracking-[-0.03em] ${releaseStatusStyle[releaseReadiness.status].text}`}>{releaseReadiness.status}</p></div></div>
                    <p className="mt-4 text-[10px] leading-5 text-[#9aa8ba]">{releaseReadiness.status === "GO" ? "필수 gate와 flow 상태가 양산 투입 기준을 충족합니다." : releaseReadiness.status === "HOLD" ? "미완료 gate 또는 stage·장비 blocker가 있어 출하·투입 판단을 보류합니다." : "투입은 가능하지만 watch 항목을 다음 교대 확인 조건으로 남겨야 합니다."}</p>
                  </div>
                  <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#08101d]/35 p-3.5"><p className="text-[8px] font-semibold tracking-[0.12em] text-[#748399]">NEXT REQUIRED CHECK</p><p className="mt-2 text-[10px] leading-5 text-[#d3deea]">{releaseReadiness.nextAction}</p><button type="button" onClick={() => scrollTo("test-ops")} className="mt-3 flex items-center gap-1.5 text-[9px] font-medium text-[#f2b84b] hover:text-[#ffd16b]">Gate 상세 보기 <ArrowRight className="size-3" /></button></div>
                </div>
              </div>
            </Panel>

            <Panel className="mt-4 overflow-hidden border-[#55b8f6]/15 bg-[linear-gradient(115deg,rgba(85,184,246,0.075),rgba(17,27,43,0.82)_48%,rgba(49,199,162,0.045))]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.16em] text-[#8fcbe9]">
                      <Target className="size-3.5" /> {lens.eyebrow}
                    </div>
                    <h2 className="mt-3 text-[20px] font-semibold leading-7 tracking-[-0.035em] text-[#eef4fb] sm:text-[22px]">{lens.title}</h2>
                    <p className="mt-2 text-[11px] leading-5 text-[#8c9bad]">{lens.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#08101d]/45 p-1" role="tablist" aria-label="업무 관점 선택">
                    {(Object.keys(ROLE_LENSES) as RoleLens[]).map((key) => {
                      const active = key === roleLens;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setRoleLens(key)}
                          className={`rounded-lg px-3 py-2 text-[10px] font-medium transition ${active ? "bg-[#f2b84b] text-[#181208] shadow-[0_5px_18px_rgba(242,184,75,0.18)]" : "text-[#8291a6] hover:bg-white/[0.05] hover:text-[#d6e0eb]"}`}
                        >
                          {ROLE_LENSES[key].label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 grid gap-2 md:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.065] bg-[#08101d]/38 p-4">
                    <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-semibold tracking-[0.13em] text-[#6e7e94]">CURRENT SIGNAL</span><span className="size-1.5 rounded-full bg-[#f2b84b]" /></div>
                    <p className="mt-3 text-[13px] font-semibold tracking-[-0.02em] text-[#e3ebf5]">{decisionBrief.signal}</p>
                    <p className="mt-1.5 text-[9px] leading-5 text-[#7e8da2]">{decisionBrief.signalDetail}</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${releaseStatusStyle[releaseReadiness.status].border} ${releaseStatusStyle[releaseReadiness.status].background}`}>
                    <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-semibold tracking-[0.13em] text-[#6e7e94]">DECISION NOW</span><span className={`size-1.5 rounded-full ${releaseStatusStyle[releaseReadiness.status].dot}`} /></div>
                    <p className={`mt-3 text-[13px] font-semibold tracking-[-0.02em] ${releaseStatusStyle[releaseReadiness.status].text}`}>{decisionBrief.decision}</p>
                    <p className="mt-1.5 text-[9px] leading-5 text-[#8b9aac]">{decisionBrief.decisionDetail}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.065] bg-[#08101d]/38 p-4">
                    <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-semibold tracking-[0.13em] text-[#6e7e94]">NEXT OWNER</span><span className="size-1.5 rounded-full bg-[#31c7a2]" /></div>
                    <p className="mt-3 text-[13px] font-semibold tracking-[-0.02em] text-[#e3ebf5]">{decisionBrief.owner}</p>
                    <p className="mt-1.5 text-[9px] leading-5 text-[#7e8da2]">Focus · {lens.focus}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#55b8f6]/12 bg-[#55b8f6]/[0.035] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[9px] leading-5 text-[#8294aa]"><span className="font-medium text-[#a9d8f1]">P&amp;T decision brief</span> · 현재 Case의 합성 신호를 역할별 우선순위로 재정렬한 화면입니다. 최종 출하 승인은 실제 품질 승인선에서 수행합니다.</p>
                  <button type="button" onClick={() => scrollTo(lens.section)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#55b8f6]/20 bg-[#55b8f6]/[0.07] px-3 py-2 text-[9px] font-medium text-[#b8e0f6] transition hover:border-[#55b8f6]/35 hover:bg-[#55b8f6]/[0.12]">{lens.label} 화면 열기 <ArrowRight className="size-3" /></button>
                </div>
              </div>
            </Panel>

            <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.62fr)_minmax(330px,0.8fr)]">
              <Panel className="p-5 sm:p-6">
                <PanelHeading
                  eyebrow={`${activeSettings.window} · ${activeSettings.stage}`}
                  title="Final yield p-chart"
                  description={`일별 최종 수율 · 점선은 사용자 설정 목표선 ${activeSettings.targetYield.toFixed(2)}%`}
                  action={<span className="rounded-lg border border-[#31c7a2]/20 bg-[#31c7a2]/10 px-2.5 py-1 text-[10px] text-[#65ddbf]">조치 후 안정화</span>}
                />
                <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_150px]">
                  <div>
                    <div className="relative h-[230px] overflow-hidden rounded-xl border border-white/[0.055] bg-[#0b1422]/78 px-3 pb-7 pt-4 sm:px-4">
                      {[25, 50, 75].map((line) => <span key={line} className="pointer-events-none absolute inset-x-3 border-t border-white/[0.045] sm:inset-x-4" style={{ top: `${line}%` }} />)}
                      <div className="pointer-events-none absolute inset-x-3 border-t border-dashed border-[#f2b84b]/38 sm:inset-x-4" style={{ top: `${targetLineTop}%` }}><span className="absolute -top-4 right-0 text-[8px] font-medium text-[#b59552]">TARGET {activeSettings.targetYield.toFixed(2)}</span></div>
                      <div className="relative flex h-full items-end gap-1.5 sm:gap-2">
                        {configuredTrend.map((point, index) => {
                          const height = 28 + ((point.yield - trendMin) / Math.max(0.01, trendMax - trendMin)) * 62;
                          const active = index === selectedTrend;
                          return (
                            <button
                              key={`${point.date}-${index}`}
                              type="button"
                              aria-label={`${point.date} 수율 ${point.yield}%`}
                              aria-pressed={active}
                              onClick={() => setSelectedTrend(index)}
                              className="group relative flex h-full min-w-0 flex-1 items-end"
                            >
                              <span className={`absolute inset-x-0 bottom-0 rounded-t-sm transition-all ${active ? "bg-[#f2b84b] shadow-[0_0_18px_rgba(242,184,75,0.25)]" : point.breach ? "bg-[#f36b78]/75 group-hover:bg-[#f36b78]" : "bg-gradient-to-t from-[#1f7772] to-[#35c9a6] group-hover:brightness-125"}`} style={{ height: `${height}%` }} />
                              {active && <span className="absolute inset-x-0 z-10 mx-auto size-2 rounded-full bg-white shadow-[0_0_0_4px_rgba(242,184,75,0.24)]" style={{ bottom: `calc(${height}% - 3px)` }} />}
                              <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] ${active ? "text-[#f2b84b]" : "text-[#526177]"}`}>{index % 2 === 0 ? point.date.slice(3) : ""}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[9px] text-[#627187]">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#31c7a2]" /> 관리 한계 내</span>
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#f36b78]" /> LCL 이탈</span>
                      <span className="flex items-center gap-1.5"><span className="h-px w-3 border-t border-dashed border-[#f2b84b]" /> 목표 {activeSettings.targetYield.toFixed(2)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:content-center">
                    <DataPoint label="선택 일자" value={selectedPoint.date} />
                    <DataPoint label="Final yield" value={`${selectedPoint.yield.toFixed(2)}%`} accent={selectedPoint.breach} />
                    <DataPoint label="투입 LOT" value={`${selectedPoint.lots} lots`} />
                  </div>
                </div>
              </Panel>

              <article className="relative overflow-hidden rounded-2xl border border-[#f2b84b]/20 bg-[linear-gradient(148deg,rgba(242,184,75,0.115),rgba(17,27,43,0.88)_48%)] p-6 sm:p-7">
                <div className="absolute -right-12 -top-12 size-48 rounded-full border border-[#f2b84b]/10" />
                <div className="absolute -right-2 -top-2 size-28 rounded-full border border-[#f2b84b]/10" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.17em] text-[#d4aa53]">ACTIVE QUALITY SIGNAL</p>
                    <p className="mt-2 text-[10px] text-[#7f8da1]">{scenario.eyebrow}</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-xl border border-[#f2b84b]/20 bg-[#f2b84b]/10 text-[#f2b84b]"><AlertTriangle className="size-5" /></span>
                </div>
                <h2 className="relative mt-7 text-xl font-semibold leading-8 tracking-[-0.03em] sm:text-[22px]">{activeSettings.caseLabel} · {activeSettings.signal}</h2>
                <p className="relative mt-4 text-[13px] leading-6 text-[#8997aa]">{activeSettings.signalDetail}</p>

                <div className="relative mt-6 grid grid-cols-4 gap-1.5">
                  {["Detect", "Isolate", "Confirm", "Improve"].map((step, index) => (
                    <div key={step} className="text-center">
                      <div className={`mx-auto grid size-7 place-items-center rounded-full border text-[9px] ${index < 3 ? "border-[#31c7a2]/30 bg-[#31c7a2]/10 text-[#69e0c3]" : "border-[#f2b84b]/30 bg-[#f2b84b]/10 text-[#ffd16b]"}`}>{index < 3 ? <Check className="size-3" /> : "04"}</div>
                      <span className="mt-1.5 block text-[8px] uppercase tracking-[0.08em] text-[#627187]">{step}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => scrollTo("rca")} className="relative mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f2b84b] px-4 py-3 text-[11px] font-semibold text-[#181208] transition hover:bg-[#ffd06a]">근거 체인 열기 <ArrowRight className="size-3.5" /></button>
                <p className="relative mt-3 text-center text-[9px] leading-4 text-[#5d6c82]">검증 전 신호는 기여 요인 후보로만 표시합니다.</p>
              </article>
            </div>
          </section>

          <section id="test-ops" className="scroll-mt-24 pt-10">
            <SectionHeader number="02" title="Test Operations" description="Test program qualification과 Wafer·Package·Final Test 손실을 연결해 품질과 생산성을 함께 release합니다." />

            <Panel className="mt-5 overflow-hidden p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <PanelHeading eyebrow="TEST RELEASE CONTROL" title="양산 투입 전 Test Plan을 잠그는 화면" description="Databook / margin test → golden sample → tester correlation → 승인 기록의 순서로 release gate를 확인합니다." action={<span className="flex items-center gap-1.5 rounded-lg border border-[#55b8f6]/20 bg-[#55b8f6]/[0.06] px-2.5 py-1 text-[9px] text-[#a5d8f4]"><ShieldCheck className="size-3" /> controlled plan</span>} />
                <div className="grid grid-cols-2 gap-2 text-[9px] sm:grid-cols-4"><PlanMeta label="PRODUCT" value={activeSettings.product} /><PlanMeta label="STAGE" value={activeSettings.stage === "PACKAGE" ? "Package + Final Test" : "Final Test"} /><PlanMeta label="PROGRAM" value={activeSettings.programRev} /><PlanMeta label="TAT TARGET" value={activeSettings.tatTarget} /></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0b1422]/65 p-3.5"><GitBranch className="size-3.5 text-[#f2b84b]" /><span className="text-[9px] font-semibold tracking-[0.08em] text-[#8998ac]">CONTROLLED FLOW</span><span className="text-[10px] text-[#d3deea]">{controlPlan.flow}</span><span className="ml-auto rounded-md bg-white/[0.04] px-2 py-1 text-[8px] text-[#728198]">{controlPlan.specProfile}</span></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {controlPlan.gates.map((gate) => <div key={gate.label} className={`rounded-xl border p-3 ${gate.state === "pass" ? "border-[#31c7a2]/15 bg-[#31c7a2]/[0.04]" : gate.state === "watch" ? "border-[#f2b84b]/15 bg-[#f2b84b]/[0.04]" : "border-white/[0.07] bg-white/[0.018]"}`}><div className="flex items-center justify-between gap-2"><span className="text-[8px] text-[#718097]">{gate.label}</span><span className={`size-1.5 rounded-full ${gate.state === "pass" ? "bg-[#31c7a2]" : gate.state === "watch" ? "bg-[#f2b84b]" : "bg-[#69788e]"}`} /></div><p className="mt-2 text-[10px] font-medium text-[#d7e1ec]">{gate.value}</p><p className={`mt-1 text-[8px] uppercase tracking-[0.1em] ${gate.state === "pass" ? "text-[#68ddbf]" : gate.state === "watch" ? "text-[#ffd16b]" : "text-[#76859a]"}`}>{gate.state}</p></div>)}
              </div>
            </Panel>

            <PackageTestControl />

            <Panel className="mt-4 overflow-hidden border-[#55b8f6]/18 bg-[linear-gradient(135deg,rgba(85,184,246,0.065),rgba(17,27,43,0.82)_42%,rgba(49,199,162,0.035))]">
              <div className="grid xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.12fr)_minmax(270px,0.72fr)]">
                <div className="border-b border-white/[0.07] p-5 sm:p-6 xl:border-b-0 xl:border-r">
                  <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.16em] text-[#8fcbe9]"><TestTube2 className="size-3.5" /> TEST PROGRAM QUALIFICATION</div>
                  <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.03em] text-[#eef4fb]">Baseline과 Candidate를 분리 검증</h3>
                  <p className="mt-2 text-[10px] leading-5 text-[#8392a7]">Program 변경 효과와 제품·Package 손실을 섞지 않고 양산 release 근거를 잠급니다.</p>

                  <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="rounded-xl border border-white/[0.07] bg-[#08101d]/45 p-3"><p className="text-[7px] font-semibold tracking-[0.12em] text-[#627187]">BASELINE</p><p className="mt-2 text-[11px] font-semibold text-[#aebccc]">{qualification.baselineRev}</p></div>
                    <ArrowRight className="size-4 text-[#4f6178]" />
                    <div className="rounded-xl border border-[#55b8f6]/20 bg-[#55b8f6]/[0.06] p-3"><p className="text-[7px] font-semibold tracking-[0.12em] text-[#6faecc]">CANDIDATE</p><p className="mt-2 text-[11px] font-semibold text-[#bde4f8]">{activeSettings.programRev}</p></div>
                  </div>

                  <div className="mt-4"><QualificationDisposition tone={qualification.dispositionTone} label={qualification.disposition} /></div>
                  <p className="mt-3 text-[9px] leading-5 text-[#7d8da2]">{qualification.rationale}</p>
                  <p className="mt-3 rounded-lg border border-white/[0.055] bg-white/[0.02] px-3 py-2 text-[8px] text-[#64748a]">QUAL LOT · {qualification.qualificationLot}</p>
                </div>

                <div className="border-b border-white/[0.07] p-5 sm:p-6 xl:border-b-0 xl:border-r">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-semibold tracking-[0.14em] text-[#66768c]">RELEASE GATES</p><p className="mt-1 text-[10px] text-[#9ba9bb]">품질 손실 없이 바뀌었는가</p></div><span className="text-[8px] text-[#607087]">SPEC LOCKED</span></div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {qualification.gates.map((gate) => <QualificationGate key={gate.label} {...gate} />)}
                  </div>

                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[8px] font-semibold tracking-[0.14em] text-[#66768c]">SITE-TO-SITE YIELD MAP</p><p className="mt-1 text-[8px] text-[#5e6e84]">Mean {siteYieldMean.toFixed(2)}% · max |Δ| {maxSiteDeviation.toFixed(2)}%p</p></div><span className="text-[8px] text-[#607087]">8-SITE PARALLEL</span></div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                      {qualification.siteYields.map((site) => <SiteYieldCell key={site.site} site={site.site} value={site.yield} deviation={Math.abs(site.yield - siteYieldMean)} />)}
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2"><Gauge className="size-4 text-[#31c7a2]" /><div><p className="text-[8px] font-semibold tracking-[0.14em] text-[#66768c]">PRODUCTIVITY PROOF</p><p className="mt-1 text-[10px] text-[#9ba9bb]">품질 기준을 지키며 빨라졌는가</p></div></div>
                  <div className="mt-5 space-y-3">
                    <QualificationImpact label="TEST TIME" before={`${qualification.baselineTestTime.toFixed(2)} sec`} after={`${qualification.candidateTestTime.toFixed(2)} sec`} delta={`−${testTimeImprovement.toFixed(1)}%`} />
                    <QualificationImpact label="UPH" before={qualification.baselineUph.toLocaleString()} after={qualification.candidateUph.toLocaleString()} delta={`+${uphImprovement.toFixed(1)}%`} />
                  </div>
                  <div className="mt-4 rounded-xl border border-[#31c7a2]/14 bg-[#31c7a2]/[0.045] p-3.5"><p className="text-[8px] font-semibold tracking-[0.12em] text-[#69d8bb]">ENGINEERING RULE</p><p className="mt-2 text-[9px] leading-5 text-[#74899a]">속도가 좋아져도 correlation·false reject·site 편차 중 하나라도 깨지면 양산 release하지 않습니다.</p></div>
                </div>
              </div>
            </Panel>

            <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
              <Panel className="overflow-hidden p-5 sm:p-6">
                <PanelHeading
                  eyebrow="MASS PRODUCTION TEST FLOW"
                  title="공정 단계별 수율·Capacity"
                  description={operations.focus}
                  action={<span className="rounded-lg border border-[#31c7a2]/20 bg-[#31c7a2]/10 px-2.5 py-1 text-[9px] font-medium text-[#6bdfc1]">{activeSettings.window} · {operations.window.split("·").at(-1)?.trim() ?? "사용자 설정"}</span>}
                />

                <div className="mt-6 grid gap-2 md:grid-cols-5">
                  {operations.stages.map((stage, index) => {
                    const active = stage.key === activeFlowStage;
                    const statusClass = stage.status === "hold" ? "text-[#ff8e99]" : stage.status === "watch" ? "text-[#ffd16b]" : "text-[#68ddbf]";
                    return (
                      <button
                        key={stage.key}
                        type="button"
                        onClick={() => setActiveFlowStage(stage.key)}
                        aria-pressed={active}
                        className={`relative rounded-xl border p-3 text-left transition ${active ? "border-[#f2b84b]/45 bg-[#f2b84b]/[0.09] shadow-[0_0_0_1px_rgba(242,184,75,0.08)]" : "border-white/[0.07] bg-white/[0.018] hover:border-white/[0.15]"}`}
                      >
                        {index < operations.stages.length - 1 && <ArrowRight className="absolute -right-3 top-7 z-10 hidden size-4 text-[#4e6078] md:block" />}
                        <span className="flex items-center justify-between gap-2"><span className={`text-[8px] font-semibold tracking-[0.08em] ${active ? "text-[#ffd16b]" : "text-[#617087]"}`}>0{index + 1}</span><span className={`size-1.5 rounded-full ${stage.status === "hold" ? "bg-[#f36b78]" : stage.status === "watch" ? "bg-[#f2b84b]" : "bg-[#31c7a2]"}`} /></span>
                        <span className="mt-3 block text-[10px] font-semibold text-[#d8e2ee]">{stage.label}</span>
                        <span className="mt-1 block text-[8px] text-[#68778d]">{stage.subtitle}</span>
                        <span className={`mt-3 block text-[11px] font-semibold tabular-nums ${statusClass}`}>{stage.fpy.toFixed(2)}% FPY</span>
                        <span className="mt-1 block text-[8px] text-[#64738a]">{stage.loss} · {stage.owner}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-4 border-t border-white/[0.06] pt-5 lg:grid-cols-[minmax(0,1fr)_190px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-[#55b8f6]/20 bg-[#55b8f6]/[0.07] px-2 py-1 text-[8px] font-semibold tracking-[0.1em] text-[#a2d6f2]">{activeStage.label.toUpperCase()}</span><span className="text-[10px] text-[#8190a5]">{activeStage.note}</span></div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <OpsMetric label="Input" value={activeStage.input.toLocaleString()} unit="pcs" />
                      <OpsMetric label="Tested" value={activeStage.tested.toLocaleString()} unit="pcs" />
                      <OpsMetric label="DPPM" value={activeStage.dppm.toLocaleString()} unit="" alert={activeStage.dppm > activeSettings.dppmLimit} />
                      <OpsMetric label="Retest recovery" value={`${activeStage.retestRecovery}`} unit="%" good={activeStage.retestRecovery >= activeSettings.retestTarget} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-[#0b1422]/65 p-3.5">
                    <p className="text-[8px] font-semibold tracking-[0.1em] text-[#65748a]">CAPACITY SIGNAL</p>
                    <div className="mt-3 flex items-end justify-between gap-3"><span className="text-[22px] font-semibold tracking-[-0.04em] text-[#e4ebf5]">{activeStage.uph.toLocaleString()}</span><span className="pb-1 text-[9px] text-[#78879b]">UPH</span></div>
                    <div className="mt-3 flex items-center justify-between text-[9px]"><span className="text-[#69788e]">Tester utilization</span><span className="font-semibold tabular-nums text-[#cbd6e3]">{activeStage.utilization}%</span></div>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><span className={`block h-full rounded-full ${activeStage.utilization >= 85 ? "bg-[#f2b84b]" : "bg-[#31c7a2]"}`} style={{ width: `${activeStage.utilization}%` }} /></span>
                    <div className="mt-3 flex items-center justify-between text-[9px]"><span className="flex items-center gap-1.5 text-[#69788e]"><Timer className="size-3" /> Test time</span><span className="tabular-nums text-[#cbd6e3]">{activeStage.testTime.toFixed(2)} sec</span></div>
                  </div>
                </div>
              </Panel>

              <Panel className="p-5 sm:p-6">
                <PanelHeading eyebrow="SHIFT HANDOFF" title="다음 교대가 바로 실행할 항목" description="현상 설명보다 containment·확인 조건·종료 기준을 남깁니다." action={<span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[9px] tabular-nums text-[#8492a6]">{handoffDone}/{operations.handoff.length} acknowledged</span>} />
                <div className="mt-5 space-y-3">
                  {operations.handoff.map((item) => (
                    <div key={item.label} className={`rounded-xl border p-3.5 ${item.tone === "alert" ? "border-[#f36b78]/18 bg-[#f36b78]/[0.045]" : item.tone === "warn" ? "border-[#f2b84b]/18 bg-[#f2b84b]/[0.045]" : "border-[#31c7a2]/18 bg-[#31c7a2]/[0.045]"}`}>
                      <div className="flex items-center justify-between gap-3"><span className="text-[8px] font-semibold tracking-[0.12em] text-[#78879c]">{item.label}</span><button type="button" onClick={() => toggleHandoff(item.label)} aria-pressed={handoffAcknowledged.includes(`${scenarioKey}:${item.label}`)} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[8px] transition ${handoffAcknowledged.includes(`${scenarioKey}:${item.label}`) ? "border-[#31c7a2]/20 bg-[#31c7a2]/10 text-[#69dfc2]" : "border-white/[0.08] bg-white/[0.025] text-[#7b8a9e] hover:border-white/[0.16] hover:text-[#cbd6e3]"}`}>{handoffAcknowledged.includes(`${scenarioKey}:${item.label}`) ? <Check className="size-2.5" /> : <CircleDot className="size-2.5" />} {handoffAcknowledged.includes(`${scenarioKey}:${item.label}`) ? "확인됨" : "교대 확인"}</button></div>
                      <p className="mt-2 text-[12px] font-semibold text-[#dce5ef]">{item.value}</p><p className="mt-1 text-[9px] leading-5 text-[#728197]">{item.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[#55b8f6]/14 bg-[#55b8f6]/[0.04] p-3.5 text-[9px] leading-5 text-[#8294aa]"><span className="font-medium text-[#addaf4]">P&amp;T 관점</span> · 수율만 올리는 조치가 아니라 품질·Capacity·재현성의 exit criteria를 같이 닫습니다.</div>
              </Panel>
            </div>

            <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Panel className="overflow-hidden p-5 sm:p-6">
                <PanelHeading eyebrow="BIN &amp; RETEST TRIAGE" title="First fail을 원인 방향으로 분리" description="Retest recovery가 높으면 contact·program testability를 먼저 확인하고, 낮으면 package·die FA로 승격합니다." action={<span className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-1 text-[9px] text-[#8594a9]"><Network className="size-3" /> {activeBin.code} selected</span>} />
                <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="w-full min-w-[580px] border-collapse text-left">
                    <thead><tr className="text-[8px] font-semibold tracking-[0.1em] text-[#59687e]"><th className="bg-white/[0.02] px-3 py-2.5">BIN / FAMILY</th><th className="bg-white/[0.02] px-3 py-2.5 text-right">FIRST FAIL</th><th className="bg-white/[0.02] px-3 py-2.5 text-right">RETEST PASS</th><th className="bg-white/[0.02] px-3 py-2.5 text-right">SHARE</th><th className="bg-white/[0.02] px-3 py-2.5 text-right">DISPOSITION</th></tr></thead>
                    <tbody>
                      {operations.bins.map((bin) => {
                        const active = bin.code === selectedBin;
                        const dispositionClass = bin.disposition === "FA" ? "text-[#ff9aa3] bg-[#f36b78]/10" : bin.disposition === "HOLD" ? "text-[#ffd16b] bg-[#f2b84b]/10" : bin.disposition === "RETEST" ? "text-[#9bd5f3] bg-[#55b8f6]/10" : "text-[#6ddfc3] bg-[#31c7a2]/10";
                        return <tr key={bin.code} className={`cursor-pointer border-t border-white/[0.05] transition hover:bg-white/[0.025] ${active ? "bg-[#f2b84b]/[0.035]" : ""}`} onClick={() => setSelectedBin(bin.code)}><td className="px-3 py-3"><span className="block text-[10px] font-semibold text-[#d8e2ee]">{bin.code} · {bin.label}</span><span className="mt-1 block text-[8px] tracking-[0.08em] text-[#64738a]">{bin.family}</span></td><td className="px-3 py-3 text-right text-[10px] tabular-nums text-[#b7c4d4]">{bin.firstFail}</td><td className="px-3 py-3 text-right text-[10px] font-semibold tabular-nums text-[#d8e2ee]">{bin.retestPass}%</td><td className="px-3 py-3 text-right text-[10px] tabular-nums text-[#8796aa]">{bin.share}%</td><td className="px-3 py-3 text-right"><span className={`inline-flex rounded-md px-1.5 py-1 text-[8px] font-semibold ${dispositionClass}`}>{bin.disposition}</span></td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3.5"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#f2b84b]/10 text-[#ffd16b]"><AlertTriangle className="size-3.5" /></span><div><p className="text-[10px] font-medium text-[#d2dce8]">{activeBin.code} · {activeBin.label}</p><p className="mt-1 text-[9px] leading-5 text-[#718097]">{activeBin.note} · 현재 우선 판정은 <span className="font-medium text-[#cbd7e4]">{activeBin.disposition}</span>입니다.</p></div></div>
              </Panel>

              <Panel className="overflow-hidden p-5 sm:p-6">
                <PanelHeading eyebrow="TESTER / SOCKET HEALTH" title="장비 조건이 수율을 흔드는지 확인" description="Program revision·socket cycle·contact resistance·PM due를 같은 화면에서 교차 확인합니다." action={<span className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-1 text-[9px] text-[#8594a9]"><Wrench className="size-3" /> live snapshot</span>} />
                <div className="mt-5 space-y-2.5">
                  {operations.assets.map((asset) => (
                    <div key={asset.id} className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`grid size-7 place-items-center rounded-lg ${asset.status === "점검" ? "bg-[#f36b78]/10 text-[#ff9ba4]" : asset.status === "주의" ? "bg-[#f2b84b]/10 text-[#ffd16b]" : "bg-[#31c7a2]/10 text-[#67ddbf]"}`}><Cpu className="size-3.5" /></span><div><p className="text-[10px] font-semibold text-[#d8e2ee]">{asset.id}</p><p className="text-[8px] text-[#68778d]">{asset.type} · {asset.program}</p></div></div><span className={`rounded-md px-1.5 py-1 text-[8px] ${asset.status === "점검" ? "bg-[#f36b78]/10 text-[#ff9ba4]" : asset.status === "주의" ? "bg-[#f2b84b]/10 text-[#ffd16b]" : "bg-[#31c7a2]/10 text-[#67ddbf]"}`}>{asset.status}</span></div>
                      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-[9px] sm:grid-cols-4"><span><em className="not-italic text-[#59687e]">Socket</em><strong className="ml-1.5 font-medium text-[#aebdcd]">{asset.socket}</strong></span><span><em className="not-italic text-[#59687e]">Cycle</em><strong className="ml-1.5 font-medium tabular-nums text-[#aebdcd]">{asset.cycles.toLocaleString()}</strong></span><span><em className="not-italic text-[#59687e]">Contact</em><strong className={`ml-1.5 font-medium tabular-nums ${asset.contact > 40 ? "text-[#ff9aa4]" : "text-[#aebdcd]"}`}>{asset.contact ? `${asset.contact} mΩ` : "N/A"}</strong></span><span><em className="not-italic text-[#59687e]">PM</em><strong className={`ml-1.5 font-medium ${asset.pmDue === "D-1" || asset.pmDue === "D-2" ? "text-[#ffd16b]" : "text-[#aebdcd]"}`}>{asset.pmDue}</strong></span></div>
                      <div className="mt-3 flex items-center gap-2"><span className="text-[8px] text-[#5f6e84]">Utilization</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.055]"><span className="block h-full rounded-full bg-[#55b8f6]" style={{ width: `${asset.utilization}%` }} /></span><span className="w-7 text-right text-[8px] tabular-nums text-[#9eacbd]">{asset.utilization}%</span></div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </section>

          <section id="defects" className="scroll-mt-24 pt-10">
            <SectionHeader number="03" title="Defect Explorer" description="불량 구성과 장비 집중도를 함께 보며 손실의 80%를 만드는 구간부터 좁힙니다." />
            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <Panel className="p-5 sm:p-6">
                <PanelHeading eyebrow="DEFECT OCCURRENCES" title="불량 Pareto" description="결함 발생 건수 기준 · 불량품 수와 중복될 수 있음" action={<span className="text-[10px] text-[#6d7c92]">총 {configuredPareto.reduce((sum, item) => sum + item.count, 0).toLocaleString()}건</span>} />
                <div className="mt-6 space-y-3">
                  {configuredPareto.map((item, index) => {
                    const active = item.code === selectedDefect;
                    const cumulative = configuredPareto.slice(0, index + 1).reduce((sum, row) => sum + row.share, 0);
                    return (
                      <button key={item.code} type="button" onClick={() => setSelectedDefect(item.code)} aria-pressed={active} className={`grid w-full grid-cols-[38px_minmax(0,1fr)_44px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${active ? "border-[#f2b84b]/25 bg-[#f2b84b]/[0.055]" : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.02]"}`}>
                        <span className={`grid size-8 place-items-center rounded-lg text-[9px] font-semibold ${active ? "bg-[#f2b84b]/15 text-[#ffd16b]" : "bg-white/[0.04] text-[#6f7e94]"}`}>{item.code}</span>
                        <span className="min-w-0">
                          <span className="flex items-center justify-between gap-3 text-[11px]"><span className={active ? "text-[#e8edf5]" : "text-[#9aa8bb]"}>{item.label}</span><span className="text-[9px] tabular-nums text-[#65748a]">누적 {cumulative}%</span></span>
                          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[0.045]"><span className="block h-full rounded-full transition-all duration-500" style={{ width: `${(item.count / maxPareto) * 100}%`, backgroundColor: item.tone }} /></span>
                        </span>
                        <span className="text-right"><strong className="block text-[12px] tabular-nums text-[#d5deea]">{item.count}</strong><span className="text-[9px] text-[#5f6e84]">{item.share}%</span></span>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel className="p-5 sm:p-6">
                <PanelHeading eyebrow="STRATIFIED RISK" title="공정 · 장비 집중도" description={`${configuredPareto.find((item) => item.code === selectedDefect)?.label ?? "전체"} 기준 층화 비교`} action={<span className="rounded-lg bg-white/[0.04] px-2 py-1 text-[9px] text-[#8492a6]">RR = Risk ratio</span>} />
                <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.06]">
                  <div className="grid grid-cols-[minmax(90px,1fr)_74px_64px_66px] gap-2 bg-white/[0.025] px-3 py-2.5 text-[8px] font-semibold tracking-[0.1em] text-[#59687e]">
                    <span>TOOL / STAGE</span><span className="text-right">DEFECT %</span><span className="text-right">RR</span><span className="text-right">STATE</span>
                  </div>
                  {scenario.tools.map((tool) => (
                    <div key={tool.name} className="grid grid-cols-[minmax(90px,1fr)_74px_64px_66px] items-center gap-2 border-t border-white/[0.05] px-3 py-3 text-[10px] hover:bg-white/[0.02]">
                      <span><strong className="block text-[11px] font-medium text-[#ced8e5]">{tool.name}</strong><span className="text-[8px] text-[#5f6e84]">{tool.stage}</span></span>
                      <span className="text-right tabular-nums text-[#a6b3c4]">{tool.rate.toFixed(2)}</span>
                      <span className={`text-right font-semibold tabular-nums ${tool.risk >= 3 ? "text-[#ff8d98]" : tool.risk >= 1.2 ? "text-[#ffb36f]" : "text-[#68dcc0]"}`}>{tool.risk.toFixed(1)}×</span>
                      <span className="text-right"><span className={`inline-flex rounded-md px-1.5 py-0.5 text-[8px] ${tool.status === "위험" ? "bg-[#f36b78]/10 text-[#ff8d98]" : tool.status === "주의" ? "bg-[#ff9254]/10 text-[#ffb36f]" : "bg-[#31c7a2]/10 text-[#68dcc0]"}`}>{tool.status}</span></span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[#55b8f6]/12 bg-[#55b8f6]/[0.045] p-3 text-[10px] leading-5 text-[#8092aa]">
                  <span className="font-medium text-[#9dcae7]">읽는 법</span> · RR 1.0은 비교 기준과 동일, 3.6×는 해당 조건에서 불량 비율이 3.6배임을 뜻합니다. 인과 확정값은 아닙니다.
                </div>
              </Panel>
            </div>

            <Panel className="mt-4 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#67768b]">LOT WATCHLIST · DISPOSITION</p><h3 className="mt-1 text-sm font-semibold">우선 확인 LOT</h3><p className="mt-1 text-[9px] text-[#68778d]">Hold / Release / FA 결정은 로그인 후 감사 로그에 남습니다.</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedLots.length > 0 && <span className="rounded-lg border border-[#f2b84b]/20 bg-[#f2b84b]/[0.07] px-2.5 py-1.5 text-[9px] text-[#dcb45e]">{selectedLots.length}개 LOT 비교 선택</span>}
                  {dispositions.length > 0 && <span className="rounded-lg border border-[#55b8f6]/20 bg-[#55b8f6]/[0.06] px-2.5 py-1.5 text-[9px] text-[#a6d7f3]">결정 로그 {dispositions.length}건</span>}
                  <button type="button" onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-[9px] text-[#95a3b6] transition hover:text-white"><Download className="size-3" /> CSV 내보내기</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1010px] border-collapse text-left">
                  <thead><tr className="text-[8px] font-semibold tracking-[0.11em] text-[#59687e]">{["COMPARE", "LOT ID", "PRODUCT", "TOOL", "UNITS", "YIELD", "TOP DEFECT", "SHIFT", "STATE", "DISPOSITION"].map((head) => <th key={head} className="bg-white/[0.018] px-4 py-3 first:pl-6">{head}</th>)}</tr></thead>
                  <tbody>
                    {filteredLots.map((lot) => {
                      const checked = selectedLots.includes(lot.id);
                      const latest = latestDispositionByLot.get(lot.id);
                      return (
                        <tr key={lot.id} className={`border-t border-white/[0.05] text-[10px] transition hover:bg-white/[0.02] ${checked ? "bg-[#f2b84b]/[0.025]" : ""}`}>
                          <td className="px-4 py-3.5 pl-6"><button type="button" onClick={() => toggleLot(lot.id)} aria-label={`${lot.id} 비교 선택`} aria-pressed={checked} className={`grid size-4 place-items-center rounded border ${checked ? "border-[#f2b84b] bg-[#f2b84b] text-[#17110a]" : "border-white/15"}`}>{checked && <Check className="size-3" />}</button></td>
                          <td className="px-4 py-3.5 font-medium text-[#d7e0ec]">{lot.id}</td>
                          <td className="px-4 py-3.5 text-[#8290a5]">{lot.product}</td>
                          <td className="px-4 py-3.5 text-[#a9b5c5]">{lot.tool}</td>
                          <td className="px-4 py-3.5 tabular-nums text-[#8290a5]">{lot.units.toLocaleString()}</td>
                          <td className={`px-4 py-3.5 font-medium tabular-nums ${lot.yield < 96.5 ? "text-[#ff8994]" : "text-[#b9c5d5]"}`}>{lot.yield.toFixed(2)}%</td>
                          <td className="px-4 py-3.5 text-[#a9b5c5]">{lot.defect}</td>
                          <td className="px-4 py-3.5 text-[#8290a5]">{lot.shift}</td>
                          <td className="px-4 py-3.5"><span className={`inline-flex rounded-full border px-2 py-1 text-[8px] ${latest ? dispositionStyle[latest.action] : statusStyle[lot.status]}`}>{latest ? dispositionLabel[latest.action] : lot.status}</span></td>
                          <td className="px-4 py-2.5"><div className="flex items-center gap-1.5"><DispositionButton label="Hold" action="hold" lotId={lot.id} busy={dispositionBusy} onClick={() => createDisposition(lot.id, "hold", lot.defect)} /><DispositionButton label="Release" action="release" lotId={lot.id} busy={dispositionBusy} onClick={() => createDisposition(lot.id, "release", lot.defect)} /><DispositionButton label="FA" action="fa" lotId={lot.id} busy={dispositionBusy} onClick={() => createDisposition(lot.id, "fa", lot.defect)} /></div></td>
                        </tr>
                      );
                    })}
                    {filteredLots.length === 0 && <tr><td colSpan={10} className="px-6 py-12 text-center text-xs text-[#66758c]">현재 검색 조건에 맞는 LOT가 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>

          <section id="rca" className="scroll-mt-24 pt-10">
            <SectionHeader number="04" title="RCA Workbench" description="데이터 연관성을 출발점으로, 재현 시험과 물리 분석이 일치할 때만 원인 상태를 승격합니다." />
            <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
              <Panel className="p-5 sm:p-6">
                <PanelHeading eyebrow="CONTRIBUTING FACTORS" title="기여 요인 후보" description="층화 비교 → 교차 재현 → 물리 증거 순으로 신뢰도 계산" />
                <div className="mt-5 space-y-3">
                  {scenario.hypotheses.map((hypothesis) => (
                    <article key={hypothesis.rank} className="rounded-xl border border-white/[0.065] bg-white/[0.018] p-4 transition hover:border-white/[0.11]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-semibold ${hypothesis.rank === 1 ? "bg-[#f2b84b]/12 text-[#ffd16b]" : "bg-white/[0.04] text-[#718097]"}`}>0{hypothesis.rank}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><h3 className="text-[12px] font-semibold text-[#dae3ee]">{hypothesis.title}</h3><StateBadge state={hypothesis.state} /></div>
                          <p className="mt-2 text-[10px] leading-5 text-[#718097]">{hypothesis.evidence}</p>
                          <div className="mt-3 flex items-center gap-3"><span className="text-[9px] font-medium text-[#a5b2c3]">{hypothesis.metric}</span><span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><span className={`block h-full rounded-full ${hypothesis.confidence >= 85 ? "bg-[#31c7a2]" : hypothesis.confidence >= 50 ? "bg-[#f2b84b]" : "bg-[#64748b]"}`} style={{ width: `${hypothesis.confidence}%` }} /></span><span className="text-[9px] tabular-nums text-[#6e7d92]">{hypothesis.confidence}%</span></div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>

              <Panel className="p-5 sm:p-6">
                <PanelHeading eyebrow="EVIDENCE CHAIN" title="FA 증거 체인" description="전기적 확인부터 개선 검증까지의 상태" />
                <div className="mt-6">
                  {scenario.evidence.map((item, index) => (
                    <div key={item.label} className="relative flex gap-3 pb-6 last:pb-0">
                      {index < scenario.evidence.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-14px)] w-px bg-white/[0.08]" />}
                      <span className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full border ${item.status === "done" ? "border-[#31c7a2]/30 bg-[#31c7a2]/10 text-[#64ddbf]" : item.status === "active" ? "border-[#f2b84b]/30 bg-[#f2b84b]/10 text-[#ffd16b]" : "border-white/10 bg-[#111b2b] text-[#66758c]"}`}>{item.status === "done" ? <Check className="size-3" /> : item.status === "active" ? <Zap className="size-3" /> : <Clock3 className="size-3" />}</span>
                      <div className="min-w-0 flex-1 pt-0.5"><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-medium text-[#cdd7e3]">{item.label}</p><span className="text-[9px] font-semibold text-[#91a1b6]">{item.value}</span></div><p className="mt-1 text-[9px] leading-4 text-[#627187]">{item.detail}</p></div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-[#31c7a2]/13 bg-[#31c7a2]/[0.045] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-medium text-[#7ce3c8]"><ShieldCheck className="size-4" /> Confirmed 기준 충족</div>
                  <p className="mt-2 text-[9px] leading-5 text-[#6f8394]">연관 신호, 교차 재현, 물리 분석, 개선 후 효과가 같은 방향으로 일치합니다.</p>
                </div>
              </Panel>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <MethodCard icon={TestTube2} title="1. Stratify" text="장비·재료·Shift·온도 corner별 분모와 불량률을 함께 비교합니다." />
              <MethodCard icon={FlaskConical} title="2. Reproduce" text="다른 tester/socket 또는 조건 split으로 현상을 재현하고 testability를 분리합니다." />
              <MethodCard icon={Microscope} title="3. Corroborate" text="X-ray·SAM·단면 같은 물리 증거와 개선 후 재발 여부로 판단을 닫습니다." />
            </div>
          </section>

          <section id="validation" className="scroll-mt-24 pt-10">
            <SectionHeader number="05" title="Action Validation" description="Containment로 영향을 차단하고, Corrective·Preventive action의 개선 폭과 재발 여부를 검증합니다." />
            <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
              <Panel className="p-5 sm:p-6">
                <PanelHeading
                  eyebrow="BEFORE / AFTER"
                  title={scenario.validation.title}
                  description={`개선 전 4 LOT vs 개선 후 ${scenario.validation.lots} LOT · 단위 %`}
                  action={<span className="flex items-center gap-1.5 rounded-lg border border-[#31c7a2]/20 bg-[#31c7a2]/10 px-2.5 py-1 text-[10px] font-medium text-[#69dfc2]"><TrendingDown className="size-3" /> −{scenario.validation.reduction}%</span>}
                />
                <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_165px]">
                  <div>
                    <div className="relative flex h-[230px] items-end gap-2 rounded-xl border border-white/[0.055] bg-[#0b1422]/78 px-4 pb-8 pt-4">
                      <span className="absolute bottom-8 left-[42%] top-4 border-l border-dashed border-white/[0.1]" />
                      <span className="absolute left-4 top-3 text-[8px] font-medium text-[#f59a76]">BEFORE</span>
                      <span className="absolute left-[45%] top-3 text-[8px] font-medium text-[#5bd9ba]">AFTER</span>
                      {scenario.validation.series.map((item) => (
                        <div key={item.label} className="group relative flex h-full flex-1 items-end">
                          <span className={`w-full rounded-t-sm transition group-hover:brightness-125 ${item.phase === "before" ? "bg-gradient-to-t from-[#8e4652] to-[#f36b78]" : "bg-gradient-to-t from-[#1f7772] to-[#31c7a2]"}`} style={{ height: `${Math.max(10, (item.value / maxValidation) * 85)}%` }} />
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-[#59687e]">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[9px] leading-5 text-[#5f6e84]">개선 효과는 합성 데이터의 단순 전후 비교입니다. 실제 판단에는 충분한 표본과 관리도 안정성 검토가 필요합니다.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:content-center">
                    <DataPoint label="개선 전" value={`${scenario.validation.before.toFixed(2)}%`} accent />
                    <DataPoint label="개선 후" value={`${scenario.validation.after.toFixed(2)}%`} good />
                    <DataPoint label="감소율" value={`${scenario.validation.reduction}%`} good />
                  </div>
                </div>
              </Panel>

              <Panel className="p-5 sm:p-6">
                <PanelHeading eyebrow="CAPA" title="개선 액션" description="차단 → 시정 → 재발 방지 순서" />
                <div className="mt-5 space-y-3">
                  {scenario.actions.map((action, index) => (
                    <article key={action.type} className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4">
                      <div className="flex items-start gap-3">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${index < 2 ? "bg-[#31c7a2]/10 text-[#62ddbd]" : "bg-[#f2b84b]/10 text-[#ffd16b]"}`}>{index < 2 ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}</span>
                        <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[#6c7b91]">{action.type}</span><span className="text-[8px] text-[#56657b]">{action.date}</span></div><p className="mt-1.5 text-[10px] leading-5 text-[#bcc8d8]">{action.title}</p><div className="mt-2 flex items-center gap-2 text-[8px] text-[#68778d]"><span>{action.owner}</span><span>·</span><span>{action.state}</span></div></div>
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.48fr)]">
              <Panel className="p-5 sm:p-6">
                <PanelHeading eyebrow="ENGINEER REVIEW" title="검토 노트" description="로그인한 방문자는 분석 판단과 다음 확인 항목을 저장할 수 있습니다." action={<button type="button" onClick={() => { window.location.href = signInHref(); }} className="flex items-center gap-1.5 text-[9px] text-[#8998ac] hover:text-white"><LogIn className="size-3" /> coders.kr 로그인</button>} />
                <textarea value={review} onChange={(event) => { setReview(event.target.value.slice(0, 500)); setReviewState("idle"); }} placeholder="예: STK-03 교정 효과는 확인됐으나, 야간 Shift 첫 LOT의 golden sample 확인 결과를 2주간 추가 추적한다." className="mt-5 min-h-28 w-full resize-y rounded-xl border border-white/[0.075] bg-[#0b1422]/75 p-4 text-[11px] leading-6 text-[#d5dfeb] outline-none placeholder:text-[#536278] focus:border-[#f2b84b]/35" />
                <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[9px] tabular-nums text-[#5d6c82]">{review.length} / 500</span><button type="button" onClick={saveReview} disabled={!review.trim() || reviewState === "saving" || reviewState === "saved"} className="rounded-xl bg-[#e6b24c] px-4 py-2.5 text-[10px] font-semibold text-[#17110a] transition hover:bg-[#ffd06a] disabled:cursor-not-allowed disabled:opacity-45">{reviewState === "saving" ? "저장 중…" : reviewState === "saved" ? "저장 완료" : "검토 노트 저장"}</button></div>
                {reviewState === "error" && <p role="alert" className="mt-3 text-[9px] text-[#ff8e99]">서버에 연결하지 못했습니다. 배포 후 로그인 상태에서 다시 시도해 주세요.</p>}
              </Panel>

              <Panel className="border-[#55b8f6]/12 bg-[linear-gradient(145deg,rgba(85,184,246,0.06),rgba(17,27,43,0.78))] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-[10px] font-medium text-[#9fd6f5]"><AlertCircle className="size-4" /> Portfolio disclosure</div>
                <p className="mt-4 text-[10px] leading-5 text-[#7d8da3]">공개 기술 자료를 참고한 <strong className="font-medium text-[#b7c4d4]">HBM-inspired 합성 데이터</strong>로 업무 흐름을 재현했습니다. 로그인 사용자의 LOT 결정은 실제 감사 로그 API에 저장됩니다.</p>
                <p className="mt-3 text-[10px] leading-5 text-[#7d8da3]">표시된 수치·임계값·LOT·장비명은 실제 기업의 내부 사양이 아닙니다. 사내 MES·TMS·FA·Databook을 연결하기 전에는 운영 판단에 사용하지 마세요.</p>
              </Panel>
            </div>
          </section>

          <footer className="mt-12 border-t border-white/[0.065] py-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
              <div><div className="flex items-center gap-2 text-[11px] font-semibold"><CircleDot className="size-4 text-[#f2b84b]" /> YieldScope P&amp;T</div><p className="mt-2 max-w-md text-[9px] leading-5 text-[#5f6e84]">반도체 패키지·테스트 품질 분석 역량을 보여주기 위한 포트폴리오 데모. Detect → Isolate → Confirm → Improve.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {METRIC_DEFINITIONS.map(([term, definition]) => <div key={term} className="rounded-lg bg-white/[0.018] px-3 py-2"><span className="text-[8px] font-semibold text-[#8090a5]">{term}</span><p className="mt-1 text-[8px] leading-4 text-[#536278]">{definition}</p></div>)}
              </div>
            </div>
            <div className="mt-7 flex flex-col gap-3 border-t border-white/[0.045] pt-5 text-[8px] text-[#4f5e73] sm:flex-row sm:items-center sm:justify-between"><span>© 2026 YieldScope P&amp;T · Portfolio demo</span><a href="https://coders.kr" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#8290a5]">Hosted on coders.kr <ExternalLink className="size-2.5" /></a></div>
          </footer>
        </main>
      </div>

      {dataStudioOpen && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="data-studio-title">
          <button type="button" aria-label="데이터 설정 닫기" onClick={() => setDataStudioOpen(false)} className="absolute inset-0 cursor-default bg-[#020711]/72 backdrop-blur-[2px]" />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[470px] flex-col border-l border-white/[0.1] bg-[#0a1321] shadow-[-18px_0_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
              <div>
                <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.15em] text-[#8fcbe9]"><Settings2 className="size-3.5" /> DATA STUDIO</div>
                <h2 id="data-studio-title" className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[#eef4fb]">{activeSettings.caseLabel} 설정</h2>
                <p className="mt-1.5 text-[10px] leading-5 text-[#7f8ea4]">팀의 Case·기준값·핵심 Test 지표를 입력하면 화면 전체에 반영됩니다.</p>
              </div>
              <button type="button" onClick={() => setDataStudioOpen(false)} aria-label="데이터 설정 닫기" className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-[#8291a6] transition hover:border-white/[0.18] hover:text-white"><X className="size-4" /></button>
            </div>

            <form onSubmit={saveScenarioSettings} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="rounded-xl border border-[#55b8f6]/15 bg-[#55b8f6]/[0.045] p-3.5 text-[9px] leading-5 text-[#89a9be]">
                  <span className="font-medium text-[#b9e1f6]">설정 적용 범위</span> · 현재 Case의 제품 컨텍스트, Release gate 기준, Final Test 핵심값, Pareto 우선순위를 변경합니다. 원본 합성 데이터는 유지되며 언제든 기본값으로 복원할 수 있습니다.
                </div>

                <fieldset>
                  <legend className="text-[9px] font-semibold tracking-[0.13em] text-[#718198]">CASE CONTEXT</legend>
                  <div className="mt-3 space-y-3">
                    <StudioField label="Case 이름" hint="Overview와 Case 목록에 표시">
                      <input value={draftSettings.caseLabel} onChange={(event) => setDraftSettings((current) => ({ ...current, caseLabel: event.target.value }))} className="studio-input" maxLength={80} />
                    </StudioField>
                    <StudioField label="제품군" hint="Test Plan과 상단 필터에 표시">
                      <input value={draftSettings.product} onChange={(event) => setDraftSettings((current) => ({ ...current, product: event.target.value }))} className="studio-input" maxLength={80} />
                    </StudioField>
                    <StudioField label="품질 신호" hint="Active Quality Signal 제목">
                      <textarea value={draftSettings.signal} onChange={(event) => setDraftSettings((current) => ({ ...current, signal: event.target.value }))} className="studio-input min-h-20 resize-y" maxLength={180} />
                    </StudioField>
                    <StudioField label="신호 상세" hint="집중 LOT·장비·교대 조건">
                      <textarea value={draftSettings.signalDetail} onChange={(event) => setDraftSettings((current) => ({ ...current, signalDetail: event.target.value }))} className="studio-input min-h-20 resize-y" maxLength={240} />
                    </StudioField>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <StudioField label="공정 범위">
                        <select value={draftSettings.stage} onChange={(event) => setDraftSettings((current) => ({ ...current, stage: event.target.value as ScenarioSettings["stage"] }))} className="studio-input"><option value="PACKAGE">PACKAGE</option><option value="TEST">TEST</option></select>
                      </StudioField>
                      <StudioField label="Program Rev">
                        <input value={draftSettings.programRev} onChange={(event) => setDraftSettings((current) => ({ ...current, programRev: event.target.value }))} className="studio-input" maxLength={40} />
                      </StudioField>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <StudioField label="분석 기간">
                        <input value={draftSettings.window} onChange={(event) => setDraftSettings((current) => ({ ...current, window: event.target.value }))} className="studio-input" maxLength={40} />
                      </StudioField>
                      <StudioField label="TAT 기준">
                        <input value={draftSettings.tatTarget} onChange={(event) => setDraftSettings((current) => ({ ...current, tatTarget: event.target.value }))} className="studio-input" maxLength={24} />
                      </StudioField>
                    </div>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-[9px] font-semibold tracking-[0.13em] text-[#718198]">RELEASE CRITERIA</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <StudioField label="Yield 목표 (%)" hint="Latest yield 기준"><input type="number" min="0" max="100" step="0.01" value={draftSettings.targetYield} onChange={(event) => setDraftSettings((current) => ({ ...current, targetYield: Number(event.target.value) }))} className="studio-input" /></StudioField>
                    <StudioField label="DPPM 한계" hint="Final Test 기준"><input type="number" min="0" max="1000000" step="100" value={draftSettings.dppmLimit} onChange={(event) => setDraftSettings((current) => ({ ...current, dppmLimit: Number(event.target.value) }))} className="studio-input" /></StudioField>
                    <StudioField label="Retest 목표 (%)" hint="Testability 분기 기준"><input type="number" min="0" max="100" step="1" value={draftSettings.retestTarget} onChange={(event) => setDraftSettings((current) => ({ ...current, retestTarget: Number(event.target.value) }))} className="studio-input" /></StudioField>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-[9px] font-semibold tracking-[0.13em] text-[#718198]">CURRENT TEST SNAPSHOT</legend>
                  <p className="mt-2 text-[9px] leading-5 text-[#718097]">Final Test stage를 선택했을 때 Decision Brief와 운영 카드에 표시할 최신 관측값입니다.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <StudioField label="최신 Yield (%)"><input type="number" min="0" max="100" step="0.01" value={draftSettings.latestYield} onChange={(event) => setDraftSettings((current) => ({ ...current, latestYield: Number(event.target.value) }))} className="studio-input" /></StudioField>
                    <StudioField label="Top defect share (%)"><input type="number" min="0" max="100" step="1" value={draftSettings.topDefectShare} onChange={(event) => setDraftSettings((current) => ({ ...current, topDefectShare: Number(event.target.value) }))} className="studio-input" /></StudioField>
                    <StudioField label="Final Test FPY (%)"><input type="number" min="0" max="100" step="0.01" value={draftSettings.activeFpy} onChange={(event) => setDraftSettings((current) => ({ ...current, activeFpy: Number(event.target.value) }))} className="studio-input" /></StudioField>
                    <StudioField label="Final Test DPPM"><input type="number" min="0" max="1000000" step="100" value={draftSettings.activeDppm} onChange={(event) => setDraftSettings((current) => ({ ...current, activeDppm: Number(event.target.value) }))} className="studio-input" /></StudioField>
                    <StudioField label="Retest recovery (%)"><input type="number" min="0" max="100" step="1" value={draftSettings.activeRetestRecovery} onChange={(event) => setDraftSettings((current) => ({ ...current, activeRetestRecovery: Number(event.target.value) }))} className="studio-input" /></StudioField>
                  </div>
                </fieldset>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-3.5">
                  <p className="text-[9px] font-medium text-[#c5d1df]">팀 간 설정 공유</p>
                  <p className="mt-1 text-[9px] leading-5 text-[#718097]">현재 모든 Case 설정을 JSON으로 내보내거나, 다른 팀이 만든 설정 파일을 불러옵니다.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={exportScenarioSettings} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[9px] font-medium text-[#aab8c9] transition hover:border-white/[0.18] hover:text-white"><Download className="size-3" /> JSON 내보내기</button>
                    <button type="button" onClick={() => settingsFileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[9px] font-medium text-[#aab8c9] transition hover:border-white/[0.18] hover:text-white"><Upload className="size-3" /> JSON 불러오기</button>
                    <input ref={settingsFileRef} type="file" accept="application/json,.json" onChange={handleSettingsFileChange} className="hidden" />
                  </div>
                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <p className="text-[9px] font-medium text-[#c5d1df]">LOT Watchlist 데이터</p>
                    <p className="mt-1 text-[9px] leading-5 text-[#718097]">CSV를 불러오면 현재 Case의 LOT 목록을 교체합니다. 기존 화면의 CSV 내보내기 결과를 그대로 다시 사용할 수 있습니다.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => lotsFileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#f2b84b]/18 bg-[#f2b84b]/[0.05] px-3 py-2 text-[9px] font-medium text-[#ffd16b] transition hover:border-[#f2b84b]/35 hover:bg-[#f2b84b]/[0.1]"><Upload className="size-3" /> LOT CSV 불러오기</button>
                      <span className="text-[8px] text-[#637289]">현재 {activeLots.length}개 LOT · {customLots[scenarioKey] ? "사용자 데이터" : "기본 데이터"}</span>
                      <input ref={lotsFileRef} type="file" accept="text/csv,.csv" onChange={handleLotsFileChange} className="hidden" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-[#09111e] px-5 py-4 sm:px-6">
                <button type="button" onClick={resetCurrentScenarioSettings} className="inline-flex items-center gap-1.5 text-[9px] text-[#8392a7] transition hover:text-[#d2dce8]"><RotateCcw className="size-3" /> 현재 Case 기본값 복원</button>
                <div className="flex items-center gap-2"><button type="button" onClick={() => setDataStudioOpen(false)} className="rounded-lg border border-white/[0.08] px-3.5 py-2.5 text-[10px] font-medium text-[#95a4b6] transition hover:border-white/[0.16] hover:text-white">취소</button><button type="submit" className="rounded-lg bg-[#f2b84b] px-4 py-2.5 text-[10px] font-semibold text-[#181208] transition hover:bg-[#ffd16a]">설정 저장</button></div>
              </div>
            </form>
          </aside>
        </div>
      )}

      {selectedLots.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#f2b84b]/20 bg-[#111a28]/95 p-3 shadow-2xl backdrop-blur-xl">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#f2b84b]/10 text-[#f2b84b]"><Layers3 className="size-4" /></span>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-medium text-[#d6dfeb]">{selectedLots.length}개 LOT 비교 준비</p><p className="truncate text-[8px] text-[#66758c]">{selectedLots.join(" · ")}</p></div>
          <button type="button" onClick={() => setNotice("비교 분석 뷰를 구성했습니다. 선택 LOT의 수율·불량 구성·장비 조건을 나란히 검토할 수 있습니다.")} className="rounded-xl bg-[#f2b84b] px-3 py-2 text-[9px] font-semibold text-[#17110a]">비교 분석</button>
          <button type="button" onClick={() => setSelectedLots([])} aria-label="비교 선택 해제" className="grid size-8 place-items-center text-[#718097] hover:text-white"><X className="size-3.5" /></button>
        </div>
      )}

      {notice && <div role="status" aria-live="polite" className="fixed right-4 top-20 z-[60] max-w-sm rounded-xl border border-white/[0.1] bg-[#151f2e]/96 px-4 py-3 text-[10px] leading-5 text-[#c8d2df] shadow-2xl backdrop-blur-xl">{notice}</div>}
    </div>
  );
}

function DispositionButton({ label, action, lotId, busy, onClick }: { label: string; action: DispositionAction; lotId: string; busy: string | null; onClick: () => void }) {
  const active = busy === `${lotId}:${action}`;
  return <button type="button" onClick={onClick} disabled={Boolean(busy)} aria-label={`${lotId} ${label} 기록`} className={`rounded-md border px-2 py-1 text-[8px] font-medium transition disabled:cursor-wait disabled:opacity-45 ${action === "hold" ? "border-[#f36b78]/18 text-[#ff9aa3] hover:bg-[#f36b78]/10" : action === "release" ? "border-[#31c7a2]/18 text-[#67ddbf] hover:bg-[#31c7a2]/10" : "border-[#f2b84b]/18 text-[#ffd16b] hover:bg-[#f2b84b]/10"}`}>{active ? "…" : label}</button>;
}

function requiresSignIn(response: Response) {
  return response.status === 401 || response.headers.get("content-type")?.includes("text/html");
}

function PlanMeta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/[0.06] bg-white/[0.018] px-3 py-2"><p className="text-[7px] font-semibold tracking-[0.1em] text-[#617087]">{label}</p><p className="mt-1 text-[9px] font-medium text-[#cbd6e3]">{value}</p></div>;
}

function CommandMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "good" | "warn" | "alert" | "neutral" }) {
  const toneClass = tone === "good" ? "text-[#68ddbf]" : tone === "warn" ? "text-[#ffd16b]" : tone === "alert" ? "text-[#ff9aa3]" : "text-[#d6dfeb]";
  return <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.022] p-3"><p className="text-[7px] font-semibold tracking-[0.11em] text-[#617087]">{label}</p><p className={`mt-2 truncate text-[13px] font-semibold tracking-[-0.02em] tabular-nums ${toneClass}`} title={value}>{value}</p><p className="mt-1 truncate text-[8px] text-[#65748a]" title={detail}>{detail}</p></div>;
}

function CommandAction({ label, value, owner, sla, tone, onClick }: { label: string; value: string; owner: string; sla: string; tone: "good" | "warn" | "alert"; onClick: () => void }) {
  const toneClass = tone === "good" ? "bg-[#31c7a2]" : tone === "warn" ? "bg-[#f2b84b]" : "bg-[#f36b78]";
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-white/[0.14] hover:bg-white/[0.04]"><span className={`size-1.5 shrink-0 rounded-full ${toneClass}`} /><span className="min-w-0 flex-1"><span className="block text-[7px] font-semibold uppercase tracking-[0.1em] text-[#617087]">{label}</span><span className="mt-1 block truncate text-[10px] font-medium text-[#d3deea]" title={value}>{value}</span><span className="mt-1 block text-[8px] text-[#66758b]">{owner}</span></span><span className="shrink-0 text-right"><span className="block text-[7px] font-semibold tracking-[0.08em] text-[#8b9aaf]">{sla}</span><ArrowRight className="ml-auto mt-2 size-3 text-[#4f5f75] transition group-hover:translate-x-0.5 group-hover:text-[#f2b84b]" /></span></button>;
}

function QualificationDisposition({ tone, label }: { tone: "good" | "warn" | "alert"; label: string }) {
  const classes = tone === "good" ? "border-[#31c7a2]/25 bg-[#31c7a2]/10 text-[#68ddbf]" : tone === "alert" ? "border-[#f36b78]/25 bg-[#f36b78]/10 text-[#ff9aa3]" : "border-[#f2b84b]/25 bg-[#f2b84b]/10 text-[#ffd16b]";
  return <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[9px] font-semibold tracking-[0.08em] ${classes}`}><span className={`size-1.5 rounded-full ${tone === "good" ? "bg-[#31c7a2]" : tone === "alert" ? "bg-[#f36b78]" : "bg-[#f2b84b]"}`} />{label}</span>;
}

function QualificationGate({ label, value, limit, state }: { label: string; value: string; limit: string; state: QualificationGateState }) {
  const classes = state === "pass" ? "border-[#31c7a2]/15 bg-[#31c7a2]/[0.035]" : state === "fail" ? "border-[#f36b78]/18 bg-[#f36b78]/[0.045]" : "border-[#f2b84b]/18 bg-[#f2b84b]/[0.04]";
  const text = state === "pass" ? "text-[#68ddbf]" : state === "fail" ? "text-[#ff9aa3]" : "text-[#ffd16b]";
  return <div className={`rounded-xl border p-3 ${classes}`}><div className="flex items-center justify-between gap-2"><p className="text-[8px] text-[#718097]">{label}</p><span className={`text-[7px] font-semibold uppercase tracking-[0.1em] ${text}`}>{state}</span></div><p className={`mt-2 text-[13px] font-semibold tabular-nums ${text}`}>{value}</p><p className="mt-1 text-[8px] text-[#617087]">Limit {limit}</p></div>;
}

function SiteYieldCell({ site, value, deviation }: { site: string; value: number; deviation: number }) {
  const classes = deviation > 0.25 ? "border-[#f36b78]/24 bg-[#f36b78]/[0.07] text-[#ff9aa3]" : deviation > 0.15 ? "border-[#f2b84b]/20 bg-[#f2b84b]/[0.055] text-[#ffd16b]" : "border-[#31c7a2]/15 bg-[#31c7a2]/[0.035] text-[#69ddc0]";
  return <div className={`rounded-lg border px-1.5 py-2 text-center ${classes}`}><p className="text-[7px] font-semibold tracking-[0.08em] opacity-70">{site}</p><p className="mt-1 text-[9px] font-semibold tabular-nums">{value.toFixed(2)}</p></div>;
}

function QualificationImpact({ label, before, after, delta }: { label: string; before: string; after: string; delta: string }) {
  return <div className="rounded-xl border border-white/[0.06] bg-[#08101d]/38 p-3.5"><div className="flex items-center justify-between gap-3"><span className="text-[8px] font-semibold tracking-[0.11em] text-[#64738a]">{label}</span><span className="rounded-md bg-[#31c7a2]/10 px-2 py-1 text-[8px] font-semibold text-[#69ddc0]">{delta}</span></div><div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center"><span><span className="block text-[7px] text-[#59687e]">BASE</span><strong className="mt-1 block text-[11px] font-medium tabular-nums text-[#8f9eb1]">{before}</strong></span><ArrowRight className="size-3 text-[#46566c]" /><span><span className="block text-[7px] text-[#5d887f]">CANDIDATE</span><strong className="mt-1 block text-[11px] font-semibold tabular-nums text-[#b7e6d9]">{after}</strong></span></div></div>;
}

function StudioField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="flex items-center justify-between gap-2 text-[9px] font-medium text-[#a9b7c8]"><span>{label}</span>{hint && <span className="text-[8px] font-normal text-[#637289]">{hint}</span>}</span><span className="mt-1.5 block">{children}</span></label>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`rounded-2xl border border-white/[0.075] bg-[#111b2b]/78 shadow-[0_18px_60px_rgba(0,0,0,0.09)] ${className}`}>{children}</article>;
}

function PanelHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div><p className="text-[8px] font-semibold tracking-[0.14em] text-[#617087]">{eyebrow}</p><h2 className="mt-1.5 text-[13px] font-semibold text-[#e4eaf2]">{title}</h2><p className="mt-1 text-[9px] leading-4 text-[#68778d]">{description}</p></div>{action}</div>;
}

function SectionHeader({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex items-start gap-4"><span className="mt-1 text-[9px] font-semibold tracking-[0.12em] text-[#f2b84b]">{number}</span><div><h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-[#748298]">{description}</p></div></div>;
}

function DataPoint({ label, value, accent, good }: { label: string; value: string; accent?: boolean; good?: boolean }) {
  return <div className="rounded-xl border border-white/[0.055] bg-white/[0.022] p-3"><p className="text-[8px] text-[#617087]">{label}</p><p className={`mt-1.5 text-[12px] font-semibold tabular-nums ${accent ? "text-[#ff8e99]" : good ? "text-[#62dbbd]" : "text-[#d6dfeb]"}`}>{value}</p></div>;
}

function OpsMetric({ label, value, unit, good, alert }: { label: string; value: string; unit: string; good?: boolean; alert?: boolean }) {
  return <div className="rounded-xl border border-white/[0.055] bg-white/[0.022] p-3"><p className="text-[8px] text-[#617087]">{label}</p><p className={`mt-1.5 text-[13px] font-semibold tabular-nums ${alert ? "text-[#ff9aa3]" : good ? "text-[#68ddbf]" : "text-[#d6dfeb]"}`}>{value}<span className="ml-1 text-[8px] font-normal text-[#6f7f94]">{unit}</span></p></div>;
}

function StateBadge({ state }: { state: "Suspected" | "Corroborated" | "Confirmed" }) {
  const classes = state === "Confirmed" ? "border-[#31c7a2]/20 bg-[#31c7a2]/10 text-[#67ddbf]" : state === "Corroborated" ? "border-[#f2b84b]/20 bg-[#f2b84b]/10 text-[#e5bc67]" : "border-white/[0.08] bg-white/[0.035] text-[#75849a]";
  return <span className={`rounded-full border px-2 py-0.5 text-[8px] ${classes}`}>{state}</span>;
}

function MethodCard({ icon: Icon, title, text }: { icon: typeof Target; title: string; text: string }) {
  return <article className="rounded-2xl border border-white/[0.065] bg-white/[0.018] p-5"><span className="grid size-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-[#f2b84b]"><Icon className="size-4" /></span><h3 className="mt-4 text-[11px] font-semibold text-[#cdd7e3]">{title}</h3><p className="mt-2 text-[9px] leading-5 text-[#66758c]">{text}</p></article>;
}
