async function run() {
  const res = await fetch("https://linkedin-content-os-theta.vercel.app/api/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText: "Test draft", format: "text" })
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}
run();
