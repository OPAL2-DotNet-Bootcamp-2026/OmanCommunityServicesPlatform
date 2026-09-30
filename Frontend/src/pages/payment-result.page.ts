/**
 * Where Thawani sends the citizen back after paying or cancelling.
 *
 * Arriving here proves nothing - anyone can type this URL. The page only asks
 * our API, which asks Thawani, and shows whatever that confirmation says.
 */
import { bindActions, byId, errorMessage, loadPageElements, toTone } from "../dom";
import { escapeHtml } from "../components/issue-renderers";
import * as feedback from "../components/feedback";
import type { PaymentStatusResponse } from "../models";
import type { DataService } from "../services/data.service";
import type { SessionService } from "../services/session.service";

/** Thawani can take a moment to mark a session paid, so Pending is re-asked. */
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

interface PaymentResultElements {
  result: HTMLElement;
  pageStatus: HTMLElement;
}

interface ResultView {
  icon: string;
  tone: "success" | "warning" | "secondary" | "danger";
  title: string;
  message: string;
  canCheckAgain?: boolean;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

export class PaymentResultPage {
  private elements!: PaymentResultElements;
  private checking = false;

  constructor(
    private readonly data: DataService,
    private readonly session: SessionService
  ) {}

  private cacheElements(): PaymentResultElements {
    return {
      result: byId<HTMLElement>("paymentResult"),
      pageStatus: byId<HTMLElement>("paymentPageStatus")
    };
  }

  private static paymentIdFromUrl(): number | null {
    const paymentId = Number(new URLSearchParams(window.location.search).get("paymentId"));
    return Number.isInteger(paymentId) && paymentId > 0 ? paymentId : null;
  }

  private static viewFor(payment: PaymentStatusResponse): ResultView {
    switch (payment.status) {
      case "Paid":
        return {
          icon: "bi-lightning-charge-fill",
          tone: "success",
          title: "Your issue is now urgent",
          message: "Thawani confirmed your payment. Your issue is marked Urgent for the municipal team."
        };
      case "Cancelled":
        return {
          icon: "bi-x-circle",
          tone: "secondary",
          title: "Not charged",
          message: "The payment was cancelled, so nothing was charged. Your issue was submitted normally."
        };
      default:
        return {
          icon: "bi-hourglass-split",
          tone: "warning",
          title: "Still confirming your payment",
          message: "Thawani has not confirmed the payment yet. Check again in a minute - the Urgent badge appears on your issue once it is confirmed.",
          canCheckAgain: true
        };
    }
  }

  private render(view: ResultView): void {
    const checkAgain = view.canCheckAgain
      ? '<button class="ocsp-button ocsp-button--cancel" data-action="check-again" type="button"><i class="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>Check again</button>'
      : "";
    this.elements.result.innerHTML = `
      <div class="ocsp-card p-4 p-md-5 text-center">
        <i class="bi ${view.icon} display-5 text-${view.tone} d-block mb-3" aria-hidden="true"></i>
        <h2 class="h4">${escapeHtml(view.title)}</h2>
        <p class="text-secondary mb-4">${escapeHtml(view.message)}</p>
        <div class="d-flex flex-column flex-sm-row justify-content-center gap-2">
          <a class="ocsp-button ocsp-button--submit" href="my-issues.html"><i class="bi bi-arrow-left me-2" aria-hidden="true"></i>Back to My Issues</a>
          ${checkAgain}
        </div>
      </div>`;
    this.elements.result.setAttribute("aria-busy", "false");
  }

  private renderChecking(): void {
    this.elements.result.setAttribute("aria-busy", "true");
    this.elements.result.innerHTML = `
      <div class="ocsp-card p-4 text-center" role="status">
        <span class="spinner-border text-primary mx-auto mb-3" aria-hidden="true"></span>
        <span class="d-block">Checking your payment with Thawani...</span>
      </div>`;
  }

  /** Asks up to MAX_ATTEMPTS times, stopping as soon as the answer is final. */
  private checkPayment = async (): Promise<void> => {
    const paymentId = PaymentResultPage.paymentIdFromUrl();
    if (paymentId === null) {
      this.render({
        icon: "bi-question-circle",
        tone: "danger",
        title: "Payment not found",
        message: "This link does not include a valid payment. Open My Issues to see your issue."
      });
      return;
    }
    if (this.checking) return;
    this.checking = true;
    this.renderChecking();

    try {
      let payment = await this.data.getPaymentStatus(paymentId);
      for (let attempt = 1; attempt < MAX_ATTEMPTS && payment.status === "Pending"; attempt++) {
        await wait(RETRY_DELAY_MS);
        payment = await this.data.getPaymentStatus(paymentId);
      }
      this.render(PaymentResultPage.viewFor(payment));
    } catch (error) {
      this.render({
        icon: "bi-exclamation-triangle",
        tone: "danger",
        title: "We could not check this payment",
        message: `${errorMessage(error, "Please try again.")} Your issue itself was already submitted.`,
        canCheckAgain: true
      });
    } finally {
      this.checking = false;
    }
  };

  start(): void {
    const elements = loadPageElements(
      () => this.cacheElements(), "paymentPageStatus", "The payment page failed to start.", "mb-4"
    );
    if (!elements) return;
    this.elements = elements;

    const flash = this.session.consumeFlash();
    bindActions(this.elements.result, "click", { "check-again": () => this.checkPayment() });
    void this.checkPayment();
    if (flash?.message) {
      feedback.show(flash.message, { tone: toTone(flash.tone) });
    }
  }
}
