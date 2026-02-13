"use server"

import { updateProfileAction } from "@/app/actions/auth"

export async function updateAccount(formData: FormData) {
  const data = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }
  await updateProfileAction(data)
}
