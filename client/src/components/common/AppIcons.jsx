function IconShell({ children, className = "", size = 24, viewBox = "0 0 24 24", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <rect x="3" y="3" width="7" height="7" rx="1.8" />
      <rect x="14" y="3" width="7" height="5" rx="1.8" />
      <rect x="14" y="12" width="7" height="9" rx="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.8" />
    </IconShell>
  );
}

export function FolderIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M4.5 6A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h15A2.5 2.5 0 0 0 22 15.5v-6A2.5 2.5 0 0 0 19.5 7h-5.8l-1.32-1.32A2 2 0 0 0 11.96 5H4.5Z" />
    </IconShell>
  );
}

export function TeamIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M8 11.5A3.5 3.5 0 1 0 8 4.5a3.5 3.5 0 0 0 0 7Zm8.75-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.5 18.5A5.5 5.5 0 0 1 8 13h.1c1.58 0 3.01.61 4.08 1.6A5.5 5.5 0 0 1 17 13h.1A5 5 0 0 1 22 18v.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-.5Z" />
    </IconShell>
  );
}

export function TasksIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <circle cx="5" cy="7" r="1.6" />
      <rect x="8" y="6.2" width="11" height="1.6" rx="0.8" />
      <circle cx="5" cy="12" r="1.6" />
      <rect x="8" y="11.2" width="11" height="1.6" rx="0.8" />
      <circle cx="5" cy="17" r="1.6" />
      <rect x="8" y="16.2" width="8.5" height="1.6" rx="0.8" />
    </IconShell>
  );
}

export function NotificationsIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M12 3a5 5 0 0 0-5 5v2.18c0 .7-.18 1.38-.52 1.98L5.4 14.7A1.5 1.5 0 0 0 6.7 17h10.6a1.5 1.5 0 0 0 1.3-2.3l-1.08-1.54c-.34-.6-.52-1.28-.52-1.98V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 21Z" />
    </IconShell>
  );
}

export function RefreshIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M17.65 6.35A8 8 0 1 0 20 12h-2A6 6 0 1 1 12 6c1.86 0 3.55.84 4.67 2.17L14 10h7V3l-3.35 3.35Z" />
    </IconShell>
  );
}

export function TrendUpIcon({ className = "", size = 20 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M3 14.5 8.5 9l3.5 3.5 5.5-5.5v3L12 15l-3.5-3.5L5 15H3v-0.5z" />
      <path d="M14.5 6H17v2.5" />
    </IconShell>
  );
}

export function ChevronDownIcon({ className = "", size = 16 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M5 7.5 10 12.5 15 7.5l1.4 1.4-6.4 6.4-6.4-6.4L5 7.5z" />
    </IconShell>
  );
}

export function CalendarIcon({ className = "", size = 20 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M5 3a1 1 0 0 1 1 1v1h8V4a1 1 0 1 1 2 0v1h1.5A1.5 1.5 0 0 1 19 6.5v10A1.5 1.5 0 0 1 17.5 18h-15A1.5 1.5 0 0 1 1 16.5v-10A1.5 1.5 0 0 1 2.5 5H4V4a1 1 0 0 1 1-1Zm11.5 6h-13v7.5h13V9Z" />
      <path d="M5 8h2v2H5V8Zm4 0h2v2H9V8Zm4 0h2v2h-2V8ZM5 12h2v2H5v-2Zm4 0h2v2H9v-2Zm4 0h2v2h-2v-2Z" />
    </IconShell>
  );
}

export function MetricsIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <rect x="4" y="13" width="4" height="7" rx="1" />
      <rect x="10" y="8" width="4" height="12" rx="1" />
      <rect x="16" y="5" width="4" height="15" rx="1" />
    </IconShell>
  );
}

export function SettingsIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M19.14 12.94a7.14 7.14 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.44 7.44 0 0 0-1.63-.95l-.36-2.53a.5.5 0 0 0-.49-.41h-3.84a.5.5 0 0 0-.49.41l-.36 2.53a7.44 7.44 0 0 0-1.63.95l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.14 7.14 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96a7.44 7.44 0 0 0 1.63.95l.36 2.53a.5.5 0 0 0 .49.41h3.84a.5.5 0 0 0 .49-.41l.36-2.53a7.44 7.44 0 0 0 1.63-.95l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.2a3.2 3.2 0 1 1 3.2-3.2 3.2 3.2 0 0 1-3.2 3.2Z" />
    </IconShell>
  );
}

