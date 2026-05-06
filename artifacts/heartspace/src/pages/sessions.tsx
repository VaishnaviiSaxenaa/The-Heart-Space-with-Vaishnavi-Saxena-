import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useListSessions, useListUsers, useCreateSession, useUpdateSession, getListSessionsQueryKey, SessionStatus, UpdateSessionBodyStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Loader2, Plus, Calendar, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

const createSessionSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  scheduledAtDate: z.string().min(1, "Date is required"),
  scheduledAtTime: z.string().min(1, "Time is required"),
  durationMinutes: z.string().min(1, "Duration is required"),
  topic: z.string().optional(),
});

type CreateSessionValues = z.infer<typeof createSessionSchema>;

export default function Sessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: sessions, isLoading: isLoadingSessions } = useListSessions(
    user?.role === "student" ? { studentId: user.id } : undefined,
    { query: { enabled: !!user?.id } }
  );

  const { data: students } = useListUsers(
    { role: "student" },
    { query: { enabled: user?.role === "counsellor" } }
  );

  const createSessionMutation = useCreateSession({
    mutation: {
      onSuccess: () => {
        toast({ title: "Session created successfully" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      },
      onError: (error) => {
        toast({ title: "Failed to create session", variant: "destructive" });
      }
    }
  });

  const updateSessionMutation = useUpdateSession({
    mutation: {
      onSuccess: () => {
        toast({ title: "Session updated" });
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      }
    }
  });

  const form = useForm<CreateSessionValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      studentId: "",
      scheduledAtDate: "",
      scheduledAtTime: "",
      durationMinutes: "60",
      topic: "",
    },
  });

  const onSubmitCreate = (values: CreateSessionValues) => {
    if (!user) return;
    const scheduledAt = new Date(`${values.scheduledAtDate}T${values.scheduledAtTime}`).toISOString();
    createSessionMutation.mutate({
      data: {
        studentId: parseInt(values.studentId),
        counsellorId: user.id,
        scheduledAt,
        durationMinutes: parseInt(values.durationMinutes),
        topic: values.topic
      }
    });
  };

  const handleStatusUpdate = (id: number, status: UpdateSessionBodyStatus) => {
    updateSessionMutation.mutate({ id, data: { status } });
  };

  if (isLoadingSessions) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-primary/20 text-primary hover:bg-primary/30";
      case "completed": return "bg-green-100 text-green-800 hover:bg-green-200";
      case "cancelled": return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-foreground">Sessions</h1>
          <p className="text-muted-foreground mt-2">Your counselling schedule and history.</p>
        </div>

        {user?.role === "counsellor" && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Schedule New Session</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select a student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students?.map(student => (
                              <SelectItem key={student.id} value={student.id.toString()}>{student.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="scheduledAtDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scheduledAtTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="durationMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (min)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Initial Consultation" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createSessionMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground mt-4 w-full">
                      {createSessionMutation.isPending ? "Scheduling..." : "Schedule Session"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sessions?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
            No sessions found.
          </div>
        )}
        {sessions?.map((session) => (
          <Card key={session.id} className="bg-card border-none shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="bg-muted/30 p-6 md:w-64 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border">
                <div className="text-lg font-medium">{format(new Date(session.scheduledAt), "EEEE")}</div>
                <div className="text-3xl font-serif text-primary my-1">{format(new Date(session.scheduledAt), "MMM d")}</div>
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <Clock className="w-4 h-4 mr-2" />
                  {format(new Date(session.scheduledAt), "h:mm a")} ({session.durationMinutes}m)
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-serif text-xl font-medium mb-2">{session.topic || "Counselling Session"}</h3>
                    <Badge variant="secondary" className={`capitalize ${getStatusColor(session.status)}`}>
                      {session.status}
                    </Badge>
                  </div>
                  
                  <div className="text-muted-foreground text-sm space-y-1 mb-4">
                    {user?.role === "counsellor" ? (
                      <p>Student: <span className="font-medium text-foreground">{session.student?.name}</span></p>
                    ) : (
                      <p>Counsellor: <span className="font-medium text-foreground">{session.counsellor?.name}</span></p>
                    )}
                  </div>
                </div>

                {user?.role === "counsellor" && session.status === "scheduled" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                      onClick={() => handleStatusUpdate(session.id, "completed")}
                      disabled={updateSessionMutation.isPending}
                    >
                      Mark Completed
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => handleStatusUpdate(session.id, "cancelled")}
                      disabled={updateSessionMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
