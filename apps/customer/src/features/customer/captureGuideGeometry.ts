/** Credit-card landscape ratio (width ÷ height). */
export const PAN_ASPECT = 1.586;

/** Portrait face oval: width ÷ height. */
export const FACE_OVAL_RATIO = 0.75;

/** Max guide height as a fraction of the video container. */
export const MAX_HEIGHT_RATIO = 0.7;

/** Guide width as a fraction of the video container. */
export const GUIDE_WIDTH_RATIO = 0.8;

export type CaptureGuideKind = 'face' | 'pan' | 'signature';

export interface GuideRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

/** Single source for face oval, PAN, and signature guide placement. */
export function computeGuideRect(
  containerWidth: number,
  containerHeight: number,
  kind: CaptureGuideKind,
): GuideRect {
  let width = containerWidth * GUIDE_WIDTH_RATIO;
  let height: number;

  if (kind === 'face') {
    height = width / FACE_OVAL_RATIO;
  } else {
    height = width / PAN_ASPECT;
  }

  const maxHeight = containerHeight * MAX_HEIGHT_RATIO;
  if (height > maxHeight) {
    height = maxHeight;
    width = kind === 'face' ? height * FACE_OVAL_RATIO : height * PAN_ASPECT;
  }

  return {
    width,
    height,
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
  };
}

/** Caption band sits below the centered guide, never overlapping it. */
export function captionTop(rect: GuideRect, gap = 12): number {
  return rect.top + rect.height + gap;
}
