import { BUSINESS_DETAILS } from "@shared/legal/business";
import { BusinessIdentity, LegalLayout, LegalSection } from "./LegalLayout";

export default function ContactPage() {
  return (
    <LegalLayout
      title="Contact and Support"
      summary="Contact NorthNode Technologies for GamiBAR account, billing, privacy, security, or classroom support."
    >
      <LegalSection title="Support">
        <p>
          Email:{" "}
          <a className="font-semibold underline" href={`mailto:${BUSINESS_DETAILS.supportEmail}`}>
            {BUSINESS_DETAILS.supportEmail}
          </a>
        </p>
        <p>
          Phone:{" "}
          <a className="font-semibold underline" href="tel:+916303392391">
            {BUSINESS_DETAILS.phone}
          </a>
        </p>
        <p>
          When contacting us about a payment, include your GamiBAR account email and payment date,
          but never share your card number, UPI PIN, OTP, API key, or password.
        </p>
      </LegalSection>
      <LegalSection title="Security reports">
        <p>
          Use the support email with the subject “Security report”. Include the affected URL, what
          you observed, and safe reproduction steps. Do not access or retain another user’s data
          while investigating.
        </p>
      </LegalSection>
      <BusinessIdentity />
    </LegalLayout>
  );
}
