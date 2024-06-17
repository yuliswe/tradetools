import { asyncTakeNextN } from "src/utils/promise";
import { WealthsimpleAPI } from "src/wealthsimple/WeathsimpleAPI";

describe("WealthsimpleAPI", () => {
  const wealthsimpleAPI = new WealthsimpleAPI();
  beforeAll(async () => {
    await wealthsimpleAPI.authenticate();
  });

  test("fetches all positions", async () => {
    const positions = await wealthsimpleAPI.fetchPositions();
    expect(positions.length).toBeGreaterThan(0);
  });

  test("fetch all financials", async () => {
    const financials = await wealthsimpleAPI.fetchAllAccountFinancials();
    expect(financials.length).toBeGreaterThan(0);
  });

  test("fetch all activities", async () => {
    const activities = await asyncTakeNextN(
      10,
      wealthsimpleAPI.fetchActivities()
    );
    expect(activities).toHaveLength(10);
  });
});
