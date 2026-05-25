import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { verifyWaitlistManageToken } from "../../../../../lib/waitlist/tokens"

const getSecret = (): string =>
  process.env.WAITLIST_LINK_SECRET ||
  process.env.JWT_SECRET ||
  process.env.COOKIE_SECRET ||
  "waitlist-dev-secret"

const getEntryFromToken = async (req: MedusaRequest) => {
  const verified = verifyWaitlistManageToken(req.params.token, {
    secret: getSecret(),
  })

  if (!verified) {
    return null
  }

  const waitlistModule = req.scope.resolve<any>("waitlist")
  const [entry] = await waitlistModule.listWaitlistEntries({
    id: verified.waitlist_id,
    customer_email: verified.email,
  })

  return entry || null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const entry = await getEntryFromToken(req)

  if (!entry) {
    return res.status(404).json({
      message: "Waitlist item not found",
    })
  }

  return res.status(200).json({
    waitlist: entry,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const entry = await getEntryFromToken(req)

  if (!entry) {
    return res.status(404).json({
      message: "Waitlist item not found",
    })
  }

  const waitlistModule = req.scope.resolve<any>("waitlist")
  await waitlistModule.deleteWaitlistEntries(entry.id)

  return res.status(200).json({
    message: "Waitlist item removed",
  })
}
