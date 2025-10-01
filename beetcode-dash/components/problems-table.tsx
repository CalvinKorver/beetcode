"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon } from "lucide-react";

interface Problem {
  id: string;
  problem_name: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Attempted" | "Completed";
  best_time_seconds: number | null;
  score: number;
  last_attempted_at: string;
  first_completed_at: string | null;
  leetcode_id: number | null;
  created_at: string;
  updated_at: string;
}

interface ProblemsTableProps {
  problems: Problem[];
}

type SortField = keyof Problem | "calculatedScore";
type SortDirection = "asc" | "desc" | null;

function calculateProblemScore(problem: Problem): number {
  const now = new Date();
  const lastAttempted = new Date(problem.last_attempted_at);

  // Calculate C_Date
  const daysSinceLastAttempted = Math.floor((now.getTime() - lastAttempted.getTime()) / (1000 * 60 * 60 * 24));
  const minutesSinceLastAttempted = Math.floor((now.getTime() - lastAttempted.getTime()) / (1000 * 60));

  const cDate = daysSinceLastAttempted < 4 ? 1 : minutesSinceLastAttempted;

  // Calculate C_Time
  const timeMinutes = problem.best_time_seconds ? problem.best_time_seconds / 60 : 0;
  let cTime = 0;

  if (timeMinutes < 25) {
    cTime = timeMinutes * 100;
  } else if (timeMinutes < 35) {
    cTime = timeMinutes * 200;
  } else if (timeMinutes < 45) {
    cTime = timeMinutes * 300;
  } else {
    cTime = timeMinutes * 400;
  }

  // Calculate C_Solution
  const cSolution = problem.score === 5 ? 0.5 : (5 - problem.score) + 1;

  // Final formula: round((C_Date + C_Time) * C_Solution)
  return Math.round((cDate + cTime) * cSolution);
}

function formatTime(timeSeconds: number | null): string {
  if (!timeSeconds) return "N/A";

  const minutes = Math.floor(timeSeconds / 60);
  const remainingSeconds = Math.floor(timeSeconds % 60);

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

function getDifficultyVariant(difficulty: string) {
  switch (difficulty) {
    case "Easy":
      return "secondary";
    case "Medium":
      return "default";
    case "Hard":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case "Completed":
      return "secondary";
    case "Attempted":
      return "outline";
    default:
      return "outline";
  }
}

interface SortableHeaderProps {
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

function SortableHeader({ field, currentSort, onSort, children }: SortableHeaderProps) {
  const getSortIcon = () => {
    if (currentSort.field !== field || currentSort.direction === null) {
      return <ChevronsUpDownIcon className="ml-2 h-4 w-4" />;
    }
    return currentSort.direction === "asc" ? (
      <ChevronUpIcon className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDownIcon className="ml-2 h-4 w-4" />
    );
  };

  return (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => onSort(field)}
        className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
      >
        {children}
        {getSortIcon()}
      </Button>
    </TableHead>
  );
}

export function ProblemsTable({ problems }: ProblemsTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: "last_attempted_at",
    direction: "desc",
  });

  const handleSort = (field: SortField) => {
    let direction: SortDirection = "asc";

    if (sortConfig.field === field) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      } else {
        direction = "asc";
      }
    }

    setSortConfig({ field, direction });
  };

  const sortedProblems = useMemo(() => {
    if (!sortConfig.direction) {
      return problems;
    }

    return [...problems].sort((a, b) => {
      let aValue: any, bValue: any;

      // Handle calculated score field
      if (sortConfig.field === "calculatedScore") {
        aValue = calculateProblemScore(a);
        bValue = calculateProblemScore(b);
      } else {
        aValue = a[sortConfig.field as keyof Problem];
        bValue = b[sortConfig.field as keyof Problem];
      }

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortConfig.direction === "asc" ? 1 : -1;
      if (bValue === null) return sortConfig.direction === "asc" ? -1 : 1;

      // Handle different data types
      let comparison = 0;

      if (sortConfig.field === "difficulty") {
        const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 };
        comparison = difficultyOrder[aValue as keyof typeof difficultyOrder] -
                    difficultyOrder[bValue as keyof typeof difficultyOrder];
      } else if (sortConfig.field === "last_attempted_at") {
        comparison = new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
      } else if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [problems, sortConfig]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your LeetCode Problems</CardTitle>
      </CardHeader>
      <CardContent>
        {problems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No problems found. Start solving some LeetCode problems to see them here!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  field="problem_name"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  Problem Name
                </SortableHeader>
                <SortableHeader
                  field="difficulty"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  Difficulty
                </SortableHeader>
                <SortableHeader
                  field="status"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  Status
                </SortableHeader>
                <SortableHeader
                  field="best_time_ms"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  Best Time
                </SortableHeader>
                <SortableHeader
                  field="last_attempted_at"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  Last Attempted
                </SortableHeader>
                <SortableHeader
                  field="calculatedScore"
                  currentSort={sortConfig}
                  onSort={handleSort}
                >
                  Score
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProblems.map((problem) => (
                <TableRow key={problem.id}>
                  <TableCell className="font-medium">
                    {problem.problem_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getDifficultyVariant(problem.difficulty)}>
                      {problem.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(problem.status)}>
                      {problem.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatTime(problem.best_time_seconds)}
                  </TableCell>
                  <TableCell>
                    {new Date(problem.last_attempted_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const score = calculateProblemScore(problem);
                      return isNaN(score) ? "N/A" : score.toString();
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}