"use client"

import { useState } from "react"
import { Facebook, Twitter, Linkedin, Link2, Check, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"

interface SocialShareProps {
  productTitle: string
  productUrl?: string
  productImage?: string
  productDescription?: string
}

export function SocialShare({
  productTitle,
  productUrl,
  productImage,
  productDescription,
}: SocialShareProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Get current URL if not provided
  const shareUrl = productUrl || (typeof window !== "undefined" ? window.location.href : "")
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(productTitle)
  const encodedDescription = encodeURIComponent(productDescription || "")
  const encodedImage = encodeURIComponent(productImage || "")

  const socialLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:bg-blue-600 hover:text-white",
      bgColor: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
    },
    {
      name: "X (Twitter)",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: "hover:bg-black hover:text-white",
      bgColor: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
    },
    {
      name: "Pinterest",
      icon: MessageCircle,
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedTitle}`,
      color: "hover:bg-red-600 hover:text-white",
      bgColor: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:bg-[#0077b5] hover:text-white",
      bgColor: "bg-blue-50 dark:bg-blue-950 text-[#0077b5] dark:text-[#0077b5]",
    },
  ]

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: "Link Copied",
        description: "Product link copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Unable to copy link to clipboard",
      })
    }
  }

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "width=600,height=400,noopener,noreferrer")
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <span className="text-sm font-mono font-bold uppercase tracking-wider text-muted-foreground">
        Share Product
      </span>
      
      <div className="flex flex-wrap gap-2">
        {socialLinks.map((social) => (
          <Button
            key={social.name}
            variant="ghost"
            size="icon"
            className={`h-10 w-10 rounded-full transition-all ${social.bgColor} ${social.color} border border-transparent hover:border-transparent`}
            onClick={() => openShareWindow(social.href)}
            title={`Share on ${social.name}`}
            type="button"
          >
            <social.icon className="h-5 w-5" />
            <span className="sr-only">Share on {social.name}</span>
          </Button>
        ))}

        {/* Copy Link Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-full transition-all ${
            copied
              ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-primary hover:text-primary-foreground"
          }`}
          onClick={handleCopyLink}
          title={copied ? "Copied!" : "Copy Link"}
          type="button"
        >
          {copied ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
          <span className="sr-only">{copied ? "Copied!" : "Copy Link"}</span>
        </Button>
      </div>
    </div>
  )
}
