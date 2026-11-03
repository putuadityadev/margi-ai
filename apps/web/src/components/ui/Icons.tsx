import type { ReactNode, SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  readonly size?: number;
}

function SvgBase({
  size = 18,
  className = '',
  children,
  ...props
}: IconProps & { readonly children: ReactNode }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {children}
    </svg>
  );
}

export function CameraIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3.5" />
    </SvgBase>
  );
}

export function UploadPhotoIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </SvgBase>
  );
}

export function MapPinIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </SvgBase>
  );
}

export function CompassIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </SvgBase>
  );
}

export function ClockIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </SvgBase>
  );
}

export function StoreIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 20v-5h4v5" />
    </SvgBase>
  );
}

export function UtensilsIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M4 3v7a3 3 0 0 0 3 3v8" />
      <path d="M7 3v7" />
      <path d="M10 3v7a3 3 0 0 1-3 3" />
      <path d="M17 3v18" />
      <path d="M17 3a4 4 0 0 0-4 4v5h4" />
    </SvgBase>
  );
}

export function ShareLinkIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </SvgBase>
  );
}

export function BookmarkIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </SvgBase>
  );
}

export function CheckCircleIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3 4.7-5" />
    </SvgBase>
  );
}

export function InfoIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </SvgBase>
  );
}

export function AlertCircleIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </SvgBase>
  );
}

export function LockIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </SvgBase>
  );
}

export function SlidersIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="10" cy="18" r="2" fill="currentColor" />
    </SvgBase>
  );
}

export function TrashIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </SvgBase>
  );
}

export function EditIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </SvgBase>
  );
}

export function GlobeIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 0 0 18 14.5 14.5 0 0 0 0-18" />
    </SvgBase>
  );
}

export function RefreshIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M21 12a9 9 0 0 0-15.3-6.4L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 15.3 6.4L21 16" />
      <path d="M16 16h5v5" />
    </SvgBase>
  );
}

export function ExternalArrowIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </SvgBase>
  );
}

export function ShieldCheckIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V7l-8-4z" />
      <path d="m9 12 2 2 4-4" />
    </SvgBase>
  );
}

export function TempleGateIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <path d="M4 20h6V5L7 7v4H5v9Z" />
      <path d="M20 20h-6V5l3 2v4h2v9Z" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </SvgBase>
  );
}

export function MailIcon(props: IconProps): ReactNode {
  return (
    <SvgBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </SvgBase>
  );
}

