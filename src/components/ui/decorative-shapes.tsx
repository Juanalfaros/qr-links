import type { SVGProps } from 'react';

// Purely decorative flourishes for KPI/summary cards (the reference app's
// blobs/stars). `fill="currentColor"` so callers just set text color +
// opacity via className — no new tokens needed.

export function BlobShape(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" fill="currentColor" {...props}>
      <path d="M141.5 24.7c22.6 14.6 35.9 41.9 36.9 68.9 1 27-10.3 53.7-30.2 70.8-19.9 17.1-48.4 24.7-73.8 17.9-25.4-6.8-47.7-27.9-56.8-53.6-9.1-25.7-5-56 11.4-77.9C45.4 28.9 73 15.2 99.9 14.6c26.9-.6 41 9.5 41.6 10.1Z" />
    </svg>
  );
}

export function SparkleShape(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" fill="currentColor" {...props}>
      <path d="M100 10c4 38 8 62 20 74s36 16 74 20c-38 4-62 8-74 20s-16 36-20 74c-4-38-8-62-20-74s-36-16-74-20c38-4 62-8 74-20s16-36 20-74Z" />
    </svg>
  );
}
