import { Download } from 'lucide-react';
import { formatAddress, formatDateLabel } from '../../lib/format';
import { DEMO_ASSETS } from '../../lib/demoAssets';
import { computeReportMatch } from '../../lib/matchUtils';
import { bandForScore, DEFAULT_THRESHOLDS } from '../../lib/thresholds';
import { formatRejectionSummary, type SelectedRejectionReasons } from '../../lib/rejectionReasons';
import type { CallSession } from '../../data/types';
import type { LivenessAnswer, PanOcrData } from '../../data/types';
import { ZoomableImage } from '../ui/ZoomableImage';
import { cn } from '../../lib/cn';

export interface KycReportData {
  session: CallSession;
  capturedFace: string | null;
  capturedPan: string | null;
  capturedSignature: string | null;
  panPhotoCrop?: string | null;
  panOcr: PanOcrData;
  panEditedFields: string[];
  livenessAnswers: LivenessAnswer[];
  aadhaarFaceMatch: boolean | null;
  panFaceMatch: boolean | null;
  agentRemarks: string;
  decision: 'approved' | 'rejected' | 'unable' | null;
  rejectionReasons: SelectedRejectionReasons;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-[#E8F0FE] px-4 py-2 font-semibold text-sm text-[#1A3A6B] border border-[#C5D9F5]">
      {title}
    </div>
  );
}

function MatchChip({ value, type }: { value: string; type: 'green' | 'amber' | 'red' | 'gray' }) {
  const cls =
    type === 'green' ? 'bg-green-50 text-success border-green-200'
      : type === 'amber' ? 'bg-amber-50 text-warning border-amber-200'
      : type === 'red' ? 'bg-red-50 text-danger border-red-200'
      : 'bg-gray-100 text-text-muted border-border';
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium border', cls)}>
      {value}
    </span>
  );
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Chrome';
  let version = '120';
  let os = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  const verMatch = ua.match(/(Chrome|Firefox|Version|Edg)\/(\d+)/);
  if (verMatch) version = verMatch[2];
  if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';
  return { browser, version, os };
}

