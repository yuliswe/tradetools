import { tiChecker } from "src/tiChecker";
import type {
  WSActivity,
  WSFetchActivitiesResponse,
} from "src/types/wealthsimple";

function getWealthsimpleToken() {
  const wswindow = tiChecker.WealthsimpleGlobalWindow.from(window);
  return wswindow.wealthsimple.auth.access_token;
}

async function fetchActivities(
  bookmark?: string
): Promise<WSFetchActivitiesResponse> {
  const url = new URL(
    "https://trade-service.wealthsimple.com/account/activities"
  );

  const params = new URLSearchParams([
    ["account_ids", ""],
    ["limit", "50"],
    ["bookmark", bookmark ?? ""],
    ["type", "buy"],
    ["type", "sell"],
    ["type", "deposit"],
  ]);

  url.search = params.toString();

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
      Accept: "application/json",
      "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
      "Content-Type": "application/json",
      "X-WS-Locale": "en-CA",
      "x-websocket-id": "websocket-d48fe318-d893-474f-8149-a378177c9354",
      "x-app-instance-id": "5c97908d-9fcd-4c19-94e4-8eef517aedda",
      "x-platform-os": "web",
      "x-ws-profile": "trade",
      authorization: `Bearer ${getWealthsimpleToken()}`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      Pragma: "no-cache",
    },
    referrer: "https://my.wealthsimple.com/",
    method: "GET",
    mode: "cors",
  });

  return tiChecker.WSFetchActivitiesResponse.from(await response.json());
}

async function* activitiesIterator() {
  let bookmark: string | undefined = undefined;
  let results: WSActivity[] = [];
  do {
    ({ bookmark, results } = await fetchActivities(bookmark));
    yield* results.filter((act) => act.object === "deposit" || act.filled_at); // only completed trades
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (results.length > 0);
}

function downloadObjectAsJson(exportObj: object, exportName: string): void {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

async function main() {
  const activities = [];
  for await (const activity of activitiesIterator()) {
    if (activity.object === "order" && activity.status !== "posted") {
      continue;
    }
    activities.push(activity);
  }
  console.log(activities);
  downloadObjectAsJson(
    activities,
    `activities-${new Date().toLocaleDateString()}.json`
  );
}

main().catch(console.error);
