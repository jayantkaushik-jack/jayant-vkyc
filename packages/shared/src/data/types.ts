export const PARTNERS = [
  { id: 'PAISABAZAAR', name: 'Paisabazaar', code: 'PBZ' },
  { id: 'CREDILIO', name: 'Credilio', code: 'CRL' },
  { id: 'NIYO', name: 'Niyo', code: 'NYO' },
  { id: 'ZET', name: 'ZET', code: 'ZET' },
  { id: 'GENERAL', name: 'GENERAL', code: 'SMT' },
] as const;

export type PartnerId = (typeof PARTNERS)[number]['id'];

export const AUDITOR_REJECTION_REASONS = [
  'Face Match Failed',
  'PAN OCR or Verification Failed',
  'Poor Internet Connection',
  'Low or Dim Lighting',
  'Poor Camera Quality',
  'Liveness Check Failed',
  'Signature Mismatch',
  'Location Outside India',
] as const;

export const WEBHOOK_EVENT_TYPES = [
  'CREATE_USER',
  'WEBLINK_GENERATED',
  'CALL_SCHEDULED',
  'CUSTOMER_ARRIVED',
  'LOOKING_FOR_AGENT',
  'CALL_INITIATED',
  'CALL_COMPLETED',
  'AUDITOR_DECISION',
  'DMS_PUSH',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export type AgentStatus = 'online' | 'on_break' | 'offline';
export type AgentDecision = 'approved' | 'rejected' | 'failed';
export type AuditorDecision = 'accepted' | 'rejected' | 'recapture';
export type CallStatusLevel = 'Connected' | 'User Dropped';
export type AgentStatusLevel = 'Approved' | 'Unable to Verify' | 'Rejected';
export type AuditorStatusLevel = 'Approved' | 'Recapture' | 'Rejected' | 'In Review';
export type CustomerStatus = 'New' | 'ETB';
export type NetworkQuality = 'Weak' | 'Average' | 'Strong';

export interface Partner {
  id: PartnerId;
  name: string;
  code: string;
}

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  district: string;
  /** Optional coordinates for geo-fence checks (seeded for demo). */
  lat?: number;
  lng?: number;
}

export type PreviousAttemptDecision = 'Unable to Verify' | 'Call Ended — Incomplete' | 'Rejected';

export interface PreviousAttempt {
  date: string;
  decision: PreviousAttemptDecision;
  reasonCategory: string;
  reason: string;
  agentRemarks?: string;
  agentName: string;
}

export type GeoFenceOutcome = 'radius_pass' | 'pin_pass' | 'rejected';

export interface GeoFenceResult {
  outcome: GeoFenceOutcome;
  distanceCurrentKm: number | null;
  distancePermanentKm: number | null;
  livePin: string;
  matchedPinPrefix?: string;
  message: string;
}

export interface ServiceHoursWindow {
  start: string;
  end: string;
}

export interface ServiceHoursConfig {
  weekday: ServiceHoursWindow;
  weekend_holiday: ServiceHoursWindow;
  excludeNationalHolidays: boolean;
}

export interface VerificationThresholds {
  faceMatchAadhaarMin: number;
  faceMatchPanMin: number;
  nameMatchMin: number;
  /** When true, all liveness answers must be correct. */
  livenessRequireAll: boolean;
  geoFenceRadiusKm: number;
  geoFencePinPrefixEnabled: boolean;
  /** Buffer before hard 72h expiry, in minutes (default 71h50m = 4310). */
  ekycValidityBufferMin: number;
  /** Call answer / reroute window in seconds. */
  callAnswerWindowSec: number;
}

export interface VirtualBackgroundConfig {
  activeUrl: string | null;
  label: string | null;
  changedBy: string | null;
  changedAt: string | null;
}

export interface AuditReallocation {
  id: string;
  caseId: string;
  fromAuditorId: string | null;
  toAuditorId: string;
  byAdminId: string;
  byAdminName: string;
  reason: string;
  at: string;
}

