import { BusinessIdentity, LegalLayout, LegalSection } from "./LegalLayout";

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Cancellation and Refund Policy"
      summary="Recurring plans can be stopped before renewal, and eligible payment refund requests can be made within seven days."
    >
      <LegalSection title="Seven-day refund requests">
        <p>
          You may request a refund within seven calendar days after a completed Monthly, Yearly,
          Lifetime, or renewal payment. Submit the request from Billing & Plans while signed in, or
          email support from the account’s registered email address.
        </p>
        <p>
          Submitting a request does not itself move money. We verify the payment, account ownership,
          request date, duplicate claims, and material abuse before approving a refund. Approved
          refunds are returned through Razorpay to the original payment method; bank processing time
          is outside GamiBAR’s control.
        </p>
      </LegalSection>
      <LegalSection title="Subscription cancellation">
        <p>
          Cancellation stops future renewal and normally takes effect at the end of the already-paid
          billing period. You retain access until that date. Cancellation alone does not
          automatically refund the current period; submit a separate refund request within the
          seven-day window if eligible.
        </p>
      </LegalSection>
      <LegalSection title="Lifetime purchases">
        <p>
          Lifetime access has no recurring renewal. An approved Lifetime refund permanently removes
          the paid entitlement from the account.
        </p>
      </LegalSection>
      <LegalSection title="Exceptions">
        <p>
          We may reject duplicate, fraudulent, chargeback-related, or materially abusive requests,
          including scripted consumption or account sharing that violates the Terms. This policy
          does not limit non-waivable remedies available under applicable consumer law.
        </p>
      </LegalSection>
      <LegalSection title="How to contact us">
        <p>
          Include your account email, payment date, amount, and reason. Never send card numbers, UPI
          PINs, OTPs, or banking passwords.
        </p>
      </LegalSection>
      <BusinessIdentity />
    </LegalLayout>
  );
}
