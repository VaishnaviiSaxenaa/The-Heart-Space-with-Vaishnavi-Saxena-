import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/layout";
import Login from "./pages/login";
import Signup from "./pages/signup";
import StudentDashboard from "./pages/student-dashboard";
import CounsellorDashboard from "./pages/counsellor-dashboard";
import Sessions from "./pages/sessions";
import Syllabus from "./pages/syllabus";
import Assignments from "./pages/assignments";
import DailyTracker from "./pages/daily-tracker";
import StudentDetail from "./pages/student-detail";

const queryClient = new QueryClient();

function ProtectedRoute({
  component: Component,
  allowedRole,
}: {
  component: React.ComponentType;
  allowedRole?: "student" | "counsellor";
}) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  if (allowedRole && user?.role !== allowedRole) {
    const space = (user as any)?.space as string | null;
    if (user?.role === "counsellor") setLocation("/counsellor");
    else if (space === "self") setLocation("/self-dashboard");
    else setLocation("/dashboard");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/"       component={Login}  />
        <Route path="/signup" component={Signup} />

        {/* Prep Space student dashboard */}
        <Route path="/dashboard">
          <ProtectedRoute component={StudentDashboard} allowedRole="student" />
        </Route>

        {/* Self Space student dashboard */}
        <Route path="/self-dashboard">
          <ProtectedRoute component={StudentDashboard} allowedRole="student" />
        </Route>

        {/* Counsellor */}
        <Route path="/counsellor">
          <ProtectedRoute component={CounsellorDashboard} allowedRole="counsellor" />
        </Route>

        {/* Student detail (counsellor only) */}
        <Route path="/student/:id">
          <ProtectedRoute component={StudentDetail} allowedRole="counsellor" />
        </Route>

        {/* Shared */}
        <Route path="/sessions">
          <ProtectedRoute component={Sessions} />
        </Route>
        <Route path="/daily-tracker">
          <ProtectedRoute component={DailyTracker} />
        </Route>

        {/* Prep Space only */}
        <Route path="/syllabus">
          <ProtectedRoute component={Syllabus} allowedRole="student" />
        </Route>
        <Route path="/assignments">
          <ProtectedRoute component={Assignments} allowedRole="student" />
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