export interface Customer {
  id: string;
  appId: string;
  partnerId: PartnerId;
  name: string;
  phone: string;
  email: string;
  dob: string;
  gender: 'Male' | 'Female';
  fatherName: string;
  currentAddress: Address;
  permanentAddress: Address;
  productType: string;
  customerStatus: CustomerStatus;
  aadhaarLast4: string;
  aadhaarGenerationDate: string;
  panNumber: string;
  language: string;
  asPerAadhaar?: {
    name: string;
    dob: string;
    gender: 'Male' | 'Female';
    address: string;
  };
  panDetails?: {
    firstName: string;
    middleName?: string;
    lastName: string;
    printedName: string;
    fatherName: string;
    panNumber: string;
    dob: string;
    source: 'NSDL' | 'UTIITSL';
    verified: boolean;
  };
  incomeEmployment?: {
    employmentType: 'Salaried' | 'Self Employed';
    occupation: string;
    organization: string;
    annualIncome: number;
    monthlyIncome: number;
  };
  accountDetails?: {
    branch: string;
    status: 'Active' | 'Dormant';
    accountNumber: string;
  };
  callAllocation?: {
    applicantPriority: 'High' | 'Medium' | 'Low';
    redirectLink: string;
  };
  attemptNumber?: number;
  /** @deprecated Prefer previousAttempts — kept for backward-compatible single-row UIs. */
  previousAttempt?: PreviousAttempt;
  /** Up to the two most recent prior VKYC attempts. */
  previousAttempts?: PreviousAttempt[];
  /** Landing geo-fence result when the customer passed (rejected never reaches an agent). */
  geoFenceResult?: GeoFenceResult;
}

export interface AgentSkills {
  languages: string[];
  partners: PartnerId[];
  productCategories: string[];
}

export interface WorkPlanDay {
  day: string;
  officeStart: string;
  officeEnd: string;
  breakStart: string;
  breakEnd: string;
}

export type AutoAnswerOverride = 'inherit' | 'on' | 'off';

export interface Agent {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  dateOfJoining: string;
  manager: string;
  branch: string;
  skills: AgentSkills;
  workPlan: WorkPlanDay[];
  mobile?: string;
  autoAnswerOverride?: AutoAnswerOverride;
}

export interface StaffLeave {
  type: string;
  dates: string;
  status: string;
}

export interface Auditor {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile?: string;
  manager?: string;
  managerId?: string;
  branch?: string;
  vcipAuditTrained?: boolean;
  trainingCompletedAt?: string;
  languages?: string[];
  partnerIds?: PartnerId[];
  productCategories?: string[];
  dailyAuditCapacity?: number;
  workPlan?: WorkPlanDay[];
  leaves?: StaffLeave[];
  canTakeAgentCalls?: boolean;
}

export type AdminRoleTitle = 'Operations Admin' | 'Quality Lead' | 'Super Admin';
export type AdminAccessLevel = 'View only' | 'Manage';

export type AdminModulePermission =
  | 'Dashboard'
  | 'Customers'
  | 'Partner Analytics'
  | 'Rejection & Failure Reasons'
  | 'Productivity'
  | 'Users'
  | 'Configure'
  | 'Reports';

export const ADMIN_MODULE_PERMISSIONS: AdminModulePermission[] = [
  'Dashboard',
  'Customers',
  'Partner Analytics',
  'Rejection & Failure Reasons',
  'Productivity',
  'Users',
  'Configure',
  'Reports',
];

export interface AdminUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile?: string;
  roleTitle: AdminRoleTitle;
  accessLevel: AdminAccessLevel;
  modules: AdminModulePermission[];
  partnerScope: 'all' | PartnerId[];
}

export interface PartnerUser {
  id: string;
  partnerId: PartnerId;
  name: string;
  email: string;
  phone: string;
}

export interface Queue {
  id: string;
  name: string;
  partnerIds: PartnerId[];
  agentIds: string[];
}

export type TopPerformerKpi = 'accuracy' | 'efficiency' | 'csat' | 'aht' | 'approvalRate';

export interface AlertThresholds {
  /** Waiting customers in a queue above which a high-queue alert fires. */
  maxWaitingQueue: number;
  /** Pending audit cases above which a backlog alert fires. */
  maxAuditorBacklog: number;
  /** Minutes with no connected call after which a no-calls alert fires. */
  noCallsIntervalMin: number;
}

