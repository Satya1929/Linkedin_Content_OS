import { Dashboard } from "@/components/Dashboard";
import { getStoreSnapshot } from "@/lib/store";

export default async function Home() {
  const snapshot = await getStoreSnapshot();
  return <Dashboard initialSnapshot={snapshot} />;
}
