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

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return true;
  if (mime === "application/pdf" || ext === "pdf") return true;
  if (mime.startsWith("video/") || ["mp4", "webm"].includes(ext)) return true;
  if (mime.startsWith("audio/") || ["mp3", "wav"].includes(ext)) return true;
  if (mime.startsWith("text/") || ["txt", "json", "md", "csv"].includes(ext)) return true;
  return false;
}

export default function FilePreview({ file }) {
  const [textContent, setTextContent] = useState("");
  const [previewError, setPreviewError] = useState("");
  const mime = getMimeType(file);
  const ext = getFileExtension(file);
  const fileName = getFileName(file);
  const url = file?.url || "";
  const driveFileId = String(file?.drive_file_id || file?.driveFileId || "").trim();
  const drivePreviewUrl = driveFileId ? `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/preview` : url;

  const previewType = useMemo(() => {
    if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
    if (mime === "application/pdf" || ext === "pdf") return "pdf";
    if (mime.startsWith("video/") || ["mp4", "webm"].includes(ext)) return "video";
    if (mime.startsWith("audio/") || ["mp3", "wav"].includes(ext)) return "audio";
    if (mime.startsWith("text/") || ["txt", "json", "md", "csv"].includes(ext)) return "text";
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

  if (previewType === "image") {
    return <img className="tdm-file-preview-media" src={url} alt={fileName} onError={() => setPreviewError("Preview failed to load.")} />;
  }

  if (previewType === "pdf") {
    return <iframe className="tdm-file-preview-frame" src={drivePreviewUrl} title={fileName} />;
  }

  if (previewType === "video") {
    return <video className="tdm-file-preview-media" src={url} controls />;
  }

  if (previewType === "audio") {
    return <audio className="tdm-file-preview-audio" src={url} controls />;
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
