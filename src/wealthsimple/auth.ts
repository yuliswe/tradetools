import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { tiChecker } from "src/tiChecker";
import { AuthFileContent } from "src/types/auth";

export async function authenticate(args: {
  username: string;
  password: string;
  oneTimePassword: string;
}) {
  const { username, password, oneTimePassword } = args;
  const resp = await fetch(
    "https://api.production.wealthsimple.com/v1/oauth/v2/token",
    {
      headers: {
        accept: "application/json",
        "accept-language":
          "en-CA,en;q=0.9,es-US;q=0.8,es;q=0.7,en-GB;q=0.6,en-US;q=0.5",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua":
          '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-wealthsimple-client": "@wealthsimple/wealthsimple",
        ...(oneTimePassword && { "x-wealthsimple-otp": oneTimePassword }),
      },
      referrer: "https://my.wealthsimple.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify({
        grant_type: "password",
        skip_provision: true,
        scope:
          "invest.read invest.write trade.read trade.write tax.read tax.write",
        client_id:
          "4da53ac2b03225bed1550eba8e4611e086c7b905a3855e6ed12ea08c246758fa",
        username,
        password,
      }),
      method: "POST",
      mode: "cors",
      credentials: "omit",
    }
  );
  return tiChecker.WSAuthenticationResponse.from(await resp.json());
}

export async function readAuthFile(): Promise<AuthFileContent> {
  const filePath = path.join(os.homedir(), ".wealthsimple", "auth.json");
  try {
    await fs.access(filePath);
    const fileContent = await fs.readFile(filePath, "utf-8");
    return tiChecker.AuthFileContent.from(JSON.parse(fileContent));
  } catch (err) {
    throw new Error(
      `File is not found or is not readable: ${filePath}. ${JSON.stringify(err)}`
    );
  }
}

export async function writeAuthFile(content: AuthFileContent) {
  const filePath = path.join(os.homedir(), ".wealthsimple", "auth.json");
  await fs.mkdir(path.join(os.homedir(), ".wealthsimple"), {
    recursive: true,
  });
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), {
    encoding: "utf-8",
  });
}
