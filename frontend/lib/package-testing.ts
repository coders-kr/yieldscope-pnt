export type PackageProfileKey = "hbm-stack" | "sip-2p5d" | "memory-module" | "utv-wlp";
export type PackageCheckStatus = "미실행" | "PASS" | "WATCH" | "FAIL" | "N/A";
export type PackageCheckScope = "production" | "qualification";

export type PackageCheck = {
  id: string;
  scope: PackageCheckScope;
  stage: string;
  title: string;
  format: string;
  purpose: string;
  required: boolean;
  demo: { status: PackageCheckStatus; result: string; evidence: string };
};

export type PackageProfile = {
  key: PackageProfileKey;
  label: string;
  architecture: string;
  packageTechnology: string;
  summary: string;
  boundary: string;
  checks: PackageCheck[];
};

export type PackageCheckRecord = {
  status: PackageCheckStatus;
  result: string;
  evidence: string;
};

export type PackagePlanState = {
  profile: PackageProfileKey;
  records: Partial<Record<string, PackageCheckRecord>>;
};

export const PACKAGE_PLAN_STORAGE_KEY = "yieldscope.package-test-plan.v1";

export const PACKAGE_PROFILES: PackageProfile[] = [
  {
    key: "hbm-stack",
    label: "HBM 적층 패키지",
    architecture: "TSV · 적층 DRAM · KGSD",
    packageTechnology: "MR-MUF / Advanced MR-MUF 중심",
    summary: "적층 전 입력 품질, 패키지 전기검사, 기능·속도 검증과 샘플 신뢰성 평가를 분리합니다.",
    boundary: "양산 screen과 sample 기반 reliability qualification은 별도 판정합니다. 제품별 Databook, 고객 요구 및 승인된 검증계획이 우선입니다.",
    checks: [
      { id: "hbm-genealogy", scope: "production", stage: "적층 투입 전", title: "KGSD / wafer map 이력 일치", format: "Die genealogy · lot traceability", purpose: "입력 die의 전기 bin, wafer 좌표, 적층 이력 연결 상태를 확인합니다.", required: true, demo: { status: "PASS", result: "샘플 24 / 24 이력 매칭", evidence: "DEMO-TRACE-01 · 합성 데이터" } },
      { id: "hbm-interconnect", scope: "production", stage: "Package Test", title: "DC continuity · open / short", format: "DC parametric · interconnect screen", purpose: "적층 interconnect와 전원·접지 경로의 open, short, 저항성 이상을 선별합니다.", required: true, demo: { status: "PASS", result: "샘플 범위 내 · spec 입력 필요", evidence: "DEMO-DC-02 · 합성 데이터" } },
      { id: "hbm-function", scope: "production", stage: "Final Test", title: "Memory function · I/O timing", format: "Pattern / function · speed bin", purpose: "기능 패턴과 데이터 경로·속도 bin을 제품별 test program 기준으로 검증합니다.", required: true, demo: { status: "PASS", result: "기능 패턴 샘플 통과", evidence: "DEMO-FT-03 · 합성 데이터" } },
      { id: "hbm-thermal", scope: "production", stage: "Characterization", title: "온도 corner · 열 특성 상관", format: "Temperature corner · thermal correlation", purpose: "고적층 패키지의 온도 조건별 기능·타이밍 변화를 확인하고 열 해석/측정과 상관을 봅니다.", required: true, demo: { status: "WATCH", result: "고온 corner 상관 확인 중", evidence: "DEMO-THERM-04 · 합성 데이터" } },
      { id: "hbm-burnin", scope: "production", stage: "Stress screen · 조건 적용 시", title: "Burn-in / TBDI 적용 여부", format: "Screen policy · post-stress retest", purpose: "제품 정책에 burn-in이 지정된 경우 적용 범위와 stress 전후 fail 분류를 확인합니다.", required: false, demo: { status: "N/A", result: "제품별 적용 정책 입력", evidence: "승인된 screen plan 확인 필요" } },
      { id: "hbm-precondition", scope: "qualification", stage: "Reliability qualification", title: "Preconditioning · thermal cycle", format: "Sample stress · post-stress electrical read", purpose: "고객 조립을 모사한 preconditioning 이후 열 cycling에 따른 package·interconnect 변화를 평가합니다.", required: true, demo: { status: "미실행", result: "샘플 수 / 조건 입력", evidence: "Qual plan / 표준 개정판 입력" } },
      { id: "hbm-life", scope: "qualification", stage: "Reliability qualification", title: "수명 / 보관 stress 선택", format: "HTOL 또는 HTSL · 제품 적용성 검토", purpose: "제품 요구와 사용 환경에 맞는 수명 또는 고온 보관 시험을 선택하고 시험 후 전기 특성을 비교합니다.", required: true, demo: { status: "미실행", result: "시험 종류 / 표본 수 입력", evidence: "Qual plan / 고객 기준 입력" } },
      { id: "hbm-package-inspection", scope: "qualification", stage: "FA correlation", title: "X-ray · SAM · 단면 상관", format: "Non-destructive inspection → physical FA", purpose: "비파괴 분석 신호를 전기 불량 위치와 연결하고, 필요한 경우 단면 분석으로 확인합니다.", required: true, demo: { status: "미실행", result: "검사 결과 / 상관 건수 입력", evidence: "FA report ID 입력" } },
    ],
  },
  {
    key: "sip-2p5d",
    label: "2.5D HBM SiP",
    architecture: "HBM + Logic · Silicon interposer",
    packageTechnology: "System-in-Package · partner integration",
    summary: "HBM 단품과 logic/interposer 조립 이후의 연결·기능·열 검증을 SiP 단계로 확장합니다.",
    boundary: "2.5D SiP 조립·검증은 고객/파트너 경계가 포함될 수 있습니다. 데이터 공유, owner, 적용 규격과 책임 경계를 먼저 정하십시오.",
    checks: [
      { id: "sip-genealogy", scope: "production", stage: "SiP 조립 투입 전", title: "HBM / logic 구성 이력 연결", format: "Component genealogy · revision lock", purpose: "HBM, logic die, interposer, substrate의 승인된 구성과 lot 이력을 연결합니다.", required: true, demo: { status: "PASS", result: "구성 샘플 12 / 12 연결", evidence: "DEMO-SIP-01 · 합성 데이터" } },
      { id: "sip-interconnect", scope: "production", stage: "Package / SiP Test", title: "Interposer 경로 open · short", format: "DC continuity · isolation check", purpose: "조립 후 전원/신호 연결과 isolation 이상을 package-level screen 기준으로 확인합니다.", required: true, demo: { status: "미실행", result: "전기 측정값 입력", evidence: "승인된 test spec 입력" } },
      { id: "sip-link", scope: "production", stage: "Final / System Test", title: "HBM ↔ Logic link function", format: "Interface pattern · system-level function", purpose: "실제 SiP 조합에서 memory interface 기능과 고객이 지정한 operating mode를 검증합니다.", required: true, demo: { status: "미실행", result: "기능 / 속도 결과 입력", evidence: "Program / system test log 입력" } },
      { id: "sip-thermal", scope: "production", stage: "Characterization", title: "SiP thermal map 상관", format: "Thermal characterization · simulation correlation", purpose: "SiP 수준의 열 분포와 동작 결과를 비교해 hotspot 및 조건 민감도를 확인합니다.", required: true, demo: { status: "미실행", result: "온도 / 조건 입력", evidence: "측정 또는 해석 report ID 입력" } },
      { id: "sip-mechanical", scope: "qualification", stage: "Package integrity", title: "Warpage · 접합부 검사", format: "Package dimension · X-ray / SAM as applicable", purpose: "조립 구조와 재료 조합에 맞는 변형·접합·박리 확인 항목을 선정합니다.", required: true, demo: { status: "미실행", result: "측정 / 표본 수 입력", evidence: "기준 도면 / FA record 입력" } },
      { id: "sip-reliability", scope: "qualification", stage: "Reliability qualification", title: "SiP-level reliability plan", format: "TC / moisture stress / life test as applicable", purpose: "HBM 단품 결과와 SiP 조립 이후 결과를 구분해 고객·파트너 승인 계획에 따른 sample stress를 관리합니다.", required: true, demo: { status: "미실행", result: "시험 matrix / 표본 수 입력", evidence: "공동 승인 Qual plan 입력" } },
    ],
  },
  {
    key: "memory-module",
    label: "3DS / DDR5 RDIMM",
    architecture: "TSV stacked DRAM · module / PCB",
    packageTechnology: "3DS memory · BGA module assembly",
    summary: "적층 메모리 package 검사에 module 구성, rank 기능, 속도 margin 및 board-level 검증을 더합니다.",
    boundary: "모듈/시스템 검사 범위는 제품 구성과 고객 규격에 따라 달라집니다. HBM package screen과 동일 기준으로 취급하지 않습니다.",
    checks: [
      { id: "mod-config", scope: "production", stage: "Module Test", title: "구성 · rank · 부품 genealogy", format: "BOM / revision / serial traceability", purpose: "적층 DRAM package, PCB 및 모듈 구성·revision의 추적성을 확인합니다.", required: true, demo: { status: "PASS", result: "샘플 20 / 20 구성 일치", evidence: "DEMO-MOD-01 · 합성 데이터" } },
      { id: "mod-function", scope: "production", stage: "Final / Module Test", title: "Address · data · memory function", format: "Pattern coverage · rank / channel function", purpose: "제품에 정의된 주소·데이터 패턴과 rank/channel 동작 범위를 검사합니다.", required: true, demo: { status: "미실행", result: "기능 결과 입력", evidence: "Program log / spec rev 입력" } },
      { id: "mod-speed", scope: "production", stage: "Speed qualification", title: "Speed bin · timing margin", format: "Operating corner · timing characterization", purpose: "고객 speed bin과 제품별 전압·온도 조건에서 동작 여유를 확인합니다.", required: true, demo: { status: "미실행", result: "속도 bin / margin 입력", evidence: "Databook / customer spec 입력" } },
      { id: "mod-thermal", scope: "production", stage: "System characterization", title: "Module thermal / system compatibility", format: "Thermal sensor / system load as applicable", purpose: "모듈 구성과 사용 조건에 맞춰 열 상태와 system-level 동작을 확인합니다.", required: true, demo: { status: "미실행", result: "부하 / 온도 결과 입력", evidence: "Characterization report 입력" } },
      { id: "mod-screen", scope: "production", stage: "Stress screen · 조건 적용 시", title: "Burn-in 적용 정책", format: "Screen policy · post-screen function retest", purpose: "선별 stress 적용 여부와 이후 fail 분류·추적 방식을 승인된 제품 계획에 맞춥니다.", required: false, demo: { status: "N/A", result: "제품별 적용 정책 입력", evidence: "승인된 screen plan 확인 필요" } },
      { id: "mod-reliability", scope: "qualification", stage: "Reliability qualification", title: "Module reliability matrix", format: "Preconditioning · TC · moisture / mechanical tests", purpose: "package와 module board의 적용 환경에 맞는 qualification 항목을 선정하고 stress 후 기능을 확인합니다.", required: true, demo: { status: "미실행", result: "시험 / 표본 수 입력", evidence: "JEDEC/customer plan 개정판 입력" } },
    ],
  },
  {
    key: "utv-wlp",
    label: "UTV · WLP / LAR",
    architecture: "Wafer-level package · early evaluation",
    packageTechnology: "Universal Test Vehicle · look-ahead reliability",
    summary: "신규 package 재료·구조의 초기 평가를 wafer map, 전기 측정, reliability early learning으로 관리합니다.",
    boundary: "개발/qual 단계의 sample 계획입니다. 양산 출하 screen이나 SK hynix 내부 recipe를 의미하지 않습니다.",
    checks: [
      { id: "wlp-map", scope: "production", stage: "Wafer-level Test", title: "Wafer map · die coordinate correlation", format: "Wafer map · edge / center stratification", purpose: "Wafer 단위 측정 결과와 좌표·공정 이력을 묶어 공간 패턴과 표본 누락을 확인합니다.", required: true, demo: { status: "PASS", result: "샘플 map 좌표 연결", evidence: "DEMO-WLP-01 · 합성 데이터" } },
      { id: "wlp-electrical", scope: "production", stage: "WLP electrical test", title: "Electrical continuity · functional screen", format: "Parametric / continuity / function as applicable", purpose: "제품 설계와 test vehicle 구성에 맞춰 wafer-level 전기 항목을 정하고 die 결과와 연결합니다.", required: true, demo: { status: "미실행", result: "측정 항목 / 결과 입력", evidence: "Test vehicle spec 입력" } },
      { id: "wlp-inspection", scope: "production", stage: "Package inspection", title: "WLP 외관 · 결함 map", format: "Optical / X-ray / SAM as applicable", purpose: "구조에 적합한 검사법을 선택하고 전기 fail 좌표 또는 공정 조건과 상관을 확인합니다.", required: true, demo: { status: "미실행", result: "결함 좌표 / 건수 입력", evidence: "Inspection recipe / report ID 입력" } },
      { id: "wlp-material", scope: "qualification", stage: "Material / structure evaluation", title: "신규 재료 · package 구조 평가", format: "UTV sample build · thermal / mechanical characterization", purpose: "양산 적용 전 test vehicle에서 재료·구조 변경의 열·기계 영향과 측정 가능성을 확인합니다.", required: true, demo: { status: "미실행", result: "평가 조건 / 표본 수 입력", evidence: "Engineering plan / material lot 입력" } },
      { id: "wlp-lar", scope: "qualification", stage: "Look-ahead reliability", title: "LAR stress · defect learning", format: "TC / moisture / life stress chosen by plan", purpose: "초기 stress에서 관찰된 결함을 FA로 연결하고, 품질평가 전에 대응·재검증 항목을 닫습니다.", required: true, demo: { status: "미실행", result: "stress 결과 / fail mode 입력", evidence: "LAR report / corrective action 입력" } },
      { id: "wlp-exit", scope: "qualification", stage: "Qualification exit", title: "Countermeasure · repeat build 확인", format: "Before/after sample comparison · exit criteria", purpose: "대책 반영 후 재구성한 sample에서 동일 stress와 전기 검사를 반복해 적용 기준을 승인합니다.", required: true, demo: { status: "미실행", result: "재검증 sample 결과 입력", evidence: "승인된 exit criteria / review record 입력" } },
    ],
  },
];

export function createEmptyPackagePlan(): PackagePlanState {
  return { profile: "hbm-stack", records: {} };
}
