import { BusinessIdentity, LegalLayout, LegalSection } from "./LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms and Conditions"
      summary="These terms govern author accounts, classroom sessions, paid plans, acceptable use, and access to GamiBAR."
    >
      <LegalSection title="Using GamiBAR">
        <p>
          Authors who create or manage rooms must provide accurate account information and, when
          purchasing a paid plan, accurate billing information. They must keep their login secure
          and use the service only for lawful educational, training, workshop, and collaboration
          activities. Hosts are responsible for the content they upload and the participants they
          invite.
        </p>
        <p>
          Joining and playing as a guest participant is free and does not require an account,
          subscription, or purchase. Guest participants should not submit sensitive personal
          information. A host using GamiBAR with children or students is responsible for obtaining
          any institution, parent, or guardian permissions required by law.
        </p>
      </LegalSection>
      <LegalSection title="Plans and limits">
        <p>
          Plans and their limits apply only to authors creating and managing rooms, not to people
          joining them. The Free author plan includes all six game modes, rooms for up to 100 live
          players, 20 AI generations per month, seven-day room lifespan, and one QRFile of up to 15
          MB retained for seven days.
        </p>
        <p>
          Pro Monthly, Pro Yearly, and Lifetime include rooms for up to 200 live players, fair-use
          unlimited AI generations, and one QRFile of up to 50 MB retained for 28 days. “Unlimited”
          means normal classroom and workshop usage, not unrestricted automated consumption.
        </p>
      </LegalSection>
      <LegalSection title="Fair use">
        <p>
          You may not use scripts or bots to flood generation or room endpoints, share one paid
          account between unrelated organisations, bypass plan limits, scrape private session data,
          interfere with other users, or upload malicious or infringing material. We may throttle
          abusive traffic, suspend compromised accounts, or require verification before restoring
          access.
        </p>
      </LegalSection>
      <LegalSection title="Payments">
        <p>
          Paid prices are displayed as the final GamiBAR charge. Checkout shows the payable amount
          before payment. Razorpay processes payment credentials; GamiBAR does not store full card,
          bank, or UPI credentials.
        </p>
        <p>
          Monthly and yearly subscriptions renew automatically until cancelled. Lifetime is a
          one-time payment and does not create a recurring mandate.
        </p>
      </LegalSection>
      <LegalSection title="AI-generated content">
        <p>
          AI output may be incomplete or incorrect. Authors must review generated questions,
          answers, explanations, and age suitability before presenting them to learners. Do not send
          confidential, regulated, or personally identifying learner data to the AI generator.
        </p>
      </LegalSection>
      <LegalSection title="Availability and liability">
        <p>
          We work to keep live sessions reliable but cannot guarantee uninterrupted availability of
          internet, cloud, payment, AI, or realtime providers. To the extent permitted by law,
          liability is limited to the amount you paid GamiBAR during the twelve months before the
          claim. Nothing here excludes rights that cannot legally be excluded.
        </p>
      </LegalSection>
      <LegalSection title="Termination and governing law">
        <p>
          You may stop using GamiBAR at any time. We may suspend access for material abuse, security
          threats, fraud, or unlawful activity. These terms are governed by Indian law, with courts
          in Bengaluru, Karnataka having jurisdiction, subject to applicable consumer law.
        </p>
      </LegalSection>
      <BusinessIdentity />
    </LegalLayout>
  );
}
