import {
  getAccountSecurityAction,
  getLoginMethodsAction,
} from "@/app/actions/account-security";
import { getSessionAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { SettingsContent } from "./settings-client";

export default async function SettingsPage() {
  const { success, user } = await getSessionAction();

  if (!success || !user) {
    redirect("/sign-in");
  }

  const [{ loginMethods }, { accountSecurity }] = await Promise.all([
    getLoginMethodsAction(),
    getAccountSecurityAction(),
  ]);

  return (
    <SettingsContent
      customer={user}
      loginMethods={loginMethods}
      accountSecurity={accountSecurity}
    />
  );
}
