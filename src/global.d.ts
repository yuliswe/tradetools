import { WealthsimpleGlobal } from "./types/wealthsimple";

declare global {
  interface Window {
    wealthsimple: WealthsimpleGlobal;
  }
}
