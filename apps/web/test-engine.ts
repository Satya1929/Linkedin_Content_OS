import { createDraft } from "./src/lib/engine";
import { getStoreSnapshot } from "./src/lib/store";

async function test() {
  try {
    console.log("Starting draft generation...");
    const snapshot = await getStoreSnapshot();
    const draft = await createDraft({
      rawText: "How AI is changing software development",
      format: "text",
      sourceLinks: []
    }, snapshot);
    console.log("Success! Draft created:", draft.id);
  } catch (e) {
    console.error("Error generating draft:", e);
  }
}
test();