export interface AdminConfigState {
  autoAnswer: boolean;
  blockedStates: string[];
  blockedPinCodes: string[];
  maxBreakMinPerDay: number;
  minOnlineHrsPerDay: number;
  thresholds: VerificationThresholds;
  virtualBackground: VirtualBackgroundConfig;
  serviceHours: ServiceHoursConfig;
  /** Configurable thresholds for the dashboard Alerts panel (§5.4.9). */
  alerts: AlertThresholds;
  /** KPI the Top Performer highlight ranks by. */
  topPerformerKpi: TopPerformerKpi;
}

export type DropStage =
  | 'Before connecting'
  | 'Pre-call checks'
  | 'Liveliness'
  | 'Location'
  | 'Face Capture'
  | 'Aadhaar'
  | 'PAN'
  | 'Signature'
  | 'Report';

export const DROP_STAGES: DropStage[] = [
  'Before connecting',
  'Pre-call checks',
  'Liveliness',
  'Location',
  'Face Capture',
  'Aadhaar',
  'PAN',
  'Signature',
  'Report',
];

export interface CallRecord {
  id: string;
  agentId: string;
  customerId: string;
  partnerId: PartnerId;
  timestamp: string;
  routedAt: string;
  answeredAt: string | null;
  answered: boolean;
  durationSec: number;
  customerWaitSec: number;
  agentWaitSec: number;
  reviewTimeSec: number;
  callStatus: CallStatusLevel;
  agentStatus?: AgentStatusLevel;
  auditorDecision?: AuditorStatusLevel;
  agentDecision: AgentDecision;
  auditorDecisionLegacy: AuditorDecision | null;
  auditorReason: string | null;
  auditorRemarks: string | null;
  auditorId: string | null;
  auditorReviewedAt: string | null;
  csatRating: number | null;
  /** Present only when callStatus === 'User Dropped'. Truncation point for activity log. */
  dropStage?: DropStage;
}

export interface JourneyEntry {
  id: string;
  date: string;
  partnerId: PartnerId;
  connected: boolean;
  approved: boolean;
}

export interface WebhookEvent {
  event: WebhookEventType;
  transactionId: string;
  requestId: string;
  agentId?: string;
  agentUserName?: string;
  sessionId: string;
  timeStamp: string;
  payload?: Record<string, unknown>;
}

export interface AttendanceRecord {
  date: string;
  agentId: string;
  loginAt: string;
  logoutAt: string;
  breakIntervals?: Array<{
    start: string;
    end: string;
    durationMin: number;
  }>;
  totalOnlineMin: number;
  totalBreakMin: number;
  idleMin: number;
  adherencePct: number;
}

/** Mirrors AttendanceRecord for auditors — used in analytics KPIs. */
export interface AuditorAttendanceRecord {
  date: string;
  auditorId: string;
  loginAt: string;
  logoutAt: string;
  breakIntervals?: Array<{
    start: string;
    end: string;
    durationMin: number;
  }>;
  totalOnlineMin: number;
  totalBreakMin: number;
  idleMin: number;
  adherencePct: number;
}

export interface AgentStats {
  callsTaken: number;
  approved: number;
  rejected: number;
  failed: number;
  approvalRate: number;
  avgCallTimeSec: number;
  avgWaitSec: number;
  avgReviewSec: number;
  callDropRate: number | null;
  efficiency: number | null;
  accuracy: number;
}

export interface EfficiencyComponent {
  label: string;
  rawValue: string;
  score: number;
  weight: number;
}

export interface EfficiencyScore {
  score: number | null;
  components: EfficiencyComponent[] | null;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type DateRangePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

export interface LivenessAnswer {
  question: string;
  answer: string;
  result: 'Correct' | 'Wrong';
  askedAt?: string;
}

export interface PanOcrData {
  panNumber: string;
  name: string;
  fatherName: string;
  dob: string;
}

export interface CallSession {
  customer: Customer;
  livenessCode: string;
  location: {
    lat: number;
    lng: number;
    city: string;
    state: string;
    pincode: string;
    district: string;
    country: string;
    ip: string;
    distanceCurrentKm: number;
    distancePermanentKm: number;
    plusCode?: string;
    area?: string;
    accuracyMeters?: number;
    address?: string;
  };
  faceMatchAadhaar: number;
  faceMatchPan: number;
}
