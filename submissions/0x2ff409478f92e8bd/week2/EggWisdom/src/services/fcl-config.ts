import { config } from "@onflow/fcl";

// Flow access node and contract configuration
const flowAccessNode = import.meta.env.VITE_FLOW_ACCESS_NODE || "https://rest-testnet.onflow.org";
const flowAppNetwork = import.meta.env.VITE_FLOW_NETWORK || "testnet";
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || "0xed1691ab54f4f8d4"; // Replace with actual contract address

// Configure FCL for testnet
config({
  "accessNode.api": flowAccessNode,
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "EggWisdom",
  "app.detail.icon": "/logo.png",
  "flow.network": flowAppNetwork,
  "0xEggWisdom": contractAddress,
   // WalletConnect configuration
   "walletconnect.projectId": "cb5fcfa20a2aab5a35103fcae74109e4",
   "fcl.walletconnect.enabled": true,
});

// Export configured addresses for use in the app
export const FLOW_ADDRESSES = {
  EggWisdom: contractAddress
}; 