"use client";

import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border">
      {/* CTA Section */}
      <div className="py-20 md:py-24">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
            {"Your next chapter starts here"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            {"You've got this. And now, you've got DAD."}
          </p>
          <Button size="lg" className="rounded-full px-8 py-6 text-base">
            Start Your Journey
          </Button>
        </div>
      </div>

      {/* Footer links */}
      <div className="border-t border-border py-12">
        <div className="container px-4 md:px-6 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-2xl font-bold text-primary mb-2">DAD</h3>
              <p className="text-sm text-muted-foreground">
                Your AI career support companion. Always here for you.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Resume Review</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Interview Prep</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Career Coaching</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Career Guides</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Founder's Note */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-center text-muted-foreground italic max-w-2xl mx-auto mb-8">
              {'"Built by someone who spent 12 years watching talented people get rejected for reasons nobody explained to them."'}
            </p>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 DAD. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-primary fill-primary" /> for job seekers everywhere
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
