import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authStore, entitlementStore } from "@/lib/store";
import { isStubMode } from "@/lib/env";

export default async function AccountPage() {
  const sessionId = cookies().get("sessionId")?.value;
  const session = await Promise.resolve(authStore.getSession(sessionId));
  if (!session) redirect("/login?redirect=/account");
  const user = await Promise.resolve(authStore.getUserById(session.userId));
  const entitlement = await Promise.resolve(entitlementStore.getEntitlement(session.userId));

  async function logout() {
    "use server";
    await fetch("/api/auth/logout", { method: "POST" });
    redirect("/");
  }

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl font-bold">Account</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Email: {user?.email}</p>
          <p>Session: {sessionId}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Entitlement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Status: {entitlement ? entitlement.plan : "None"}</p>
          <p>Source: {entitlement?.source ?? "n/a"}</p>
          <p>Granted: {entitlement?.createdAt ?? "--"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Data Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Delete my data (coming soon)</p>
          {isStubMode() && <p>In demo mode, data is stored locally only.</p>}
        </CardContent>
      </Card>
      <form action={logout}>
        <Button type="submit" variant="secondary">
          Logout
        </Button>
      </form>
    </div>
  );
}
