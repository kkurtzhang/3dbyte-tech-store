"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NEWSLETTER_POPUP_KEY = "newsletter_popup_dismissed";
const NEWSLETTER_SUBSCRIBED_KEY = "newsletter_subscribed";

export function NewsletterPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Check if user has already subscribed or dismissed
    const hasSubscribed = localStorage.getItem(NEWSLETTER_SUBSCRIBED_KEY) === "true";
    const hasDismissed = localStorage.getItem(NEWSLETTER_POPUP_KEY) === "true";

    if (hasSubscribed || hasDismissed) {
      return;
    }

    // Show popup after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(NEWSLETTER_POPUP_KEY, "true");
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ type: "error", text: "Please enter your email address" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Thanks for subscribing!" });
        localStorage.setItem(NEWSLETTER_SUBSCRIBED_KEY, "true");
        setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      } else {
        setMessage({ type: "error", text: data.message || "Something went wrong" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to subscribe. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Popup */}
      <div className="relative z-10 mx-4 w-full max-w-md overflow-hidden rounded-lg bg-background shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold">Join Our Newsletter</h2>
            <p className="mb-6 text-muted-foreground">
              Subscribe to get exclusive deals, new product announcements, and 3D printing tips delivered to your inbox.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubscribe} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>

          {/* Message */}
          {message && (
            <p className={`mt-4 text-center text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}

          {/* Dismiss */}
          <div className="mt-4 text-center">
            <button
              onClick={handleClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
