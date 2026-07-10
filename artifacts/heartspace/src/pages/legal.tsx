import { Link } from "wouter";

const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const CARD = "#FFFDF9";

function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "3rem 1.25rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/">
          <a style={{ color: GOLD, fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>&larr; Back to PrepPilot</a>
        </Link>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "2.5rem", marginTop: "1.25rem" }}>
          <h1 style={{ fontFamily: "serif", fontSize: "1.9rem", fontWeight: 700, color: CHARCOAL, marginBottom: "0.25rem" }}>{title}</h1>
          <p style={{ color: MUTED, fontSize: "0.85rem", marginBottom: "2rem" }}>Last updated: {updated}</p>
          <div style={{ color: CHARCOAL, fontSize: "0.95rem", lineHeight: 1.75 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: CHARCOAL, marginTop: "1.75rem", marginBottom: "0.6rem" }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: "0.9rem" }}>{children}</p>;
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul style={{ marginBottom: "0.9rem", paddingLeft: "1.3rem", listStyle: "disc" }}>{children}</ul>;
}

export function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 10, 2026">
      <P>PrepPilot ("we", "us", "our"), including its integrated counselling section HeartSpace, is operated by Vaishnavi Saxena. This Privacy Policy explains how we collect, use, store, and protect your information when you use our platform at preppilot.co.in.</P>

      <H2>Information We Collect</H2>
      <Ul>
        <li>Account details: name, email address, and phone number provided at signup</li>
        <li>Academic information: exam type, syllabus progress, study schedules, question practice logs, revision and note-tracking data</li>
        <li>Counselling information (HeartSpace section): session bookings, mood tracking, and communications you choose to share, treated with additional confidentiality</li>
        <li>Payment information: processed securely by our payment partner, Razorpay. We do not store your card, UPI, or bank details on our servers</li>
        <li>Usage data: pages visited, features used, and device/browser information, collected to improve the platform</li>
      </Ul>

      <H2>How We Use Your Information</H2>
      <Ul>
        <li>To provide and personalize your study roadmap, tracking tools, and counselling services</li>
        <li>To process payments and manage your subscription or session bookings</li>
        <li>To communicate with you about your account, sessions, or platform updates</li>
        <li>To improve platform features based on aggregated, anonymized usage patterns</li>
      </Ul>

      <H2>Data Storage & Security</H2>
      <P>Your data is stored securely using Supabase, an industry-standard database and authentication provider with encryption at rest and in transit. Access to your personal data is restricted to what is necessary to operate the platform.</P>

      <H2>Third-Party Services</H2>
      <P>We use the following third-party services, each with their own privacy practices:</P>
      <Ul>
        <li><strong>Supabase</strong> — data storage and authentication</li>
        <li><strong>Razorpay</strong> — payment processing</li>
        <li><strong>Vercel</strong> — website hosting</li>
      </Ul>

      <H2>Your Rights</H2>
      <P>You may request access to, correction of, or deletion of your personal data at any time by contacting us at the email below. You may also close your account, which will remove your access; some data may be retained as required for legal or accounting purposes.</P>

      <H2>Children's Privacy</H2>
      <P>PrepPilot is intended for students preparing for postgraduate entrance exams (typically 18+). We do not knowingly collect data from children under 13.</P>

      <H2>Changes to This Policy</H2>
      <P>We may update this Privacy Policy from time to time. Continued use of the platform after changes constitutes acceptance of the updated policy.</P>

      <H2>Contact Us</H2>
      <P>For any privacy-related questions or requests, contact us at <strong>vaishnaviisaxena@gmail.com</strong>.</P>
    </LegalShell>
  );
}

