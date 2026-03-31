import { getAssets, getAssetStats } from "@/app/actions/vault";
import { VaultClient } from "@/components/studio/VaultClient";

export default async function VaultPage() {
  const [assets, stats] = await Promise.all([getAssets(), getAssetStats()]);
  return <VaultClient assets={assets} stats={stats} />;
}
