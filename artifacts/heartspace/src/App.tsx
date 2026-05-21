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
import Sessions from "./pages/sessions";
import Syllabus from "./pages/syllabus";
import Assignments from "./pages/assignments";
import DailyTracker from "./pages/daily-tracker";
import StudentDetail from "./pages/student-detail";

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

/* Redirects student to exam-select if they haven't chosen an exam yet.
   HeartSpace (counseling_client) skips exam selection — no academics. */
function StudentRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/");
      return;
    }
    const examType = (user as any)?.exam_type as string | null;
    const space = (user as any)?.space as string | null;

    /* HeartSpace is counselling only — never needs exam selection */
    const isHeartSpace = space === "heartspace";

    if (user?.role === "student" && !examType && !isHeartSpace) {
      setLocation("/exam-select");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return null;

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

        <Route path="/dashboard">
          <StudentRoute component={StudentDashboard} />
        </Route>
        <Route path="/self-dashboard">
          <StudentRoute component={StudentDashboard} />
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
          <ProtectedRoute component={Sessions} />
        </Route>
        <Route path="/daily-tracker">
          <ProtectedRoute component={DailyTracker} />
        </Route>
        <Route path="/syllabus">
          <StudentRoute component={Syllabus} />
        </Route>
        <Route path="/assignments">
          <StudentRoute component={Assignments} />
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
