import { useState } from "react";
import { useLocation } from "wouter";
import { HelpCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../lib/auth";

const DARK = "#2D2A25";
const CREAM = "#F8F5F0";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const PROGRESS_PURPLE = "#6B568F";

type QA = { q: string; a: string };
type Lang = "en" | "hi";

const FAQ_EN: Record<string, QA[]> = {
  "/dashboard": [
    { q: "What is the Dashboard?", a: "Your home base — it shows today's schedule pulled from all your trackers in one place, so you always know what to study next." },
    { q: "What are the small task chips for?", a: "Quick one-off to-dos you add yourself, separate from your regular study plan. Tap the circle to mark them done." },
    { q: "What are 'Added Tasks'?", a: "Tasks you added from the calendar popup on a specific day — they show up here too so you don't miss them." },
    { q: "Why is something missing from today's plan?", a: "If you haven't set up your roadmap calendar yet, or a tracker has no pace set, nothing will show. Check Topic Completion first." },
  ],
  "/roadmap": [
    { q: "What is Topic Completion?", a: "This is where you go through new topics for the first time — lectures, concepts, the actual learning. It's the foundation everything else builds on." },
    { q: "How do I use Topic Completion?", a: "Open a subject, pick a topic, and work through its subtopics one by one. Tick each subtopic off as you finish it — your progress bar updates automatically." },
    { q: "How is my calendar generated?", a: "Based on how many hours per day and which days you chose during setup, the app spreads your subjects' total hours across your available days automatically." },
    { q: "Why did my calendar change on its own?", a: "Once a subject reaches 100% complete, its future study time gets freed up automatically and the rest of your schedule shifts earlier to fill the gap — no wasted days." },
    { q: "What's the 'My Progress' tab?", a: "A checklist of every subtopic in your syllabus. Tick things off here as you actually learn them — this is what drives your subject completion percentage." },
    { q: "Can I redo my whole plan?", a: "Yes — you can go through the setup wizard again any time from your profile to pick new hours, days, or prep duration." },
  ],
  "/assignments": [
    { q: "What is Question Practice?", a: "This is where you solve problems and track how you're doing — accuracy, speed, and mistakes — separately from just learning the topic." },
    { q: "How do I log an attempt?", a: "Open a topic or subtopic, tap the log button, and record your accuracy, concept understanding, speed, and any mistakes you made." },
    { q: "What's the difference between topic-level and subtopic-level logging?", a: "Subtopic-level tracks a single concept (like 'Consistent and Inconsistent Systems'). Topic-level tracks the whole group (like 'System of Linear Equations') — they're independent, so use whichever matches what you actually practiced." },
    { q: "What does the '5+' mistake option do?", a: "It opens extra boxes so you can list more than 5 mistakes if you made that many — just tap '+ Add another mistake'." },
    { q: "What does marking a topic 'Done' do here?", a: "It's independent from Topic Completion — marking done here only affects your Question Practice schedule, not your lectures." },
    { q: "Why does my Question Practice calendar have different days than Topic Completion?", a: "Each tracker has its own hours-per-day and days-per-week, set during onboarding — they run on separate, independent schedules." },
  ],
  "/revision-tracker": [
    { q: "What is Revision Tracker?", a: "This is where you come back to what you've already learned and rate how confident you feel, so nothing gets forgotten before your exam." },
    { q: "How do I log a revision?", a: "Open a topic, tap 'Mark Revised', and pick how confident you felt — Not Confident, Somewhat Confident, or Very Confident." },
    { q: "Can I see my past revisions?", a: "Yes — tap 'Revised Nx' under any topic to expand its full history with dates and confidence levels." },
    { q: "What's the Revision Speed picker?", a: "It's inside the Calendar tab — pick a pace per subject (gentle to fast) and it adjusts how much time that subject gets in your revision schedule." },
    { q: "Can I revise a whole topic at once instead of each subtopic?", a: "Yes — every topic header also has its own 'Mark Revised' button, independent from its subtopics." },
  ],
  "/note-tracker": [
    { q: "What is Note Tracker?", a: "A simple checklist to track which topics you've made notes for, separate from your actual study progress." },
    { q: "How do I use it?", a: "Tap 'Mark Done' on a topic once you've finished writing notes for it. That's it." },
    { q: "Can I mark a whole topic group done, not just one subtopic?", a: "Yes — click the topic group header's 'Mark Done' button to mark the entire group in one tap." },
  ],
  "/daily-tracker": [
    { q: "What is the Daily Tracker?", a: "A day-by-day log of your overall study routine, so you can look back and see your consistency over time." },
  ],
  "/my-sessions": [
    { q: "What is this page?", a: "Your scheduled one-on-one sessions with Vaishnavi Ma'am — check here for upcoming times and past session notes." },
  ],
  "/sessions": [
    { q: "What is this page?", a: "Your scheduled sessions with Sagar Sir for Mathematics — check here for upcoming times and past session notes." },
  ],
  "/charts": [
    { q: "What are Reports?", a: "A visual summary of your overall progress across all trackers — use it to spot which subjects need more attention." },
  ],
};

const FAQ_HI: Record<string, QA[]> = {
  "/dashboard": [
    { q: "डैशबोर्ड क्या है?", a: "यह आपका होम बेस है — यहाँ आपके सभी ट्रैकर्स से आज का पूरा शेड्यूल एक जगह दिखता है, ताकि आपको हमेशा पता रहे कि आगे क्या पढ़ना है।" },
    { q: "छोटे टास्क चिप्स किसलिए हैं?", a: "ये आपके खुद जोड़े हुए छोटे टास्क हैं, आपके नियमित स्टडी प्लान से अलग। पूरा होने पर गोल पर टैप करें।" },
    { q: "'Added Tasks' क्या हैं?", a: "ये वे टास्क हैं जो आपने कैलेंडर पॉपअप से किसी खास दिन जोड़े थे — ये यहाँ भी दिखते हैं ताकि आप उन्हें मिस न करें।" },
    { q: "आज के प्लान में कुछ क्यों नहीं दिख रहा?", a: "अगर आपने अभी तक अपना रोडमैप कैलेंडर सेट नहीं किया है, या किसी ट्रैकर की पेस सेट नहीं है, तो कुछ नहीं दिखेगा। पहले Topic Completion चेक करें।" },
  ],
  "/roadmap": [
    { q: "Topic Completion क्या है?", a: "यहाँ आप नए विषयों को पहली बार पढ़ते हैं — लेक्चर, कॉन्सेप्ट्स, असली लर्निंग। यही बाकी सब चीज़ों की नींव है।" },
    { q: "Topic Completion का इस्तेमाल कैसे करें?", a: "एक सब्जेक्ट खोलें, एक टॉपिक चुनें, और उसके सबटॉपिक्स को एक-एक करके पूरा करें। हर सबटॉपिक पूरा होने पर टिक करें — आपका प्रोग्रेस बार अपने आप अपडेट हो जाएगा।" },
    { q: "मेरा कैलेंडर कैसे बनता है?", a: "सेटअप के दौरान आपने जितने घंटे और जिन दिनों को चुना था, उसी हिसाब से ऐप आपके सब्जेक्ट्स के कुल घंटों को आपके उपलब्ध दिनों में अपने आप बाँट देता है।" },
    { q: "मेरा कैलेंडर खुद-ब-खुद क्यों बदल गया?", a: "जब कोई सब्जेक्ट 100% पूरा हो जाता है, तो उसका भविष्य का स्टडी टाइम अपने आप खाली हो जाता है और बाकी शेड्यूल उस खाली जगह को भरने के लिए आगे खिसक जाता है — कोई दिन बर्बाद नहीं होता।" },
    { q: "'My Progress' टैब क्या है?", a: "यह आपके सिलेबस के हर सबटॉपिक की चेकलिस्ट है। जैसे-जैसे आप असल में सीखते जाएँ, यहाँ टिक करते जाएँ — यही आपके सब्जेक्ट कम्प्लीशन प्रतिशत को तय करता है।" },
    { q: "क्या मैं अपना पूरा प्लान दोबारा बना सकता/सकती हूँ?", a: "हाँ — आप कभी भी अपनी प्रोफाइल से सेटअप विज़ार्ड दोबारा चलाकर नए घंटे, दिन, या तैयारी की अवधि चुन सकते हैं।" },
  ],
  "/assignments": [
    { q: "Question Practice क्या है?", a: "यहाँ आप सवाल हल करते हैं और अपनी परफॉर्मेंस ट्रैक करते हैं — एक्यूरेसी, स्पीड, और गलतियाँ — सिर्फ टॉपिक सीखने से अलग।" },
    { q: "मैं एक अटेम्प्ट कैसे लॉग करूँ?", a: "एक टॉपिक या सबटॉपिक खोलें, लॉग बटन दबाएँ, और अपनी एक्यूरेसी, कॉन्सेप्ट समझ, स्पीड, और गलतियाँ दर्ज करें।" },
    { q: "टॉपिक-लेवल और सबटॉपिक-लेवल लॉगिंग में क्या फर्क है?", a: "सबटॉपिक-लेवल एक अकेले कॉन्सेप्ट को ट्रैक करता है (जैसे 'Consistent and Inconsistent Systems')। टॉपिक-लेवल पूरे ग्रुप को ट्रैक करता है (जैसे 'System of Linear Equations') — दोनों अलग-अलग हैं, जो भी आपने असल में प्रैक्टिस किया हो वही इस्तेमाल करें।" },
    { q: "'5+' गलतियों वाला ऑप्शन क्या करता है?", a: "यह अतिरिक्त बॉक्स खोल देता है ताकि अगर आपने 5 से ज़्यादा गलतियाँ की हों तो आप उन्हें लिख सकें — बस '+ Add another mistake' पर टैप करें।" },
    { q: "यहाँ किसी टॉपिक को 'Done' मार्क करने से क्या होता है?", a: "यह Topic Completion से अलग है — यहाँ Done मार्क करने से सिर्फ आपका Question Practice शेड्यूल प्रभावित होता है, आपके लेक्चर नहीं।" },
    { q: "मेरे Question Practice के दिन Topic Completion से अलग क्यों हैं?", a: "हर ट्रैकर के अपने घंटे-प्रति-दिन और दिन-प्रति-हफ्ता होते हैं, जो ऑनबोर्डिंग के दौरान सेट किए गए थे — ये अलग-अलग, स्वतंत्र शेड्यूल पर चलते हैं।" },
  ],
  "/revision-tracker": [
    { q: "Revision Tracker क्या है?", a: "यहाँ आप जो पहले से सीख चुके हैं उसे दोबारा देखते हैं और बताते हैं कि आपको कितना कॉन्फिडेंस है, ताकि एग्ज़ाम से पहले कुछ भी भूले नहीं।" },
    { q: "मैं रिविज़न कैसे लॉग करूँ?", a: "एक टॉपिक खोलें, 'Mark Revised' पर टैप करें, और बताएँ आपको कितना कॉन्फिडेंस था — Not Confident, Somewhat Confident, या Very Confident।" },
    { q: "क्या मैं अपने पुराने रिविज़न देख सकता/सकती हूँ?", a: "हाँ — किसी भी टॉपिक के नीचे 'Revised Nx' पर टैप करें और उसकी पूरी हिस्ट्री तारीखों और कॉन्फिडेंस लेवल के साथ देखें।" },
    { q: "Revision Speed पिकर क्या है?", a: "यह Calendar टैब के अंदर है — हर सब्जेक्ट के लिए एक पेस चुनें (धीमी से तेज़) और यह तय करता है कि उस सब्जेक्ट को आपके रिविज़न शेड्यूल में कितना समय मिलेगा।" },
    { q: "क्या मैं हर सबटॉपिक की जगह पूरा टॉपिक एक साथ रिवाइज़ कर सकता/सकती हूँ?", a: "हाँ — हर टॉपिक हेडर का अपना 'Mark Revised' बटन भी होता है, जो उसके सबटॉपिक्स से अलग काम करता है।" },
  ],
  "/note-tracker": [
    { q: "Note Tracker क्या है?", a: "यह एक सिंपल चेकलिस्ट है जो बताती है कि आपने किन टॉपिक्स के नोट्स बनाए हैं, आपकी असल स्टडी प्रोग्रेस से अलग।" },
    { q: "इसका इस्तेमाल कैसे करें?", a: "किसी टॉपिक के नोट्स बनाने के बाद उस पर 'Mark Done' टैप करें। बस इतना ही।" },
    { q: "क्या मैं एक सबटॉपिक की जगह पूरा टॉपिक ग्रुप डन मार्क कर सकता/सकती हूँ?", a: "हाँ — टॉपिक ग्रुप हेडर के 'Mark Done' बटन पर क्लिक करके पूरे ग्रुप को एक टैप में मार्क करें।" },
  ],
  "/daily-tracker": [
    { q: "Daily Tracker क्या है?", a: "यह आपकी पूरी स्टडी रूटीन का दिन-प्रतिदिन लॉग है, ताकि आप समय के साथ अपनी निरंतरता देख सकें।" },
  ],
  "/my-sessions": [
    { q: "यह पेज क्या है?", a: "यह वैष्णवी मैम के साथ आपके शेड्यूल्ड वन-ऑन-वन सेशंस हैं — आने वाले समय और पुराने सेशन नोट्स के लिए यहाँ देखें।" },
  ],
  "/sessions": [
    { q: "यह पेज क्या है?", a: "यह सागर सर के साथ गणित के आपके शेड्यूल्ड सेशंस हैं — आने वाले समय और पुराने सेशन नोट्स के लिए यहाँ देखें।" },
  ],
  "/charts": [
    { q: "Reports क्या हैं?", a: "यह सभी ट्रैकर्स में आपकी कुल प्रोग्रेस का एक विज़ुअल सारांश है — इसका इस्तेमाल करके देखें किन सब्जेक्ट्स पर ज़्यादा ध्यान देने की ज़रूरत है।" },
  ],
};

const DEFAULT_EN: QA[] = [
  { q: "How does PrepPilot work?", a: "Your prep is split across four trackers — Topic Completion (learning), Question Practice (solving), Revision (recalling), and Note Tracker (notes) — each with its own schedule, so nothing gets mixed up." },
  { q: "Why do I have separate calendars?", a: "Learning, practicing, and revising take different amounts of time and happen on different days for most students — so each tracker paces itself independently." },
];
const DEFAULT_HI: QA[] = [
  { q: "PrepPilot कैसे काम करता है?", a: "आपकी तैयारी चार ट्रैकर्स में बँटी है — Topic Completion (सीखना), Question Practice (हल करना), Revision (दोहराना), और Note Tracker (नोट्स) — हर एक का अपना शेड्यूल है, ताकि कुछ भी गड़बड़ न हो।" },
  { q: "मेरे अलग-अलग कैलेंडर क्यों हैं?", a: "सीखने, प्रैक्टिस करने, और रिवाइज़ करने में अलग-अलग समय लगता है और ज़्यादातर स्टूडेंट्स के लिए अलग दिनों पर होता है — इसलिए हर ट्रैकर अपनी पेस खुद तय करता है।" },
];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const { user } = useAuth();
  const [location] = useLocation();

  const faqSet = lang === "en" ? FAQ_EN : FAQ_HI;
  const defaultSet = lang === "en" ? DEFAULT_EN : DEFAULT_HI;
  const faqs = faqSet[location] ?? defaultSet;
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
            <p style={{ fontFamily: "serif", fontSize: "1rem", fontWeight: 700, color: DARK, margin: 0 }}>
              {lang === "en" ? `Hi ${firstName}, I'm your guide for this app!` : `नमस्ते ${firstName}, मैं इस ऐप में आपकी मदद के लिए हूँ!`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem" }}>
            <button
              onClick={() => setLang("en")}
              style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: 6, cursor: "pointer", background: lang === "en" ? PROGRESS_PURPLE : CREAM, color: lang === "en" ? "#fff" : MUTED, border: `1px solid ${lang === "en" ? PROGRESS_PURPLE : BORDER}` }}
            >
              English
            </button>
            <button
              onClick={() => setLang("hi")}
              style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: 6, cursor: "pointer", background: lang === "hi" ? PROGRESS_PURPLE : CREAM, color: lang === "hi" ? "#fff" : MUTED, border: `1px solid ${lang === "hi" ? PROGRESS_PURPLE : BORDER}` }}
            >
              हिंदी
            </button>
          </div>
          <p style={{ fontSize: "0.78rem", color: MUTED, marginBottom: "1rem" }}>
            {lang === "en" ? "Here's some help for what you're looking at right now." : "आप अभी जो देख रहे हैं, उसके बारे में यहाँ मदद है।"}
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
