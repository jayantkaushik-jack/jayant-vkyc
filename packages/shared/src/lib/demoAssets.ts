import faceLive from '../assets/demo/face-live.jpg';
import faceAadhaar from '../assets/demo/face-aadhaar.jpg';
import panCard from '../assets/demo/pan-card.svg';
import signPaper from '../assets/demo/sign-paper.svg';

export const DEMO_ASSETS = {
  faceLive,
  faceAadhaar,
  panCard,
  signPaper,
  customerVideo: faceLive,
} as const;

export type CaptureMode = 'face' | 'pan' | 'sign' | null;

export const CAPTURE_GUIDE_CAPTIONS: Record<Exclude<CaptureMode, null>, string> = {
  face: 'Position face within the oval guide',
  pan: 'Align PAN card within the frame',
  sign: 'Ask the customer to show the signed paper',
};
