import { http, createConfig } from "wagmi";
import { mainnet, bsc, polygon, arbitrum } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = "b4e05d3e1635c2d3e4a96f7c6a2d8f1e"; // WalletConnect Cloud project ID

export const wagmiConfig = createConfig({
  chains: [mainnet, bsc, polygon, arbitrum],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
});
