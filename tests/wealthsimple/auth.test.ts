import { authenticate } from "src/wealthsimple/auth";

describe("authenticate", () => {
  test("should return a token", async () => {
    const resp = await authenticate({
      username: "ylilarry@gmail.com",
      password: "password",
      oneTimePassword: "oneTimePassword",
    });
    expect(resp).toHaveProperty("access_token");
  });
});
