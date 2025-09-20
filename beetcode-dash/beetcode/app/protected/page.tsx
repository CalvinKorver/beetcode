import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProblemsTable } from "@/components/problems-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { problemsService } from "@/lib/services/problemsService";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Fetch problems data from the service
  const problems = await problemsService.getProblemsForUser();
  const stats = problemsService.calculateStats(problems);

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
            <div className="text-2xl font-bold">{stats.total}</div>
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
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
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
            <div className="text-2xl font-bold text-orange-600">{stats.attempted}</div>
            <p className="text-xs text-muted-foreground">
              Problems still working on
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Problems Table */}
      <ProblemsTable problems={problems} />
    </div>
  );
}
