import { BusinessIdentity, LegalLayout, LegalSection } from "./LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      summary="This policy explains what GamiBAR collects, why it is used, and the choices available to authors and participants."
    >
      <LegalSection title="Information we collect">
        <p>
          For author accounts we process name, email, authentication records, billing details, plan
          status, payment references, support messages, and usage counters. For sessions we process
          room configuration, participant display names, answers, scores, timestamps, and files
          intentionally uploaded by the host.
        </p>
        <p>
          We also process limited security and diagnostic information such as IP address, browser
          information, request identifiers, rate-limit activity, and error logs.
        </p>
      </LegalSection>
      <LegalSection title="Why we use information">
        <p>
          We use data to authenticate users, run realtime activities, save session results, process
          payments, provide plan limits, prevent abuse, respond to support requests, comply with tax
          and accounting duties, and improve reliability.
        </p>
      </LegalSection>
      <LegalSection title="Service providers">
        <p>
          GamiBAR uses Supabase for authentication, database, storage, and realtime delivery;
          Razorpay for payments; configured AI providers for author-requested generation; Render or
          equivalent infrastructure for hosting; and configured analytics services for aggregate
          product measurement. Each provider processes only the information needed for its function.
        </p>
      </LegalSection>
      <LegalSection title="Retention">
        <p>
          Free-plan room data may expire after seven days. Paid room history remains available until
          the author deletes it or the account ends, subject to operational cleanup. QRFiles expire
          after the plan’s seven-day or 28-day window. Payment, invoice, refund, fraud-prevention,
          and tax records are retained for the period required by applicable Indian law.
        </p>
      </LegalSection>
      <LegalSection title="Security">
        <p>
          Server secrets are never intentionally sent to the browser. Payment signatures and
          webhooks are verified, billing tables are server-only, database row security remains
          enabled, and sensitive transport uses HTTPS. No online system can guarantee absolute
          security, so report suspected compromise immediately.
        </p>
      </LegalSection>
      <LegalSection title="Your choices">
        <p>
          You may request access, correction, export, or deletion of eligible personal data by
          emailing support. Some payment and tax records cannot be deleted immediately where
          retention is legally required. You may cancel marketing communication without affecting
          transactional notices.
        </p>
      </LegalSection>
      <LegalSection title="Children and educational use">
        <p>
          GamiBAR is designed for host-led educational activities. Participant accounts are not
          required for guest play. Schools and hosts must avoid entering unnecessary learner
          personal data and must obtain any consent required for their use.
        </p>
      </LegalSection>
      <BusinessIdentity />
    </LegalLayout>
  );
}
