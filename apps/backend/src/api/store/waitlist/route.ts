import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { isValidEmail, normalizeEmail } from "../../../lib/waitlist/tokens";

type AddToWaitlistRequest = {
  email?: string;
  product_id: string;
  product_variant_id?: string;
  product_handle: string;
  product_title: string;
  variant_title?: string;
};

function normalizeOptionalText(value?: string) {
  return value?.trim() || null;
}

function getCustomerId(req: MedusaRequest) {
  return (req as any).auth_context?.actor_id as string | undefined;
}

async function getCustomerEmail(
  req: MedusaRequest,
  customerId?: string
): Promise<string | null> {
  if (!customerId) {
    return null;
  }

  const customerModule = req.scope.resolve<any>(Modules.CUSTOMER);
  const customer = await customerModule.retrieveCustomer(customerId);

  return customer?.email ? normalizeEmail(customer.email) : null;
}

async function linkGuestRowsForCustomer(
  waitlistModule: any,
  customerId: string,
  email: string
) {
  const guestRows = await waitlistModule.listWaitlistEntries({
    customer_email: email,
    customer_id: null,
  });

  if (guestRows.length === 0) {
    return;
  }

  await waitlistModule.updateWaitlistEntries(
    guestRows.map((row: { id: string }) => ({
      id: row.id,
      customer_id: customerId,
    }))
  );
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const customerId = getCustomerId(req);

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const waitlistModule = req.scope.resolve<any>("waitlist");

  try {
    const customerEmail = await getCustomerEmail(req, customerId);

    if (customerEmail) {
      await linkGuestRowsForCustomer(waitlistModule, customerId, customerEmail);
    }

    const waitlistItems = await waitlistModule.listWaitlistEntries({
      customer_id: customerId,
    });

    res.json({
      waitlist: waitlistItems,
      customer_email: customerEmail,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch waitlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function POST(
  req: MedusaRequest<AddToWaitlistRequest>,
  res: MedusaResponse
) {
  const customerId = getCustomerId(req);
  const {
    email,
    product_id,
    product_variant_id,
    product_handle,
    product_title,
    variant_title,
  } = req.body;

  if (!product_id || !product_handle || !product_title) {
    return res.status(400).json({
      message: "product_id, product_handle, and product_title are required",
    });
  }

  const waitlistModule = req.scope.resolve<any>("waitlist");

  try {
    const accountEmail = await getCustomerEmail(req, customerId);
    const resolvedEmail = normalizeEmail(email || accountEmail || "");

    if (!isValidEmail(resolvedEmail)) {
      return res.status(400).json({
        message: "A valid email is required",
      });
    }

    const existingItems = await waitlistModule.listWaitlistEntries({
      customer_email: resolvedEmail,
      product_id,
      product_variant_id: normalizeOptionalText(product_variant_id),
      notified: false,
    });

    if (existingItems.length > 0) {
      const [existingItem] = existingItems;
      if (customerId && !existingItem.customer_id) {
        const linked = await waitlistModule.updateWaitlistEntries({
          id: existingItem.id,
          customer_id: customerId,
        });
        return res.status(200).json({
          waitlist: linked,
        });
      }

      return res.status(200).json({
        waitlist: existingItem,
      });
    }

    const waitlistItem = await waitlistModule.createWaitlistEntries({
      customer_id: customerId || null,
      customer_email: resolvedEmail,
      product_id,
      product_variant_id: normalizeOptionalText(product_variant_id),
      product_handle,
      product_title,
      variant_title: normalizeOptionalText(variant_title),
      notified: false,
      notification_count: 0,
    });

    res.status(201).json({
      waitlist: waitlistItem,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add to waitlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const customerId = getCustomerId(req);

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const waitlistModule = req.scope.resolve<any>("waitlist");

  try {
    const waitlistItems = await waitlistModule.listWaitlistEntries({
      customer_id: customerId,
    });
    const waitlistIds = waitlistItems.map((item: { id: string }) => item.id);

    if (waitlistIds.length > 0) {
      await waitlistModule.deleteWaitlistEntries(waitlistIds);
    }

    res.status(200).json({
      message: "Waitlist cleared",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to clear waitlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
