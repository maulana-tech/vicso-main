import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";

export function useWalletConnection() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  const balanceFormatted = balance ? Number(balance.value) / Math.pow(10, balance.decimals) : 0;

  const connectWallet = (connectorType: "metamask" | "walletconnect" = "metamask") => {
    const connector = connectorType === "metamask"
      ? connectors.find((c) => c.id === "injected") || connectors[0]
      : connectors.find((c) => c.id === "walletConnect") || connectors[1];
    if (connector) connect({ connector });
  };

  return {
    address: address || null,
    isConnected,
    chain: chain?.name || null,
    chainId: chain?.id || null,
    balance: balanceFormatted,
    balanceSymbol: balance?.symbol || "ETH",
    isPending,
    connectors,
    connectWallet,
    disconnect,
    connect,
  };
}
