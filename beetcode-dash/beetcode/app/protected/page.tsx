import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProblemsTable } from "@/components/problems-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dummy data for problems table
const dummyProblems = [
  {
    id: "1",
    problem_name: "Two Sum",
    difficulty: "Easy" as const,
    status: "Completed" as const,
    best_time_ms: 45000,
    last_attempted_at: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    problem_name: "Add Two Numbers",
    difficulty: "Medium" as const,
    status: "Completed" as const,
    best_time_ms: 180000,
    last_attempted_at: "2024-01-14T14:20:00Z",
  },
  {
    id: "3",
    problem_name: "Longest Substring Without Repeating Characters",
    difficulty: "Medium" as const,
    status: "Attempted" as const,
    best_time_ms: null,
    last_attempted_at: "2024-01-13T16:45:00Z",
  },
  {
    id: "4",
    problem_name: "Median of Two Sorted Arrays",
    difficulty: "Hard" as const,
    status: "Attempted" as const,
    best_time_ms: null,
    last_attempted_at: "2024-01-12T11:15:00Z",
  },
  {
    id: "5",
    problem_name: "Reverse Integer",
    difficulty: "Medium" as const,
    status: "Completed" as const,
    best_time_ms: 95000,
    last_attempted_at: "2024-01-11T09:30:00Z",
  },
  {
    id: "6",
    problem_name: "Palindrome Number",
    difficulty: "Easy" as const,
    status: "Completed" as const,
    best_time_ms: 32000,
    last_attempted_at: "2024-01-10T15:20:00Z",
  },
];

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Calculate stats
  const totalProblems = dummyProblems.length;
  const completedProblems = dummyProblems.filter(p => p.status === "Completed").length;
  const attemptedProblems = dummyProblems.filter(p => p.status === "Attempted").length;

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your LeetCode progress and see your problem-solving statistics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProblems}</div>
            <p className="text-xs text-muted-foreground">
              Problems you&apos;ve worked on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedProblems}</div>
            <p className="text-xs text-muted-foreground">
              Successfully solved problems
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{attemptedProblems}</div>
            <p className="text-xs text-muted-foreground">
              Problems still working on
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Problems Table */}
      <ProblemsTable problems={dummyProblems} />
    </div>
  );
}
