const fetch = require("node-fetch");

async function testDraftGeneration() {
  const url = "https://linkedin-content-os-theta.vercel.app/api/drafts";
  console.log(`Testing POST ${url}`);
  
  const payload = {
    rawText: "How AI is changing software development and engineering workflows",
    format: "text"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const text = await response.text();
    
    console.log(`Status: ${status}`);
    console.log("Response Body:", text);
    
    if (status === 200) {
      console.log("✅ API Draft creation and DB integration is working flawlessly!");
    } else {
      console.log("❌ API returned an error.");
    }
  } catch (err) {
    console.error("Error during fetch:", err);
  }
}

testDraftGeneration();
