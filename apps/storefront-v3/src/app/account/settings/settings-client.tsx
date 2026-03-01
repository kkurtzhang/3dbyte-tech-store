"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertTriangle, Loader2, CheckCircle } from "lucide-react"
import { updateProfileAction, changePasswordAction, deleteAccountAction, AuthUser } from "@/app/actions/auth"
import { useRouter } from "next/navigation"

interface SettingsPageProps {
  customer: AuthUser | null
}

export function SettingsContent({ customer }: SettingsPageProps) {
  const router = useRouter()
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleProfileSubmit(formData: FormData) {
    setIsProfileLoading(true)
    setProfileMessage(null)

    try {
      const data = {
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        phone: formData.get("phone") as string,
      }

      const result = await updateProfileAction(data)

      if (result.success) {
        setProfileMessage({ type: "success", text: "Profile updated successfully!" })
        router.refresh()
      } else {
        setProfileMessage({ type: "error", text: result.error || "Failed to update profile" })
      }
    } catch (error) {
      setProfileMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsProfileLoading(false)
    }
  }

  async function handlePasswordSubmit(formData: FormData) {
    setIsPasswordLoading(true)
    setPasswordMessage(null)

    const currentPassword = formData.get("current_password") as string
    const newPassword = formData.get("new_password") as string
    const confirmPassword = formData.get("confirm_password") as string

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" })
      setIsPasswordLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters" })
      setIsPasswordLoading(false)
      return
    }

    try {
      const result = await changePasswordAction(currentPassword, newPassword)

      if (result.success) {
        setPasswordMessage({ type: "success", text: "Password changed successfully!" })
        // Clear form
        const form = document.getElementById("password-form") as HTMLFormElement
        form?.reset()
      } else {
        setPasswordMessage({ type: "error", text: result.error || "Failed to change password" })
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Settings</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={customer?.first_name || ""}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={customer?.last_name || ""}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                defaultValue={customer?.email || ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">Contact support to change your email</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={customer?.phone || ""}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            {profileMessage && (
              <Alert variant={profileMessage.type === "error" ? "destructive" : "default"}>
                {profileMessage.type === "success" && <CheckCircle className="h-4 w-4" />}
                {profileMessage.type === "error" && <AlertTriangle className="h-4 w-4" />}
                <AlertDescription>{profileMessage.text}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isProfileLoading}>
                {isProfileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="password-form" action={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  name="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  name="new_password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {passwordMessage && (
              <Alert variant={passwordMessage.type === "error" ? "destructive" : "default"}>
                {passwordMessage.type === "success" && <CheckCircle className="h-4 w-4" />}
                {passwordMessage.type === "error" && <AlertTriangle className="h-4 w-4" />}
                <AlertDescription>{passwordMessage.text}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isPasswordLoading}>
                {isPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Delete Account */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Delete Account</CardTitle>
          <CardDescription>Permanently delete your account and all associated data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, there is no going back. All your orders, saved items, and loyalty points will be permanently removed.
          </p>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  )
}

function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteMessage(null)
    try {
      const result = await deleteAccountAction()
      if (result.success) {
        setDeleteMessage({ type: "success", text: "Account deleted successfully" })
        router.push("/")
      } else {
        setDeleteMessage({ type: "error", text: result.error || "Failed to delete account" })
        setIsDeleting(false)
        setShowConfirm(false)
      }
    } catch (error: any) {
      setDeleteMessage({ type: "error", text: error.message || "An unexpected error occurred" })
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (deleteMessage?.type === "success") {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>{deleteMessage.text}</AlertDescription>
      </Alert>
    )
  }

  if (showConfirm) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Are you sure you want to delete your account? This action cannot be undone.
          </AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, Delete My Account
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
        {deleteMessage && (
          <Alert variant="destructive">
            <AlertDescription>{deleteMessage.text}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <Button
      variant="destructive"
      onClick={() => setShowConfirm(true)}
    >
      Delete Account
    </Button>
  )
}
