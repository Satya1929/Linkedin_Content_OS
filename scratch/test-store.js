const { getStoreSnapshot } = require("./apps/web/src/lib/store");

async function test() {
  try {
    const s = await getStoreSnapshot();
    console.log("Success! Workspaces:", s.workspaces.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
