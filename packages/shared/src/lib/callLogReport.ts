import type { CallRecord, Customer } from '../data/types';
import type { KycReportData } from '../components/report/KycReport';
import { DEMO_ASSETS } from './demoAssets';
import { buildCallSession } from '../data/generate';
import { SeededRNG } from '../data/rng';

export function buildCallLogReportData(call: CallRecord, customer: Customer): KycReportData {
  const seed = call.id.replace(/\D/g, '') || '1';
  const session = buildCallSession(new SeededRNG(Number(seed) || 1), customer);
  const decision =
    call.agentDecision === 'approved' ? 'approved'
      : call.agentDecision === 'rejected' ? 'rejected'
      : null;

  return {
    session,
    capturedFace: DEMO_ASSETS.faceLive,
    capturedPan: DEMO_ASSETS.panCard,
    capturedSignature: DEMO_ASSETS.signPaper,
    panPhotoCrop: null,
    panOcr: {
      panNumber: customer.panNumber,
      name: customer.name,
      fatherName: customer.fatherName,
      dob: customer.dob,
    },
    panEditedFields: [],
    livenessAnswers: [
      { question: 'What is your occupation?', answer: 'Software Engineer', result: 'Correct' },
      { question: 'What is your annual income?', answer: '₹8,50,000', result: 'Correct' },
      {
        question: 'Read the 6-digit text seen on your screen',
        answer: session.livenessCode,
        result: 'Correct',
      },
    ],
    aadhaarFaceMatch: true,
    panFaceMatch: true,
    agentRemarks: '',
    decision,
    rejectionReasons: { selections: [], remarks: '' },
  };
}
