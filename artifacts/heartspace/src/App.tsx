import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/layout";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ResetPassword from "./pages/reset-password";
import ExamSelect from "./pages/exam-select";
import StudentDashboard from "./pages/student-dashboard";
import CounsellorDashboard from "./pages/counsellor-dashboard";
import MySessions from "./pages/my-sessions";
import RevisionTracker from "./pages/revision-tracker";
import NoteTracker from "./pages/note-tracker";
import CounsellorSessionsPage from "./pages/counsellor-sessions";
import CounsellorSessionsPage from "./pages/counsellor-sessions";
import Sessions from "./pages/sessions";
import Syllabus from "./pages/syllabus";
import QuestionPractice from "./pages/assignments";
import DailyTracker from "./pages/daily-tracker";
import StudentDetail from "./pages/student-detail";
import Roadmap from "./pages/roadmap";
import PerformanceCharts from "./pages/performance-charts";
import AdminPanel from "./pages/admin-panel";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const GOLD = "#C9A96E";
const CREAM = "#FAF7F2";
const MUTED = "#8C7B70";

function FullScreenLoader() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: CREAM }}
    >
      <div className="relative w-14 h-14">
        <div
          className="absolute inset-0 rounded-full opacity-20 animate-pulse"
          style={{ background: GOLD }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      </div>
      <p className="text-sm font-medium" style={{ color: MUTED }}>
        Loading HeartSpace…
      </p>
    </div>
  );
}

function ProtectedRoute({
  component: Component,
  allowedRole,
}: {
  component: React.ComponentType;
  allowedRole?: "student" | "counsellor";
}) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    if (allowedRole && user?.role !== allowedRole) {
      const space = (user as any)?.space as string | null;
      if (user?.role === "counsellor") setLocation("/counsellor");
      else if (space === "heartspace" || space === "self")
        setLocation("/self-dashboard");
      else setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, allowedRole, setLocation]);

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return null;
  if (allowedRole && user?.role !== allowedRole) return null;
  return <Component />;
}

function ComingSoonScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: CREAM }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2D2A25" }}>Coming Soon</h1>
      </div>
    </div>
  );
}

function PendingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F5F0" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2D2A25", marginBottom: "0.5rem" }}>Account Pending Approval</h1>
        <p style={{ color: "#7A7267", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Your account is awaiting approval. Please contact Vaishnavi Ma'am to activate your subscription.
        </p>
        <a href="https://wa.me/919336019395?text=Hello%20Ma'am%20I%20want%20my%20subscription%20activated." style={{ display: "inline-block", background: "#6B568F", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>
          Contact Vaishnavi Ma'am
        </a>
      </div>
    </div>
  );
}

function SuspendedScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F5F0" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2D2A25", marginBottom: "0.5rem" }}>Account Suspended</h1>
        <p style={{ color: "#7A7267", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Your subscription has expired or been suspended. Please contact Vaishnavi Ma'am to renew your access.
        </p>
        <a href="https://wa.me/919336019395?text=Hello%20Ma'am%20I%20want%20my%20subscription%20activated." style={{ display: "inline-block", background: "#6B568F", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>
          Contact Vaishnavi Ma'am
        </a>
      </div>
    </div>
  );
}

function StudentRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const status = (user as any)?.status as string | null;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    const examType = (user as any)?.exam_type as string | null;
    const space = (user as any)?.space as string | null;
    const isHeartSpace = space === "heartspace";
    if (user?.role === "student" && !examType && !isHeartSpace) {
      setLocation("/exam-select");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return null;
  if (status === "pending") return <PendingScreen />;
  if (status === "suspended") return <SuspendedScreen />;
  return <Component />;
}

function Router() {
  const { isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/exam-select" component={ExamSelect} />

        <Route path="/admin">
          <ProtectedRoute component={AdminPanel} allowedRole="counsellor" />
        </Route>
        <Route path="/dashboard">
          <StudentRoute component={StudentDashboard} />
        </Route>
        <Route path="/self-dashboard">
          <StudentRoute component={ComingSoonScreen} />
        </Route>
        <Route path="/revision-tracker">
          <StudentRoute component={RevisionTracker} />
        </Route>
        <Route path="/note-tracker">
          <StudentRoute component={NoteTracker} />
        </Route>
        <Route path="/counsellor-sessions">
          <ProtectedRoute component={CounsellorSessionsPage} allowedRole="counsellor" />
        </Route>
        <Route path="/revision-tracker">
          <StudentRoute component={RevisionTracker} />
        </Route>
        <Route path="/note-tracker">
          <StudentRoute component={NoteTracker} />
        </Route>
        <Route path="/counsellor-sessions">
          <ProtectedRoute component={CounsellorSessionsPage} allowedRole="counsellor" />
        </Route>
        <Route path="/counsellor">
          <ProtectedRoute
            component={CounsellorDashboard}
            allowedRole="counsellor"
          />
        </Route>
        <Route path="/student/:id">
          <ProtectedRoute component={StudentDetail} allowedRole="counsellor" />
        </Route>
        <Route path="/sessions">
          <StudentRoute component={Sessions} />
        </Route>
        <Route path="/daily-tracker">
          <StudentRoute component={DailyTracker} />
        </Route>
        <Route path="/syllabus">
          <StudentRoute component={Syllabus} />
        </Route>
        <Route path="/assignments">
          <StudentRoute component={QuestionPractice} />
        </Route>
        <Route path="/my-sessions">
          <StudentRoute component={MySessions} />
        </Route>
        <Route path="/roadmap">
          <StudentRoute component={Roadmap} />
        </Route>
        <Route path="/charts">
          <StudentRoute component={PerformanceCharts} />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
