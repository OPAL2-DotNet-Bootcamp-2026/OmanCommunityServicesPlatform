import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { type Observable } from "rxjs";
import { apiEndpoints } from "../../core/api/api-endpoints";
import { type CheckoutRequest, type CheckoutResponse, type PaymentStatusResponse } from "../../core/models/payment.model";

/** Paid urgent handling through Thawani. The browser only ever sees the pay URL, never a key. */
@Injectable({ providedIn: "root" })
export class PaymentsService {
  private readonly http = inject(HttpClient);

  /** Opens a Thawani checkout for the issue; send the browser to payUrl. */
  startCheckout(issueId: number): Observable<CheckoutResponse> {
    const body: CheckoutRequest = { issueId };
    return this.http.post<CheckoutResponse>(apiEndpoints.checkout, body);
  }

  /** The server re-checks with Thawani while the payment is still Pending. */
  getStatus(paymentId: number): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(apiEndpoints.paymentById(paymentId));
  }
}
