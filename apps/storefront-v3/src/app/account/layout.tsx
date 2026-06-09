import { getSessionAction } from "@/app/actions/auth"
import { AccountNav } from "./account-nav"
import { EmailVerificationNotice } from "./email-verification-notice"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionAction()
  const showVerificationNotice =
    session.success && session.user?.email_verified === false

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <AccountNav />
        <main className="flex-1 min-w-0">
          {showVerificationNotice && <EmailVerificationNotice />}
          {children}
        </main>
      </div>
    </div>
  )
}
