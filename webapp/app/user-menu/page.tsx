import { Navigation } from "@/components/navigation";
import { NavigationUserMenu } from "@/components/navigationUserMenu";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center p-10">
      <Navigation />
      <h1 className="text-6xl font-extrabold tracking-tight">User menu</h1>
      <NavigationUserMenu />
    </main>
  );
}