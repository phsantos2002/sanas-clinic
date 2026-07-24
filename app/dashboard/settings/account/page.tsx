import { getAccountData } from "@/app/actions/account";
import { AccountPageClient } from "@/components/account/AccountPageClient";
import { redirect } from "next/navigation";

export default async function AccountSettingsPage() {
  const account = await getAccountData();
  if (!account) redirect("/login");

  return (
    <AccountPageClient account={account} />
  );
}
