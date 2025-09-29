import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import {
  Code,
  TrendingUp,
  Target,
  Download,
  Clock,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="w-full border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center p-3 px-5">
          <div className="flex gap-2 items-center font-bold text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Code className="w-4 h-4 text-white" />
            </div>
            <Link href={"/"} className="text-foreground">Beetcode</Link>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild size="sm" variant="outline">
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            🚀 Track Your Coding Progress
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Master LeetCode with
            <br />Smart Progress Tracking
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Beetcode is the Chrome extension that transforms your LeetCode practice into actionable insights.
            Track problems, monitor progress, and accelerate your coding interview preparation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8">
              <Download className="w-5 h-5 mr-2" />
              Add to Chrome - Free
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to excel at coding interviews
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Beetcode seamlessly integrates with LeetCode to give you comprehensive tracking and analytics.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
<Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Problem Tracking</h3>
                <p className="text-muted-foreground">
                  Automatically track every problem you solve with timestamps, difficulty levels, and solution approaches.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Time Management</h3>
                <p className="text-muted-foreground">
                  Monitor your solving speed and identify areas where you need to improve your time efficiency.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Streak Tracking</h3>
                <p className="text-muted-foreground">
                  Maintain your coding momentum with daily streak tracking and consistency insights.
                </p>
              </CardContent>
            </Card>

<Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Code className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Topic Analysis</h3>
                <p className="text-muted-foreground">
                  Detailed breakdown of your performance across different algorithm topics and data structures.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to supercharge your coding practice?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of developers who are already using Beetcode to ace their coding interviews.
          </p>
          <Button size="lg" className="text-lg px-12 py-6 mb-6">
            <Download className="w-5 h-5 mr-2" />
            Install Beetcode Extension
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex gap-2 items-center font-bold text-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Code className="w-4 h-4 text-white" />
              </div>
              <span>Beetcode</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <ThemeSwitcher />
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 Beetcode. All rights reserved. Built for developers, by developers.
          </div>
        </div>
      </footer>
    </main>
  );
}
