import { createConfig, http, injected } from "wagmi";
import { polygon } from "wagmi/chains";

/** Polymarket 主网为 Polygon；浏览器注入钱包（MetaMask 等） */
export const wagmiConfig = createConfig({
  chains: [polygon],
  connectors: [injected()],
  transports: {
    [polygon.id]: http(),
  },
  ssr: true,
});
