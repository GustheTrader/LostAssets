import { searchSws } from "../execution/swsSearchAdapter";
import { logger } from "../db/logger";

async function runTest() {
  logger.info("Starting SWS Search integration test...");
  
  try {
    const results = await searchSws({
      state: "NV",
      lastName: "Smith",
      firstName: "",
      recordLimit: 5,
    });
    
    console.log("\n=== TEST SEARCH RESULTS ===");
    console.log(`Found ${results.length} records:`);
    results.forEach((r, idx) => {
      console.log(`[${idx + 1}] Owner: ${r.ownerName}`);
      console.log(`    Amount: $${r.amount}`);
      console.log(`    Type: ${r.propertyType}`);
      console.log(`    Holder: ${r.company}`);
      console.log(`    Location: ${r.location}`);
      console.log(`    State ID: ${r.stateId}`);
      console.log("------------------------");
    });
  } catch (error: any) {
    console.error("Test failed with error:", error);
  }
}

runTest();
