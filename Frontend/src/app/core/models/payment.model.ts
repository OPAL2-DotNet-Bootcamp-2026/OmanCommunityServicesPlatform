/** Paid urgent handling through Thawani (DTOs/PaymentDTOs.cs). */
import { type PaymentStatus } from "./enums";

/** POST /payment/checkout */
export interface CheckoutRequest {
  issueId: number;
}

/** Send the browser to payUrl, Thawani's hosted payment page. */
export interface CheckoutResponse {
  paymentId: number;
  payUrl: string;
}

/** GET /payment/{paymentId}; the server re-checks with Thawani while Pending. */
export interface PaymentStatusResponse {
  paymentId: number;
  status: PaymentStatus;
  isUrgent: boolean;
}
