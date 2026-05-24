import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FeedbackPage from "./FeedbackPage";

var mockSubmitFeedback = jest.fn();
var mockShowValidationError = jest.fn();
var mockShowSuccess = jest.fn();
var mockShowError = jest.fn();

jest.mock("../services/feedbackService", () => ({
  submitFeedback: (...args) => mockSubmitFeedback(...args),
}));

jest.mock("../services/authService", () => ({
  getCurrentUser: () => ({
    firstName: "Maya",
    lastName: "Lee",
    email: "maya@example.com",
  }),
}));

jest.mock("../hooks/useToast", () => ({
  useToast: () => ({
    showValidationError: (...args) => mockShowValidationError(...args),
    showSuccess: (...args) => mockShowSuccess(...args),
    showError: (...args) => mockShowError(...args),
  }),
}));

describe("FeedbackPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows validation errors when required fields are missing", async () => {
    render(<FeedbackPage />);

    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

    expect(await screen.findByText("Please enter a subject.")).toBeInTheDocument();
    expect(screen.getByText("Please choose a valid feedback category.")).toBeInTheDocument();
    expect(screen.getByText("Please enter a feedback message.")).toBeInTheDocument();
    expect(mockShowValidationError).toHaveBeenCalledWith("Please fix the highlighted feedback fields.");
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
  });

  it("sends feedback successfully and resets the form", async () => {
    mockSubmitFeedback.mockResolvedValueOnce({ message: "Feedback sent successfully" });

    render(<FeedbackPage />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Button overlap on dashboard" } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Bug Report" } });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: {
        value: "The dashboard header overlaps the primary content on smaller screens and blocks the first card.",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() => expect(mockSubmitFeedback).toHaveBeenCalledTimes(1));
    expect(mockSubmitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Button overlap on dashboard",
        category: "Bug Report",
      })
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Your feedback has been sent.");
    expect(mockShowSuccess).toHaveBeenCalledWith("Feedback sent successfully!");
    expect(screen.getByLabelText(/subject/i)).toHaveValue("");
    expect(screen.getByLabelText(/category/i)).toHaveValue("");
    expect(screen.getByLabelText(/message/i)).toHaveValue("");
  });

  it("prevents duplicate submits while a request is in flight", async () => {
    let resolveRequest;
    const pendingRequest = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    mockSubmitFeedback.mockReturnValueOnce(pendingRequest);

    render(<FeedbackPage />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Duplicate submission check" } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "General Feedback" } });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: {
        value: "This is a valid message that is long enough to pass the minimum character limit for submission.",
      },
    });

    const submitButton = screen.getByRole("button", { name: /send feedback/i });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(mockSubmitFeedback).toHaveBeenCalledTimes(1);

    resolveRequest({ message: "Feedback sent successfully" });
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled());
  });
});