export function ReorderIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <rect x="3" y="6" width="18" height="2" rx="1" />
      <rect x="3" y="11" width="18" height="2" rx="1" />
      <rect x="3" y="16" width="18" height="2" rx="1" />
    </IconShell>
  );
}

export function DragHandleIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 13 9">
      <circle cx="2.5" cy="2" r="1.1" />
      <circle cx="6.5" cy="2" r="1.1" />
      <circle cx="10.5" cy="2" r="1.1" />
      <circle cx="2.5" cy="7" r="1.1" />
      <circle cx="6.5" cy="7" r="1.1" />
      <circle cx="10.5" cy="7" r="1.1" />
    </IconShell>
  );
}

export function SaveIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M9 16.2 5.5 12.7l1.4-1.4L9 13.4l8.1-8.1 1.4 1.4L9 16.2Z" />
    </IconShell>
  );
}

export function CancelIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
    </IconShell>
  );
}

export function SendIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M2 21 23 12 2 3v7l15 2-15 2v7Z" />
    </IconShell>
  );
}

export function ClearDateIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M21 12a9 9 0 1 0-3.56 6.56 1 1 0 0 0 1.26-1.54A7 7 0 1 1 19 12h-2.2l2.9 2.9 2.9-2.9H21Zm-1-9v6h-6l2.1-2.1A8 8 0 0 0 6 18a1 1 0 1 0 1.7 1.08A6 6 0 0 1 19.9 8H20V3h-1Z" />
    </IconShell>
  );
}

export function AddMemberIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M8 11.5A3.5 3.5 0 1 0 8 4.5a3.5 3.5 0 0 0 0 7ZM2.5 18.5A5.5 5.5 0 0 1 8 13h.1c1.58 0 3.01.61 4.08 1.6A5.5 5.5 0 0 1 17 13h.1A5 5 0 0 1 22 18v.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-.5Zm13-9.5h2v-2h2v2h2v2h-2v2h-2v-2h-2v-2Z" />
    </IconShell>
  );
}

// --- Additional header icons (20px variants) ---
export function CreateProjectIcon({ className = "", size = 20 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M10 4a6 6 0 1 0 0 12A6 6 0 0 0 10 4zm1 3v2h2v2h-2v2h-2v-2H7V9h2V7h2z" />
    </IconShell>
  );
}

export function ProjectInvitationsIcon({ className = "", size = 20 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 10c-2.67 0-5.33-1.34-6-4h12c-.67 2.66-3.33 4-6 4z" />
    </IconShell>
  );
}

export function AddFriendIcon({ className = "", size = 20 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c2.67 0 5.33 1.34 6 4H2c.67-2.66 3.33-4 6-4zm7-1v2h2v2h-2v2h-2v-2h-2v-2h2V10h2z" />
    </IconShell>
  );
}

export function MarkAllReadIcon({ className = "", size = 20 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 11-3-3 1.41-1.41L9 10.17l4.59-4.58L15 7l-6 6z" />
    </IconShell>
  );
}

export function FilterIcon({ className = "", size = 20 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M3 4h14l-5 6v4l-4 2v-6L3 4z" />
    </IconShell>
  );
}

export function BrowseProjectsIcon({ className = "", size = 20 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 20 20">
      <path d="M2 4a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" />
    </IconShell>
  );
}

export function RemoveMemberIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M8 11.5A3.5 3.5 0 1 0 8 4.5a3.5 3.5 0 0 0 0 7ZM2.5 18.5A5.5 5.5 0 0 1 8 13h.1c1.58 0 3.01.61 4.08 1.6A5.5 5.5 0 0 1 17 13h.1A5 5 0 0 1 22 18v.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-.5Zm13-8.5h6v2h-6v-2Z" />
    </IconShell>
  );
}

export function TrashIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4h4v2H5V4h4v-.5ZM6.5 7h11l-.9 13a1.5 1.5 0 0 1-1.5 1.4H8.9a1.5 1.5 0 0 1-1.5-1.4L6.5 7Zm3 2v8h2V9h-2Zm5 0v8h2V9h-2Z" />
    </IconShell>
  );
}

