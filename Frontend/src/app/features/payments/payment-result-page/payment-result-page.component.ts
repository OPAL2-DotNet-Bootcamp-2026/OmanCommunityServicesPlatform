import { Component, type OnDestroy, type OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { errorMessage } from "../../../core/api/api-error";
import { type PaymentStatusResponse } from "../../../core/models/payment.model";
import { AppPaths } from "../../../core/routing/app-paths";
import { RevealOnEnterDirective } from "../../../shared/directives/reveal-on-enter.directive";
import { PaymentsService } from "../payments.service";

/** Thawani can take a moment to mark a session paid, so Pending is asked again. */
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

interface ResultView {
  icon: string;
  tone: "success" | "warning" | "secondary" | "danger";
  title: string;
  message: string;
  canCheckAgain: boolean;
}

/**
 * Where Thawani sends the citizen back after paying or cancelling. Arriving
 * here proves nothing - anyone can type this address - so the page only shows
 * what our API confirmed with Thawani.
 */
@Component({
  selector: "ocsp-payment-result-page",
  imports: [RouterLink, RevealOnEnterDirective],
  templateUrl: "./payment-result-page.component.html",
  styleUrl: "./payment-result-page.component.css"
})
export class PaymentResultPageComponent implements OnInit, OnDestroy {
  private readonly payments = inject(PaymentsService);
  private readonly route = inject(ActivatedRoute);

  protected readonly paths = AppPaths;
  /** Null while checking. */
  protected readonly view = signal<ResultView | null>(null);
  private checking = false;
  private destroyed = false;

  ngOnInit(): void {
    void this.check();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  /** Asks up to MAX_ATTEMPTS times, stopping as soon as the answer is final. */
  protected async check(): Promise<void> {
    const paymentId = Number(this.route.snapshot.queryParamMap.get("paymentId"));
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      this.view.set({ icon: "bi-question-circle", tone: "danger", title: "Payment not found",
        message: "This link does not include a valid payment. Open My Issues to see your issue.", canCheckAgain: false });
      return;
    }
    if (this.checking) return;
    this.checking = true;
    this.view.set(null);

    try {
      let payment = await firstValueFrom(this.payments.getStatus(paymentId));
      for (let attempt = 1; attempt < MAX_ATTEMPTS && payment.status === "Pending" && !this.destroyed; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS));
        payment = await firstValueFrom(this.payments.getStatus(paymentId));
      }
      this.view.set(viewFor(payment));
    } catch (error) {
      const reason = errorMessage(error, "Please try again.").trim();
      this.view.set({ icon: "bi-exclamation-triangle", tone: "danger", title: "We could not check this payment",
        message: `${reason}${/[.!?]$/.test(reason) ? "" : "."} Your issue itself was already submitted.`, canCheckAgain: true });
    } finally {
      this.checking = false;
    }
  }
}

function viewFor(payment: PaymentStatusResponse): ResultView {
  switch (payment.status) {
    case "Paid":
      return { icon: "bi-lightning-charge-fill", tone: "success", title: "Your issue is now urgent",
        message: "Thawani confirmed your payment. Your issue is marked Urgent for the municipal team.", canCheckAgain: false };
    case "Cancelled":
      return { icon: "bi-x-circle", tone: "secondary", title: "Not charged",
        message: "The payment was cancelled, so nothing was charged. Your issue was submitted normally.", canCheckAgain: false };
    default:
      return { icon: "bi-hourglass-split", tone: "warning", title: "Still confirming your payment",
        message: "Thawani has not confirmed the payment yet. Check again in a minute - the Urgent badge appears on your issue once it is confirmed.",
        canCheckAgain: true };
  }
}
