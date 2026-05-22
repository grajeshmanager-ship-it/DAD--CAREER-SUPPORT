"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, MessageCircle, Target } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Resume review",
    description:
      "Honest feedback from someone who thinks like a recruiter.",
  },
  {
    icon: MessageCircle,
    title: "Career guidance",
    description:
      "Talk to DAD in your language, get one clear direction.",
  },
  {
    icon: Target,
    title: "Skill gaps",
    description:
      "Know exactly what to learn and where to learn it free.",
  },
];

export function Features() {
  return (
    <section className="py-20 md:py-32 relative">
      <div className="container px-4 md:px-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group relative bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