export function DeleteWarningIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M12 2 1 21h22L12 2Zm0 6.2c.55 0 1 .45 1 1V13c0 .55-.45 1-1 1s-1-.45-1-1V9.2c0-.55.45-1 1-1Zm0 8.8a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z" />
    </IconShell>
  );
}

export function ReviewApprovedIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M12 4.5c3.93 0 7.1 3.17 7.1 7.1s-3.17 7.1-7.1 7.1-7.1-3.17-7.1-7.1 3.17-7.1 7.1-7.1Zm-1.1 8.2 5.1-5.1-1.4-1.4-3.7 3.7-1.8-1.8-1.4 1.4 3.3 3.2Z" />
    </IconShell>
  );
}

export function ReviewRejectedIcon({ className = "", size = 24 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M12 4.5c3.93 0 7.1 3.17 7.1 7.1s-3.17 7.1-7.1 7.1-7.1-3.17-7.1-7.1 3.17-7.1 7.1-7.1Zm-2.8 4.3 1.4-1.4L12 10.2l1.4-2.8 1.4 1.4-1.8 2.8 1.8 2.8-1.4 1.4-1.4-2.8-1.4 2.8-1.4-1.4 1.8-2.8-1.8-2.8Z" />
    </IconShell>
  );
}

export function ChartEmptyIcon({ className = "", size = 40 }) {
  return (
    <IconShell className={className} size={size} viewBox="0 0 40 28">
      <rect x="1" y="6" width="38" height="18" rx="3" fillOpacity="0.12" />
      <rect x="6" y="15" width="5" height="2" rx="1" />
      <rect x="14" y="11" width="5" height="2" rx="1" />
      <rect x="22" y="9" width="5" height="2" rx="1" />
    </IconShell>
  );
}

export function InsightTrendIcon({ className = "", size = 18 }) {
  return (
    <IconShell className={className} size={size}>
      <path d="M3 17.5 9 11.5 13 15.5 21 7.5v3l-8 8-4-4-5 5v-3Z" />
    </IconShell>
  );
}

export function ConnectionIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden="true" focusable="false">
      <rect x="90" y="52" width="140" height="80" rx="12" fill="#ffffff" />
      <rect x="90" y="52" width="140" height="22" rx="12" fill="#eef2f7" />
      <rect x="90" y="63" width="140" height="11" fill="#eef2f7" />
      <text x="160" y="67" textAnchor="middle" fill="#9aa6b2" fontSize="8" fontWeight="700" letterSpacing="1">ROUTER</text>
      <circle cx="108" cy="88" r="4" fill="#d7dee8" />
      <circle cx="122" cy="88" r="4" fill="#d7dee8" />
      <circle cx="136" cy="88" r="4" fill="#f59e42" />
      <rect x="108" y="100" width="14" height="8" rx="2" fill="#dbe2ea" />
      <rect x="128" y="100" width="14" height="8" rx="2" fill="#dbe2ea" />
      <rect x="148" y="100" width="14" height="8" rx="2" fill="#dbe2ea" />
      <rect x="168" y="100" width="14" height="8" rx="2" fill="#dbe2ea" />
      <rect x="106" y="40" width="4" height="12" rx="2" fill="#c9d2db" />
      <rect x="210" y="40" width="4" height="12" rx="2" fill="#c9d2db" />
      <circle cx="160" cy="44" r="12" fill="#1d9e75" fillOpacity="0.12" />
      <circle cx="160" cy="44" r="8" fill="#1d9e75" fillOpacity="0.18" />
      <path d="M120 132 Q108 148 96 162 Q84 175 78 188" fill="#c9d2db" fillOpacity="0.9" />
      <rect x="68" y="186" width="20" height="10" rx="3" fill="#c8cdd8" />
      <rect x="73" y="196" width="4" height="6" rx="1" fill="#aeb7c2" />
      <rect x="81" y="196" width="4" height="6" rx="1" fill="#aeb7c2" />
      <path d="M200 132 Q212 148 224 162 Q236 175 242 188" fill="#c9d2db" fillOpacity="0.9" />
      <rect x="232" y="186" width="20" height="10" rx="3" fill="#c8cdd8" />
      <rect x="237" y="196" width="4" height="6" rx="1" fill="#aeb7c2" />
      <rect x="245" y="196" width="4" height="6" rx="1" fill="#aeb7c2" />
      <path d="M144 170 L150 164 Q155 158 162 160 L166 161" fill="#d8dee8" />
      <path d="M176 170 L170 176 Q165 182 158 180 L154 179" fill="#d8dee8" />
      <rect x="157" y="163" width="4" height="14" rx="2" fill="#e8a87c" transform="rotate(-15 157 163)" />
      <circle cx="56" cy="120" r="4" fill="#1d9e75" />
      <circle cx="42" cy="138" r="3" fill="#1d9e75" />
      <circle cx="62" cy="152" r="2.5" fill="#0f6e56" />
      <circle cx="264" cy="120" r="4" fill="#1d9e75" />
      <circle cx="278" cy="138" r="3" fill="#1d9e75" />
      <circle cx="258" cy="152" r="2.5" fill="#0f6e56" />
    </svg>
  );
}