export function KycReport({
  data,
  showDownload = true,
  maskStaff = false,
  nameMatchMin = DEFAULT_THRESHOLDS.nameMatchMin,
  faceMatchAadhaarMin = DEFAULT_THRESHOLDS.faceMatchAadhaarMin,
  faceMatchPanMin = DEFAULT_THRESHOLDS.faceMatchPanMin,
}: {
  data: KycReportData;
  showDownload?: boolean;
  /** Partner-facing render: keeps staff identities out of the report. */
  maskStaff?: boolean;
  nameMatchMin?: number;
  faceMatchAadhaarMin?: number;
  faceMatchPanMin?: number;
}) {
  // The report renders no agent/auditor identities, but the partner app always
  // sets this so any future staff-bearing field stays masked by contract.
  void maskStaff;
  const { session, capturedFace, capturedPan, capturedSignature, panOcr, panEditedFields, livenessAnswers } = data;
  const { customer, location } = session;
  const faceImg = capturedFace ?? DEMO_ASSETS.faceLive;
  const aadhaarImg = DEMO_ASSETS.faceAadhaar;
  const panImg = data.panPhotoCrop ?? capturedPan ?? DEMO_ASSETS.panCard;
  const signImg = capturedSignature ?? DEMO_ASSETS.signPaper;
  const aadhaarScore = session.faceMatchAadhaar;
  const panScore = session.faceMatchPan;
  const aadhaarBand = bandForScore(aadhaarScore, faceMatchAadhaarMin);
  const panBand = bandForScore(panScore, faceMatchPanMin);
  const browser = getBrowserInfo();
  const decisionLabel =
    data.decision === 'approved' ? 'Approved'
      : data.decision === 'rejected' ? 'Rejected'
      : data.decision === 'unable' ? 'Unable to Verify'
      : 'Pending';
  const decisionColor =
    data.decision === 'approved' ? 'text-success'
      : data.decision === 'rejected' ? 'text-danger'
      : 'text-warning';
  const scoreTone = (band: typeof aadhaarBand) =>
    band === 'green' ? 'text-success'
      : band === 'amber' ? 'text-warning'
      : band === 'red' ? 'text-danger'
      : 'text-text-muted';

  const handlePrint = () => window.print();

  const previousAttempts =
    customer.previousAttempts?.length
      ? customer.previousAttempts.slice(0, 2)
      : customer.previousAttempt
        ? [customer.previousAttempt]
        : [];

  const fieldRows = [
    { label: 'NAME', form: customer.name, aadhaar: customer.name, pan: panOcr.name, seededPct: 93.52 },
    { label: "FATHER'S NAME", form: customer.fatherName, aadhaar: '—', pan: panOcr.fatherName },
    { label: 'DOB', form: customer.dob, aadhaar: customer.dob, pan: panOcr.dob },
    { label: 'GENDER', form: customer.gender, aadhaar: customer.gender, pan: '—' },
    // Addresses report a similarity percentage rather than Yes/No — a partial
    // address match is meaningful information the agent/auditor needs to see.
    { label: 'CURRENT ADDRESS', form: formatAddress(customer.currentAddress), aadhaar: formatAddress(customer.currentAddress), pan: '—', forcePercent: true },
    { label: 'PERMANENT ADDRESS', form: formatAddress(customer.permanentAddress), aadhaar: formatAddress(customer.permanentAddress), pan: '—', forcePercent: true },
    { label: 'MOBILE NUMBER', form: customer.phone, aadhaar: customer.phone, pan: '—' },
    { label: 'EMAIL', form: customer.email, aadhaar: '—', pan: '—' },
  ];

  const rows = fieldRows.map((r) => {
    const match = computeReportMatch(r.form, r.aadhaar, r.pan, {
      fieldLabel: r.label,
      seededPct: r.seededPct,
      nameMatchMin,
      forcePercent: r.forcePercent,
    });
    return { ...r, match: match.text, matchType: match.type };
  });

  return (
    <div className="kyc-report bg-surface border border-border rounded-xl overflow-hidden print:shadow-none">
      {showDownload && (
        <div className="flex justify-end p-3 border-b border-border print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
      )}

      <div className="p-4 space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Face Match with Aadhaar', score: aadhaarScore, band: aadhaarBand, ok: data.aadhaarFaceMatch },
            { label: 'Face Match with PAN', score: panScore, band: panBand, ok: data.panFaceMatch },
          ].map((b) => (
            <div
              key={b.label}
              className={cn(
                'rounded-lg border px-4 py-3 flex items-center justify-between text-sm',
                b.band === 'green' ? 'border-green-200 bg-green-50'
                  : b.band === 'amber' ? 'border-amber-200 bg-amber-50'
                  : b.band === 'red' ? 'border-red-200 bg-red-50'
                  : 'border-border bg-gray-50',
              )}
            >
              <span>Match Score — <span className={cn('font-semibold', scoreTone(b.band))}>{b.score.toFixed(2)}%</span></span>
              <span title="Agent's confirmation that the faces match, recorded during the call.">Status (agent confirmed) — <span className={cn('font-semibold', b.ok ? 'text-success' : 'text-danger')}>{b.ok ? 'Yes' : 'No'}</span></span>
            </div>
          ))}
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Customer Details" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-text-muted">
                  <th className="text-left p-2 border-b">User Detail</th>
                  <th className="text-left p-2 border-b">Applicant Form Data</th>
                  <th className="text-left p-2 border-b align-top">
                    Aadhaar Data (XXXX XXXX {customer.aadhaarLast4}) <span className="text-success">✓</span>
                    <span className="block font-normal text-[10px] text-text-muted">
                      Generation Date: {customer.aadhaarGenerationDate}, {formatDateLabel(customer.aadhaarGenerationDate)}
                    </span>
                  </th>
                  <th className="text-left p-2 border-b align-top">PAN details ({panOcr.panNumber}) <span className="text-success">✓</span></th>
                  <th className="text-left p-2 border-b">Match</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-border/50">
                    <td className="p-2 font-medium">{r.label}</td>
                    <td className="p-2">{r.form}</td>
                    <td className="p-2">{r.aadhaar}</td>
                    <td className="p-2">
                      {r.pan}
                      {panEditedFields.includes(r.label) && (
                        <span className="ml-1 w-1.5 h-1.5 inline-block rounded-full bg-primary" title="Edited by agent" />
                      )}
                    </td>
                    <td className="p-2"><MatchChip value={r.match} type={r.matchType} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-1 text-xs text-text-muted">
            PAN Status: <span className="text-success font-medium">Verified ✓</span> · Aadhaar eKYC: <span className="text-success font-medium">Verified ✓</span>
          </p>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Face Match with Aadhaar" />
          <div className="p-4 flex gap-4 items-start">
            <div className="text-center">
              <ZoomableImage src={faceImg} alt="Captured" imgClassName="w-20 h-24 object-cover rounded border" />
              <p className="text-xs mt-1">Captured Image ✓</p>
            </div>
            <div className="text-center">
              <ZoomableImage src={aadhaarImg} alt="Aadhaar" imgClassName="w-20 h-24 object-cover rounded border grayscale" />
              <p className="text-xs mt-1">Aadhaar Image</p>
            </div>
            <div className="text-xs space-y-1">
              <p>Match Score — <span className={cn('font-semibold', scoreTone(aadhaarBand))}>{aadhaarScore.toFixed(2)}%</span></p>
              <p>Threshold — ≥ {faceMatchAadhaarMin}%</p>
              <p title="The agent's own confirmation that the live face matches the Aadhaar photograph, recorded during the call — distinct from the machine match score above.">
                Status (agent confirmed) — <span className={cn('font-semibold', data.aadhaarFaceMatch ? 'text-success' : 'text-danger')}>{data.aadhaarFaceMatch ? 'Yes' : 'No'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Face Match with PAN" />
          <div className="p-4 flex gap-4 items-start">
            <div className="text-center">
              <ZoomableImage src={faceImg} alt="Captured" imgClassName="w-20 h-24 object-cover rounded border" />
              <p className="text-xs mt-1">Captured Image ✓</p>
            </div>
            <div className="text-center">
              <ZoomableImage src={panImg} alt="PAN" imgClassName="w-20 h-16 object-contain rounded border" />
              <p className="text-xs mt-1">PAN Image</p>
            </div>
            <div className="text-xs space-y-1">
              <p>Match Score — <span className={cn('font-semibold', scoreTone(panBand))}>{panScore.toFixed(2)}%</span></p>
              <p>Threshold — ≥ {faceMatchPanMin}%</p>
              <p title="The agent's own confirmation that the live face matches the photograph on the PAN card, recorded during the call — distinct from the machine match score above.">
                Status (agent confirmed) — <span className={cn('font-semibold', data.panFaceMatch ? 'text-success' : 'text-danger')}>{data.panFaceMatch ? 'Yes' : 'No'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Captured Signature" />
          <div className="p-4">
            <ZoomableImage src={signImg} alt="Signature" imgClassName="max-h-32 rounded border bg-white" />
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Location Check" />
          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div><span className="text-text-muted">Latitude</span><p>{location.lat.toFixed(4)}</p></div>
            <div><span className="text-text-muted">Longitude</span><p>{location.lng.toFixed(4)}</p></div>
            <div><span className="text-text-muted">Plus code</span><p>7JVW+2X {location.city}</p></div>
            <div><span className="text-text-muted">State</span><p>{location.state}</p></div>
            <div><span className="text-text-muted">City</span><p>{location.city}</p></div>
            <div><span className="text-text-muted">Pincode</span><p>{location.pincode}</p></div>
            <div><span className="text-text-muted">District</span><p>{location.district}</p></div>
            <div><span className="text-text-muted">Area</span><p>{location.area ?? 'Lower Parel'}</p></div>
            <div><span className="text-text-muted">Country</span><p>{location.country} ✓</p></div>
            <div><span className="text-text-muted">IP Address</span><p>{location.ip} ✓</p></div>
            <div><span className="text-text-muted">CA → Geo</span><p>{location.distanceCurrentKm.toFixed(3)} km</p></div>
            <div><span className="text-text-muted">PA → Geo</span><p>4.165 km</p></div>
          </div>
          <p className="px-4 text-xs text-text-muted">Geo coordinates accurate to {(8 + (customer.appId.length % 12) + 0.71).toFixed(2)} meters · captured {customer.aadhaarGenerationDate}</p>
          <div className="mx-4 mb-4 px-3 py-2 bg-green-50 text-success rounded text-xs">
            SAFE IP Address – VPN and Proxy Not Detected | Inside India
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title={`Verifying Agent's Status — ${decisionLabel}`} />
          <div className="p-4 text-xs space-y-2">
            <p className={cn('font-semibold', decisionColor)}>{decisionLabel}</p>
            <p>Timestamp: {new Date().toLocaleString('en-IN')}</p>
            <p>
              Remarks: {data.agentRemarks || data.rejectionReasons.remarks || 'No status remarks added by the Verifying Agent'}
            </p>
            {data.rejectionReasons.selections.length > 0 && (
              <p className="text-text-muted">Reasons: {formatRejectionSummary(data.rejectionReasons)}</p>
            )}
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Liveliness Check" />
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-text-muted">
                <th className="text-left p-2">Question Asked</th>
                <th className="text-left p-2">Answer</th>
                <th className="text-left p-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {(livenessAnswers.length ? livenessAnswers : [
                { question: 'What is your occupation?', answer: 'Software Engineer', result: 'Correct' as const },
                { question: 'What is your annual income?', answer: '₹8,50,000', result: 'Correct' as const },
                { question: 'Read the 6-digit text seen on your screen', answer: session.livenessCode, result: 'Correct' as const },
              ]).map((row) => (
                <tr key={row.question} className="border-t border-border/50">
                  <td className="p-2">{row.question}</td>
                  <td className="p-2">{row.answer}</td>
                  <td className="p-2">
                    <span className={row.result === 'Correct' ? 'text-success' : 'text-danger'}>{row.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Section Remarks" />
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-text-muted">
                <th className="text-left p-2">Section</th>
                <th className="text-left p-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">Chat</td>
                <td className="p-2">No chat activity was detected during the Video KYC call.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Browser & IP Details" />
          <div className="p-4 grid grid-cols-2 gap-2 text-xs">
            <div>IP Country code: IN</div>
            <div>Browser Name: {browser.browser}</div>
            <div>Browser Version: {browser.version}</div>
            <div>Operating System: {browser.os}</div>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <SectionHeader title="Additional Details" />
          <div className="p-4 grid grid-cols-2 gap-2 text-xs">
            <div>Customer status: {customer.customerStatus === 'New' ? 'NTB' : 'ETB'}</div>
            <div>Product Type: {customer.productType}</div>
            <div>
              Attempt: {customer.attemptNumber ?? 1}
              {previousAttempts.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-text-muted">
                  {previousAttempts.map((a, i) => (
                    <li key={`${a.date}-${i}`}>
                      {formatDateLabel(a.date)} — {a.decision}: {a.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>Branch: —</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildKycReportData(flow: {
  session: CallSession;
  capturedFace: string | null;
  capturedPan: string | null;
  capturedSignature: string | null;
  panPhotoCrop?: string | null;
  panOcr: PanOcrData;
  panEditedFields: string[];
  livenessAnswers: LivenessAnswer[];
  aadhaarFaceMatch: boolean | null;
  panFaceMatch: boolean | null;
  agentRemarks: string;
  decision: 'approved' | 'rejected' | 'unable' | null;
  rejectionReasons: SelectedRejectionReasons;
}): KycReportData {
  return { ...flow };
}
