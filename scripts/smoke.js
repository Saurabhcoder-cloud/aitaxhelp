// Quick smoke test for stub mode. Requires `npm run dev` running on localhost:3000.
const base = process.env.BASE_URL || "http://localhost:3000";

async function run() {
  const email = `smoke+${Date.now()}@example.com`;
  console.log("Requesting OTP...");
  const reqRes = await fetch(`${base}/api/auth/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const reqJson = await reqRes.json();
  const code = reqJson.code;
  console.log("Got code", code);

  console.log("Verifying OTP...");
  const verifyRes = await fetch(`${base}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code })
  });
  const cookies = verifyRes.headers.get("set-cookie") || "";
  if (!cookies) throw new Error("No session cookie set");
  const cookieHeader = cookies.split(";")[0];

  console.log("Granting entitlement...");
  await fetch(`${base}/api/entitlements/grant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ plan: "registration" })
  });

  console.log("Saving consent...");
  await fetch(`${base}/api/export/demo-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ locale: "en" })
  });

  console.log("Requesting export...");
  const exportRes = await fetch(`${base}/api/export/demo-upload?type=pdf`, {
    headers: { cookie: cookieHeader }
  });
  console.log("Export status", exportRes.status);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