export function TermsConditions() {
  return (
    <LegalShell title="Terms & Conditions" updated="July 10, 2026">
      <P>By accessing or using PrepPilot (including its HeartSpace counselling section) at preppilot.co.in, you agree to the following terms and conditions.</P>

      <H2>Use of the Platform</H2>
      <Ul>
        <li>You must provide accurate information when creating an account</li>
        <li>You are responsible for maintaining the confidentiality of your login credentials</li>
        <li>You agree not to misuse the platform, including attempting unauthorized access, disrupting service, or sharing your account with others</li>
      </Ul>

      <H2>Academic Content</H2>
      <P>PrepPilot provides study roadmaps, tracking tools, and practice resources for IIT JAM and CSIR NET/GATE Mathematics preparation. While we aim for accuracy, we do not guarantee specific exam outcomes or results.</P>

      <H2>Counselling Services (HeartSpace)</H2>
      <P>Counselling sessions booked through HeartSpace are provided by Vaishnavi Saxena. These sessions are for personal support and are not a substitute for emergency mental health services. If you are in crisis, please contact a local emergency service or helpline immediately.</P>

      <H2>Payments & Subscriptions</H2>
      <P>Paid features, where applicable, are billed through Razorpay. Prices and available plans are displayed at the time of purchase. By completing a payment, you agree to the amount and terms shown.</P>

      <H2>Intellectual Property</H2>
      <P>All content, design, and materials on PrepPilot are the property of Vaishnavi Saxena / The Heart Space, unless otherwise noted, and may not be copied or redistributed without permission.</P>

      <H2>Limitation of Liability</H2>
      <P>PrepPilot is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform, to the maximum extent permitted by law.</P>

      <H2>Termination</H2>
      <P>We reserve the right to suspend or terminate accounts that violate these terms.</P>

      <H2>Changes to These Terms</H2>
      <P>We may revise these terms from time to time. Continued use of the platform after changes constitutes acceptance of the revised terms.</P>

      <H2>Contact Us</H2>
      <P>For questions about these terms, contact us at <strong>vaishnaviisaxena@gmail.com</strong>.</P>
    </LegalShell>
  );
}

export function CancellationRefund() {
  return (
    <LegalShell title="Cancellation & Refund Policy" updated="July 10, 2026">
      <H2>Subscription Cancellation</H2>
      <P>You may cancel your PrepPilot subscription at any time from your account settings, or by contacting us at the email below. Cancellation will stop future billing; you will continue to have access to paid features until the end of your current billing period.</P>

      <H2>Refunds</H2>
      <Ul>
        <li>Refund requests must be made within 7 days of the original payment</li>
        <li>Refunds are considered on a case-by-case basis, particularly where a technical issue prevented access to paid features</li>
        <li>Approved refunds will be processed back to the original payment method within 5–7 business days via Razorpay</li>
        <li>No refunds are provided for partial use of a billing period after the 7-day window</li>
      </Ul>

      <H2>Counselling Session Cancellations (HeartSpace)</H2>
      <Ul>
        <li>Sessions can be rescheduled or cancelled up to 24 hours before the scheduled time at no charge</li>
        <li>Cancellations made less than 24 hours before a session may not be eligible for a refund, at the counsellor's discretion</li>
        <li>No-shows are non-refundable</li>
      </Ul>

      <H2>How to Request a Cancellation or Refund</H2>
      <P>Email <strong>vaishnaviisaxena@gmail.com</strong> with your registered email address and a brief description of your request. We aim to respond within 2 business days.</P>
    </LegalShell>
  );
}

export function ShippingDelivery() {
  return (
    <LegalShell title="Delivery Policy" updated="July 10, 2026">
      <P>PrepPilot is a fully digital platform. We do not ship any physical goods. This policy explains how access to our digital services is delivered.</P>

      <H2>Account Access</H2>
      <P>Upon successful signup, you receive immediate access to PrepPilot's free features. There is no waiting period or physical delivery involved.</P>

      <H2>Paid Feature Access</H2>
      <P>Once a payment is successfully processed via Razorpay, access to paid features is granted instantly to your account. If access is not granted within 30 minutes of a successful payment, please contact us at the email below.</P>

      <H2>Counselling Sessions (HeartSpace)</H2>
      <P>Booked counselling sessions are confirmed via email/in-app notification, with session details (date, time, and mode — video call or in-person, as applicable) shared directly by Vaishnavi Saxena.</P>

      <H2>Service Availability</H2>
      <P>PrepPilot is accessible online 24/7, subject to routine maintenance and factors outside our control (e.g., internet connectivity, hosting provider uptime).</P>

      <H2>Contact Us</H2>
      <P>For any access issues, contact us at <strong>vaishnaviisaxena@gmail.com</strong>.</P>
    </LegalShell>
  );
}

export function ContactUs() {
  return (
    <LegalShell title="Contact Us" updated="July 10, 2026">
      <P>We're happy to help with any questions about PrepPilot, HeartSpace, your account, or payments.</P>

      <H2>Email</H2>
      <P><strong>vaishnaviisaxena@gmail.com</strong></P>

      <H2>Business Owner</H2>
      <P>Vaishnavi Saxena</P>

      <H2>Platform</H2>
      <P>PrepPilot by The Heart Space with Vaishnavi Saxena<br />preppilot.co.in</P>

      <H2>Response Time</H2>
      <P>We aim to respond to all queries within 2 business days.</P>
    </LegalShell>
  );
}
