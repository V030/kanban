import { useEffect, useMemo, useState } from "react";

function getMimeType(file) {
  return String(file?.mime_type || file?.mimeType || "").toLowerCase();
}

function getFileName(file) {
  return String(file?.file_name || file?.fileName || file?.name || "Attachment");
}

function getFileExtension(file) {
  const name = getFileName(file);
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

export function isPreviewSupported(file) {
  const mime = getMimeType(file);
  const ext = getFileExtension(file);

  if (["image/jpeg", "image/png", "image/webp"].includes(mime) || ["jpg", "jpeg", "png", "webp"].includes(ext)) return true;
  if (mime === "application/pdf" || ext === "pdf") return true;
  if (mime === "video/mp4" || ext === "mp4") return true;
  if (mime === "text/plain" || ext === "txt") return true;
  return false;
}

export default function FilePreview({ file }) {
  const [textContent, setTextContent] = useState("");
  const [previewError, setPreviewError] = useState("");
  const mime = getMimeType(file);
  const ext = getFileExtension(file);
  const fileName = getFileName(file);
  const url = file?.url || "";

  const previewType = useMemo(() => {
    if (["image/jpeg", "image/png", "image/webp"].includes(mime) || ["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
    if (mime === "application/pdf" || ext === "pdf") return "pdf";
    if (mime === "video/mp4" || ext === "mp4") return "video";
    if (mime === "text/plain" || ext === "txt") return "text";
    return "download";
  }, [ext, mime]);

  useEffect(() => {
    let cancelled = false;
    setTextContent("");
    setPreviewError("");

    if (previewType !== "text" || !url) return undefined;

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Preview unavailable");
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setTextContent(text);
      })
      .catch(() => {
        if (!cancelled) setPreviewError("Preview unavailable. Download the file to view it.");
      });

    return () => {
      cancelled = true;
    };
  }, [previewType, url]);

  if (!url || previewType === "download") {
    return (
      <div className="tdm-file-preview-fallback">
        <div className="tdm-file-preview-icon" aria-hidden="true">FILE</div>
        <p>Preview is not available for this file type.</p>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="tdm-file-preview-fallback">
        <div className="tdm-file-preview-icon" aria-hidden="true">FILE</div>
        <p>{previewError}</p>
      </div>
    );
  }

  if (previewType === "image") {
    return <img className="tdm-file-preview-media" src={url} alt={fileName} onError={() => setPreviewError("Preview failed to load.")} />;
  }

  if (previewType === "pdf") {
    return <iframe className="tdm-file-preview-frame" src={url} title={fileName} onError={() => setPreviewError("Preview failed to load.")} />;
  }

  if (previewType === "video") {
    return <video className="tdm-file-preview-media" src={url} controls onError={() => setPreviewError("Preview failed to load.")} />;
  }

  if (previewType === "text") {
    if (previewError) return <div className="tdm-file-preview-fallback"><p>{previewError}</p></div>;
    return <pre className="tdm-file-preview-text">{textContent || "Loading preview..."}</pre>;
  }

  return (
    <div className="tdm-file-preview-fallback">
      <div className="tdm-file-preview-icon" aria-hidden="true">FILE</div>
      <p>{previewError || "Preview is not available for this file type."}</p>
    </div>
  );
}
