import { useState } from "react";
import { useLocation } from "wouter";
import { HelpCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../lib/auth";

const GOLD = "#C9A84C";
const DARK = "#2D2A25";
const CREAM = "#F8F5F0";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const PROGRESS_PURPLE = "#6B568F";

const FAQ_BY_ROUTE: Record<string, { q: string; a: string }[]> = {
  "/dashboard": [
    { q: "What is the Dashboard?", a: "Your home base — it shows today's schedule across all your trackers in one place, so you always know what to study next." },
    { q: "What are the small task chips for?", a: "Quick one-off to-dos you add yourself, separate from your regular study plan. Tap the circle to mark them done." },
  ],
  "/roadmap": [
    { q: "What is Topic Completion?", a: "This is where you go through new topics for the first time — lectures, concepts, the actual learning. It's the foundation everything else builds on." },
    { q: "How do I use Topic Completion?", a: "Open a subject, pick a topic, and work through its subtopics one by one. Tick each subtopic off as you finish it — your progress bar updates automatically." },
    { q: "Why did my calendar change on its own?", a: "Once a subject reaches 100% complete, its future study time gets freed up automatically and the rest of your schedule shifts earlier to fill the gap — no wasted days." },
  ],
  "/assignments": [
    { q: "What is Question Practice?", a: "This is where you solve problems and track how you're doing — accuracy, speed, and mistakes — separately from just learning the topic." },
    { q: "How do I log an attempt?", a: "Open a topic or subtopic, tap the log button, and record your accuracy, concept understanding, speed, and any mistakes you made." },
    { q: "What does marking a topic 'Done' do here?", a: "It's independent from Topic Completion — marking done here only affects your Question Practice schedule, not your lectures." },
  ],
  "/revision-tracker": [
    { q: "What is Revision Tracker?", a: "This is where you come back to what you've already learned and rate how confident you feel, so nothing gets forgotten before your exam." },
    { q: "How do I log a revision?", a: "Open a topic, tap 'Mark Revised', and pick how confident you felt — Not Confident, Somewhat Confident, or Very Confident." },
    { q: "Can I see my past revisions?", a: "Yes — tap 'Revised Nx' under any topic to expand its full history with dates and confidence levels." },
  ],
  "/note-tracker": [
    { q: "What is Note Tracker?", a: "A simple checklist to track which topics you've made notes for, separate from your actual study progress." },
    { q: "How do I use it?", a: "Tap 'Mark Done' on a topic once you've finished writing notes for it. That's it." },
  ],
  "/daily-tracker": [
    { q: "What is the Daily Tracker?", a: "A day-by-day log of your overall study routine, so you can look back and see your consistency over time." },
  ],
};

const DEFAULT_FAQ = [
  { q: "How does PrepPilot work?", a: "Your prep is split across four trackers — Topic Completion (learning), Question Practice (solving), Revision (recalling), and Note Tracker (notes) — each with its own schedule, so nothing gets mixed up." },
  { q: "Why do I have separate calendars?", a: "Learning, practicing, and revising take different amounts of time and happen on different days for most students — so each tracker paces itself independently." },
];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const { user } = useAuth();
  const [location] = useLocation();

  const faqs = FAQ_BY_ROUTE[location] ?? DEFAULT_FAQ;
  const firstName = ((user as any)?.name as string | undefined)?.split(" ")[0] ?? "there";

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 50,
          width: 52, height: 52, borderRadius: "50%",
          background: `linear-gradient(135deg, #A07840 0%, ${PROGRESS_PURPLE} 100%)`,
          color: "#fff", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(61,53,48,.25)",
        }}
        aria-label="Help"
      >
        {open ? <X size={22} /> : <HelpCircle size={24} />}
      </button>

      {open && (
        <div
          style={{
            position: "fixed", bottom: 84, right: 20, zIndex: 50,
            width: 320, maxHeight: "70vh", overflowY: "auto",
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
            boxShadow: "0 8px 32px rgba(61,53,48,.2)", padding: "1.25rem",
          }}
        >
          <p style={{ fontFamily: "serif", fontSize: "1rem", fontWeight: 700, color: DARK, marginBottom: "0.25rem" }}>
            Hi {firstName}, I'm your guide for this app!
          </p>
          <p style={{ fontSize: "0.78rem", color: MUTED, marginBottom: "1rem" }}>
            Here's some help for what you're looking at right now.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {faqs.map((item, i) => {
              const isOpen = expandedQ === i;
              return (
                <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                  <button
                    onClick={() => setExpandedQ(isOpen ? null : i)}
                    style={{
                      width: "100%", textAlign: "left", padding: "0.6rem 0.75rem",
                      background: CREAM, border: "none", cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      fontSize: "0.82rem", fontWeight: 600, color: DARK,
                    }}
                  >
                    {item.q}
                    {isOpen ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0.65rem 0.75rem", fontSize: "0.8rem", color: MUTED, lineHeight: 1.5 }}>
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