export function ErrorIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 380 240" className={className} aria-hidden="true" focusable="false">
      <rect x="158" y="198" width="64" height="14" rx="3" fill="#d8dce4" />
      <rect x="136" y="210" width="108" height="7" rx="3.5" fill="#cbd0d9" />
      <rect x="44" y="14" width="292" height="190" rx="14" fill="#ffffff" />
      <rect x="52" y="22" width="276" height="172" rx="10" fill="#eef2f7" />
      <rect x="70" y="140" width="80" height="6" rx="2" fill="#1d9e75" fillOpacity="0.12" />
      <rect x="220" y="58" width="58" height="6" rx="2" fill="#1d9e75" fillOpacity="0.1" />
      <text x="190" y="118" textAnchor="middle" fill="#d0d3da" fontSize="70" fontWeight="800" letterSpacing="-3">404</text>
      <path d="M190 30 178 82 198 100 177 138 190 194" fill="#1d9e75" fillOpacity="0.08" />
      <path d="M190 30 178 82 198 100 177 138 190 194" fill="#1d9e75" fillOpacity="0.28" />
      <path d="M178 82 155 104 140 114" fill="#1d9e75" fillOpacity="0.18" />
      <path d="M198 100 226 112 248 108" fill="#1d9e75" fillOpacity="0.18" />
      <path d="M177 138 158 152 146 163" fill="#1d9e75" fillOpacity="0.12" />
      <polygon points="24,72 36,65 32,82" fill="#1d9e75" fillOpacity="0.35" />
      <polygon points="344,54 357,48 353,66" fill="#1d9e75" fillOpacity="0.25" />
      <polygon points="16,152 27,146 23,162" fill="#0f6e56" fillOpacity="0.3" />
      <circle cx="190" cy="208" r="2.5" fill="#1d9e75" />
    </svg>
  );
}

export function NotificationTaskIcon({ className = "", size = 20 }) {
  return <TasksIcon className={className} size={size} />;
}

export function NotificationProjectIcon({ className = "", size = 20 }) {
  return <FolderIcon className={className} size={size} />;
}

export function NotificationReviewIcon({ className = "", size = 20 }) {
  return <ReviewApprovedIcon className={className} size={size} />;
}

export function NotificationNetworkIcon({ className = "", size = 20 }) {
  return <TeamIcon className={className} size={size} />;
}

export function NotificationUpdateIcon({ className = "", size = 20 }) {
  return <RefreshIcon className={className} size={size} />;
}

export function NotificationIcon({ type = "", className = "", size = 20 }) {
  const normalizedType = String(type || "").toLowerCase();

  if (normalizedType.startsWith("task_")) {
    return <NotificationTaskIcon className={className} size={size} />;
  }

  if (normalizedType.startsWith("project_")) {
    return <NotificationProjectIcon className={className} size={size} />;
  }

  if (normalizedType.startsWith("review_")) {
    return <NotificationReviewIcon className={className} size={size} />;
  }

  if (normalizedType.startsWith("friend_")) {
    return <NotificationNetworkIcon className={className} size={size} />;
  }

  return <NotificationUpdateIcon className={className} size={size} />;
}

export default NotificationIcon;
