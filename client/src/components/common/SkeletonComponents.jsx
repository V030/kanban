/**
 * Reusable skeleton loading components.
 * Use these to replace "Loading..." placeholders throughout the app.
 */

// Base skeleton box (rectangle)
export function SkeletonBox({ width = "100%", height = "16px", className = "" }) {
  return <div className={`skeleton skeleton-box ${className}`} style={{ width, height }} />;
}

// Circle skeleton (for avatars)
export function SkeletonCircle({ size = "40px", className = "" }) {
  return <div className={`skeleton skeleton-circle ${className}`} style={{ width: size, height: size }} />;
}

// Text skeleton (shorter line)
export function SkeletonText({ width = "80%", className = "" }) {
  return <SkeletonBox width={width} height="14px" className={`skeleton-text ${className}`} />;
}

// Card skeleton (for stat cards, project cards)
export function SkeletonCard({ className = "" }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <SkeletonBox height="20px" width="60%" />
      <SkeletonBox height="28px" width="40%" style={{ marginTop: "12px" }} />
      <SkeletonBox height="12px" width="70%" style={{ marginTop: "8px" }} />
    </div>
  );
}

// Row skeleton (for list items, comments, etc.)
export function SkeletonRow({ showAvatar = true, lineCount = 2, className = "" }) {
  return (
    <div className={`skeleton-row ${className}`}>
      {showAvatar && <SkeletonCircle size="36px" className="skeleton-row-avatar" />}
      <div className="skeleton-row-content">
        <SkeletonBox height="14px" width="70%" />
        {lineCount > 1 && <SkeletonBox height="12px" width="85%" style={{ marginTop: "8px" }} />}
        {lineCount > 2 && <SkeletonBox height="12px" width="60%" style={{ marginTop: "8px" }} />}
      </div>
    </div>
  );
}

// Toggle skeleton (for permission toggles)
export function SkeletonToggle({ className = "" }) {
  return (
    <div className={`skeleton-toggle ${className}`}>
      <div className="skeleton-toggle-text">
        <SkeletonBox height="16px" width="40%" />
        <SkeletonBox height="12px" width="60%" style={{ marginTop: "8px" }} />
      </div>
      <div className="skeleton-toggle-switch">
        <SkeletonBox height="24px" width="44px" style={{ borderRadius: "12px" }} />
      </div>
    </div>
  );
}

// Button skeleton
export function SkeletonButton({ width = "100px", className = "" }) {
  return <SkeletonBox width={width} height="36px" className={`skeleton-button ${className}`} />;
}

// Column with task skeletons (for Kanban board)
export function SkeletonColumn({ taskCount = 3, className = "" }) {
  return (
    <div className={`skeleton-column ${className}`}>
      <div className="skeleton-column-header">
        <SkeletonBox height="18px" width="40%" />
        <SkeletonBox height="18px" width="30px" />
      </div>
      <div className="skeleton-column-tasks">
        {Array.from({ length: taskCount }).map((_, idx) => (
          <SkeletonTaskCard key={idx} />
        ))}
      </div>
    </div>
  );
}

// Task card skeleton (for Kanban board)
export function SkeletonTaskCard({ className = "" }) {
  return (
    <div className={`skeleton-task-card ${className}`}>
      <SkeletonBox height="14px" width="60%" />
      <SkeletonBox height="12px" width="85%" style={{ marginTop: "10px" }} />
      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <SkeletonBox height="20px" width="40px" style={{ borderRadius: "4px" }} />
        <SkeletonBox height="20px" width="50px" style={{ borderRadius: "4px" }} />
      </div>
      <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
        <SkeletonCircle size="24px" />
        <SkeletonCircle size="24px" />
      </div>
    </div>
  );
}

// Chart skeleton (for metrics)
export function SkeletonChart({ className = "" }) {
  return (
    <div className={`skeleton-chart ${className}`}>
      <SkeletonBox height="200px" width="100%" style={{ borderRadius: "8px" }} />
    </div>
  );
}

// Avatar with text skeleton (for member lists)
export function SkeletonAvatarWithText({ className = "" }) {
  return (
    <div className={`skeleton-avatar-text ${className}`}>
      <SkeletonCircle size="40px" />
      <div className="skeleton-avatar-text-content">
        <SkeletonBox height="14px" width="70%" />
        <SkeletonBox height="12px" width="85%" style={{ marginTop: "6px" }} />
      </div>
    </div>
  );
}

// Inline comment skeleton (for replacing "Posting..." text)
export function SkeletonCommentInline({ className = "" }) {
  return (
    <div className={`skeleton-comment-inline ${className}`}>
      <SkeletonCircle size="28px" />
      <SkeletonBox height="14px" width="40%" style={{ marginLeft: "8px" }} />
    </div>
  );
}

// Form field skeleton
export function SkeletonFormField({ label = true, className = "" }) {
  return (
    <div className={`skeleton-form-field ${className}`}>
      {label && <SkeletonBox height="14px" width="20%" style={{ marginBottom: "8px" }} />}
      <SkeletonBox height="40px" width="100%" style={{ borderRadius: "6px" }} />
    </div>
  );
}

// Tab skeleton
export function SkeletonTab({ count = 3, className = "" }) {
  return (
    <div className={`skeleton-tabs ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonBox key={idx} height="36px" width="100px" style={{ marginRight: "12px" }} />
      ))}
    </div>
  );
}
