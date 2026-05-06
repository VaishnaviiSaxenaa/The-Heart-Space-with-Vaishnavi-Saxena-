import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/layout";
import Login from "./pages/login";
import StudentDashboard from "./pages/student-dashboard";
import CounsellorDashboard from "./pages/counsellor-dashboard";
import Sessions from "./pages/sessions";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, allowedRole }: { component: any, allowedRole?: "student" | "counsellor" }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  if (allowedRole && user?.role !== allowedRole) {
    setLocation(user?.role === "counsellor" ? "/counsellor" : "/dashboard");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/dashboard">
          <ProtectedRoute component={StudentDashboard} allowedRole="student" />
        </Route>
        <Route path="/counsellor">
          <ProtectedRoute component={CounsellorDashboard} allowedRole="counsellor" />
        </Route>
        <Route path="/sessions">
          <ProtectedRoute component={Sessions} />
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
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
