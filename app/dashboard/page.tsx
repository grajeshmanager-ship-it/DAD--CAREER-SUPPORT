"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FileText, Brain, Briefcase, LogOut, User,
  ArrowRight, Clock, ChevronRight, Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Profile {
  full_name: string;
  country: string;
  situation: string;
  age?: number;
}

interface SavedAnalysis {
  id: string;
  journey_type: string;
  skill_path: string;
  analysis_result: Record<string, unknown>;
  created_at: string;
}

const SITUATION_LABELS: Record<string, string> = {
  student: "Student",
  fresh_graduate: "Fresh Graduate",
  job_seeker: "Job Seeker",
  employed_looking: "Looking to Switch",
  career_change: "Career Changer",
  returning: "Returning to Work",
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile(profileData);

      const { data: analysisData } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (analysisData) setAnalyses(analysisData);

      setLoading(false);
    };

    load();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground">DAD is getting ready for you...</p>
        </div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container px-4 md:px-6 max-w-6xl mx-auto flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-primary">DAD</Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="hidden sm:block">{userEmail}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container px-4 md:px-6 max-w-6xl mx-auto py-12">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Hey {firstName} 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            DAD is here and ready to help. What do you want to work on today?
          </p>
          {profile && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1">
                {SITUATION_LABELS[profile.situation] || profile.situation}
              </span>
              <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-3 py-1">
                {profile.country}
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <Link href="/#resume-upload">
            <Card className="p-6 border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group bg-card/50 hover:bg-card">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Resume Review</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your CV and DAD will tell you exactly what recruiters see
              </p>
              <div className="flex items-center text-primary text-sm font-medium">
                Upload resume <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </Card>
          </Link>

          <Link href="/#fresher-journey">
            <Card className="p-6 border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group bg-card/50 hover:bg-card">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Career Assessment</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Answer questions about yourself and DAD will map your career path
              </p>
              <div className="flex items-center text-primary text-sm font-medium">
                Start assessment <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </Card>
          </Link>

          <Link href="/#voice-section">
            <Card className="p-6 border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group bg-card/50 hover:bg-card">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Talk to DAD</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Have a real voice conversation — career advice, interview prep, anything
              </p>
              <div className="flex items-center text-primary text-sm font-medium">
                Start talking <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </Card>
          </Link>
        </div>

        {analyses.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Your previous sessions
            </h2>
            <div className="space-y-3">
              {analyses.map((a) => (
                <Card key={a.id} className="p-4 border border-border bg-card/50 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {a.journey_type === "resume_upload" ? "Resume Review" :
                       a.journey_type === "fresher_assessment" ? "Career Assessment" : a.journey_type}
                    </p>
                    {a.skill_path && (
                      <p className="text-xs text-muted-foreground mt-0.5">{a.skill_path}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Card>
              ))}
            </div>
          </div>
        )}

        {analyses.length === 0 && (
          <Card className="p-8 border border-dashed border-border text-center bg-card/30">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No sessions yet — pick one of the options above and DAD will get to work!
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
