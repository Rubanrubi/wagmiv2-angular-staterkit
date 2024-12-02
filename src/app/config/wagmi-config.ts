import { http, createConfig, createStorage } from '@wagmi/core'
import { holesky } from '@wagmi/core/chains'
import { coinbaseWallet, injected, metaMask, walletConnect } from '@wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [holesky],
  connectors: [metaMask(), coinbaseWallet()], 
  storage: createStorage({ storage: window.localStorage }), 
  transports: {
    [holesky.id]: http()
  },
})