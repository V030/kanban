import { useMemo, useRef, useState } from "react";
import { useToast } from "../hooks/useToast";
import { submitFeedback } from "../services/feedbackService";
import { SendIcon, RefreshIcon } from "../components/common/AppIcons";
import "../components/styles/WorkspacePages.css";
import "../components/styles/FeedbackPage.css";

const CATEGORY_OPTIONS = [
  "Bug Report",
  "Feature Request",
  "UI/UX Feedback",
  "Performance Issue",
  "General Feedback",
  "Other",
];

const SUBJECT_MAX_LENGTH = 120;
const MESSAGE_MIN_LENGTH = 40;
const MESSAGE_MAX_LENGTH = 2000;
const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;
const NULL_CHARACTER_PATTERN = new RegExp(String.fromCharCode(0), "g");

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read screenshot"));
    reader.readAsDataURL(file);
  });
}

function sanitizeSingleLine(value) {
  return String(value || "")
    .replace(NULL_CHARACTER_PATTERN, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeMessage(value) {
  return String(value || "")
    .replace(NULL_CHARACTER_PATTERN, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function buildMetadata() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { browser: "", os: "", route: "" };
  }

  const browser = sanitizeSingleLine(navigator.userAgent || "");
  const platform = sanitizeSingleLine(navigator.userAgentData?.platform || navigator.platform || "");
  const route = sanitizeSingleLine(window.location?.pathname || "");

  return {
    browser,
    os: platform,
    route,
  };
}

function FeedbackPage() {
  const toast = useToast();
  const metadata = useMemo(() => buildMetadata(), []);
  const screenshotInputRef = useRef(null);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    subject: "",
    category: "",
    message: "",
  });

  const subjectCharactersLeft = Math.max(0, SUBJECT_MAX_LENGTH - sanitizeSingleLine(subject).length);
  const messageCharactersUsed = sanitizeMessage(message).length;
  const messageCharactersLeft = Math.max(0, MESSAGE_MAX_LENGTH - messageCharactersUsed);
  const canSubmit = !loading;

  const handleSubjectChange = (event) => {
    setSubject(event.target.value);
    setSuccessMessage("");
    setFormError("");
    setFieldErrors((current) => ({ ...current, subject: "" }));
  };

  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
    setSuccessMessage("");
    setFormError("");
    setFieldErrors((current) => ({ ...current, category: "" }));
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
    setSuccessMessage("");
    setFormError("");
    setFieldErrors((current) => ({ ...current, message: "" }));
  };

  const handleScreenshotChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.showValidationError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > SCREENSHOT_MAX_BYTES) {
      toast.showValidationError("Screenshot must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setScreenshot({
        dataUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      });
      setSuccessMessage("");
      setFormError("");
    } catch (error) {
      toast.showError(error?.message || "Failed to attach screenshot.");
    }
  };

  const clearScreenshot = () => {
    setScreenshot(null);
    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    const nextErrors = { subject: "", category: "", message: "" };

    const normalizedSubject = sanitizeSingleLine(subject);
    const normalizedMessage = sanitizeMessage(message).trim();

    if (!normalizedSubject) {
      nextErrors.subject = "Please enter a subject.";
    } else if (normalizedSubject.length > SUBJECT_MAX_LENGTH) {
      nextErrors.subject = `Subject must be ${SUBJECT_MAX_LENGTH} characters or fewer.`;
    }

    if (!CATEGORY_OPTIONS.includes(category)) {
      nextErrors.category = "Please choose a valid feedback category.";
    }

    if (!normalizedMessage) {
      nextErrors.message = "Please enter a feedback message.";
    } else if (normalizedMessage.length < MESSAGE_MIN_LENGTH) {
      nextErrors.message = `Please write at least ${MESSAGE_MIN_LENGTH} characters.`;
    } else if (normalizedMessage.length > MESSAGE_MAX_LENGTH) {
      nextErrors.message = `Feedback message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`;
    }

    setFieldErrors(nextErrors);

    return !nextErrors.subject && !nextErrors.category && !nextErrors.message;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccessMessage("");
    setFormError("");

    if (!validateForm()) {
      toast.showValidationError("Please fix the highlighted feedback fields.");
      return;
    }

    const normalizedSubject = sanitizeSingleLine(subject);
    const normalizedMessage = sanitizeMessage(message).trim();

    setLoading(true);

    try {
      await submitFeedback({
        subject: normalizedSubject,
        category,
        message: normalizedMessage,
        browser: metadata.browser,
        os: metadata.os,
        route: metadata.route,
        metadata,
        screenshot,
      });

      setSuccessMessage("Your feedback has been sent. Thank you for helping improve the app.");
      setSubject("");
      setCategory("");
      setMessage("");
      clearScreenshot();
      setFieldErrors({ subject: "", category: "", message: "" });
      toast.showSuccess("Feedback sent successfully!");
    } catch (error) {
      const messageText = error?.message || "Unable to send feedback right now.";
      setFormError(messageText);
      toast.showError(messageText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-shell feedback-page">
      <header className="workspace-hero feedback-hero">
        <div className="workspace-hero-content feedback-hero-content">
          <div>
            <h1 className="page-title">Send product feedback</h1>
            <p className="page-subtitle">
              Share bugs, feature ideas, or product impressions. Feedback is sent directly to the team by email and is not stored in the database.
            </p>
          </div>

          {/* <div className="feedback-hero-actions">
            <div className="feedback-chip">Authenticated</div>
            <div className="feedback-chip">Email only</div>
            <div className="feedback-chip">No database storage</div>
          </div> */}
        </div>
      </header>

      <div className="feedback-layout">
        <form className="feedback-form-panel" onSubmit={handleSubmit} noValidate>
          <div className="feedback-form-header">
            <div>
              <h2>Feedback form</h2>
              <p>Use the form below to describe the issue or idea clearly. The more context you provide, the more useful the email is for review.</p>
            </div>

            <div className="feedback-form-status" aria-live="polite">
              {loading ? "Sending..." : successMessage ? "Sent" : "Ready"}
            </div>
          </div>

          <div className="feedback-field">
            <label htmlFor="feedback-subject">Subject</label>
            <input
              id="feedback-subject"
              type="text"
              autoComplete="off"
              maxLength={SUBJECT_MAX_LENGTH}
              value={subject}
              onChange={handleSubjectChange}
              className={fieldErrors.subject ? "is-invalid" : ""}
              placeholder="Short summary of your feedback"
              aria-describedby="feedback-subject-help feedback-subject-error"
              aria-invalid={Boolean(fieldErrors.subject)}
            />
            <div className="feedback-field-meta">
              <span id="feedback-subject-help" className="feedback-helper-text">Keep it concise and specific.</span>
              <span className="feedback-counter">{Math.max(0, subjectCharactersLeft)} characters left</span>
            </div>
            {fieldErrors.subject && <div id="feedback-subject-error" className="field-error-text">{fieldErrors.subject}</div>}
          </div>

          <div className="feedback-field">
            <label htmlFor="feedback-category">Category</label>
            <select
              id="feedback-category"
              value={category}
              onChange={handleCategoryChange}
              className={fieldErrors.category ? "is-invalid" : ""}
              aria-describedby="feedback-category-error"
              aria-invalid={Boolean(fieldErrors.category)}
            >
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {fieldErrors.category && <div id="feedback-category-error" className="field-error-text">{fieldErrors.category}</div>}
          </div>

          <div className="feedback-field">
            <label htmlFor="feedback-message">Message</label>
            <textarea
              id="feedback-message"
              rows={9}
              value={message}
              onChange={handleMessageChange}
              className={fieldErrors.message ? "is-invalid feedback-message" : "feedback-message"}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder="Describe the problem, request, or idea in detail. Include steps to reproduce if relevant."
              aria-describedby="feedback-message-help feedback-message-error"
              aria-invalid={Boolean(fieldErrors.message)}
            />
            <div className="feedback-field-meta">
              <span id="feedback-message-help" className="feedback-helper-text">
                Minimum {MESSAGE_MIN_LENGTH} characters. Maximum {MESSAGE_MAX_LENGTH} characters.
              </span>
              <span className="feedback-counter">{Math.max(0, messageCharactersLeft)} characters left</span>
            </div>
            {fieldErrors.message && <div id="feedback-message-error" className="field-error-text">{fieldErrors.message}</div>}
          </div>

          {formError && <div className="feedback-error-banner" role="alert">{formError}</div>}
          {successMessage && <div className="feedback-success-banner" role="status">{successMessage}</div>}

          <div className="feedback-actions">
            <button type="submit" className="btn btn-primary" disabled={!canSubmit || loading}>
              <SendIcon size={18} />
              <span>{loading ? "Sending feedback..." : "Send feedback"}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSubject("");
                setCategory("");
                setMessage("");
                clearScreenshot();
                setFormError("");
                setSuccessMessage("");
                setFieldErrors({ subject: "", category: "", message: "" });
              }}
              disabled={loading}
            >
              <RefreshIcon size={18} />
              <span>Reset form</span>
            </button>
          </div>
        </form>

        <aside className="feedback-aside">
          <section className="feedback-card feedback-upload-card">
            <h3>Screenshot</h3>
            <p>Attach an image if it helps explain the issue. It will be sent with the feedback email.</p>
            <input
              ref={screenshotInputRef}
              id="feedback-screenshot"
              type="file"
              accept="image/*"
              className="feedback-screenshot-input"
              onChange={handleScreenshotChange}
              disabled={loading}
            />
            {screenshot ? (
              <div className="feedback-screenshot-preview">
                <img src={screenshot.dataUrl} alt="Selected feedback screenshot" />
                <div className="feedback-screenshot-meta">
                  <span>{screenshot.name}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearScreenshot} disabled={loading}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => screenshotInputRef.current?.click()}
                disabled={loading}
              >
                Upload screenshot
              </button>
            )}
          </section>

          <section className="feedback-card feedback-guidelines-card">
            <h3>What to include</h3>
            <ul>
              <li>Steps to reproduce a bug, if relevant.</li>
              <li>Expected behavior versus actual behavior.</li>
              <li>Any browser or device-specific details.</li>
              <li>Short examples or timing details for performance issues.</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default FeedbackPage;
