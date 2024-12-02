import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, from } from 'rxjs';
import { connect, disconnect, getAccount, type GetAccountReturnType, reconnect, switchChain, watchAccount, watchChainId } from '@wagmi/core';
import { injected, coinbaseWallet, walletConnect } from '@wagmi/connectors';
import { wagmiConfig } from '../config/wagmi-config';
import { ToastrService } from 'ngx-toastr';
import { holesky } from '@wagmi/core/chains';
import { CHAIN_CONFIG } from '../config/chains';

@Injectable({
  providedIn: 'root',
})
export class WalletService implements OnDestroy {
  private accountSubject = new BehaviorSubject<GetAccountReturnType | undefined>(undefined);
  private chainIdSubject = new BehaviorSubject<number | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<Error | null>(null);
  private readonly LOCAL_STORAGE_KEY = 'walletConnectionState';

  account$ = this.accountSubject.asObservable();
  chainId$ = this.chainIdSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  private unwatchAccount: () => void = () => {};
  private unwatchChainId: () => void = () => {};

  constructor(private toastr: ToastrService) {
    this.initialize();
  }

  private initialize() {
    // Set the initial account and chain ID states
    this.updateAccount();
    this.updateChainId();

    // Watch for changes
    this.startWatchingAccount();
    this.startWatchingChainId();
  }

  /**
   * Updates the current account information.
   *
   * This method retrieves the current account details using the `getAccount`
   * function with the provided `wagmiConfig`. It then updates the `accountSubject`
   * with the retrieved account data, which is an observable that other parts
   * of the application can subscribe to in order to react to account changes.
   */
  private updateAccount() {
    const savedState = localStorage.getItem(this.LOCAL_STORAGE_KEY);
    if (savedState) {
      try {
        this.reconnectWallet();
        const data = JSON.parse(savedState);
        console.log('loadData', data);
        this.accountSubject.next(data);
      } catch (error) {
        console.error('Failed to parse wallet connection state:', error);
      }
    } else {
      const account = getAccount(wagmiConfig);
      this.accountSubject.next(account);
    }
  }

  /**
   * Updates the current chain ID information.
   *
   * This method retrieves the current chain ID from the wallet account using the
   * `getAccount` function with the provided `wagmiConfig`. It then updates the
   * `chainIdSubject` observable with the retrieved chain ID. This allows other
   * parts of the application to react to chain ID changes by subscribing to the
   * `chainId$` observable.
   *
   * The method performs the following actions:
   * - Retrieves the chain ID from the current account, if available.
   * - If the chain ID is not available, it defaults to `null`.
   * - Updates the `chainIdSubject` with the retrieved chain ID or `null`.
   *
   * This method is typically called during initialization to set the initial
   * chain ID state or when reconnecting to ensure the chain ID is up-to-date.
   */
  private updateChainId() {
    const chainId = getAccount(wagmiConfig)?.chain?.id || null;
    this.chainIdSubject.next(chainId);
  }

  /**
   * Switches the blockchain network to a specified chain.
   *
   * This asynchronous method attempts to switch the current blockchain network
   * to the chain specified by the `holesky.id` using the `switchChain` function
   * from the `@wagmi/core` library, configured with the `wagmiConfig`. It is
   * useful for applications that need to interact with multiple blockchain networks
   * and require dynamic network switching.
   *
   * The method performs the following actions:
   * - Attempts to switch the network and logs the result to the console upon success.
   * - Returns `true` if the network switch is successful.
   * - If an error occurs during the network switch, it handles the error using the
   *   `handleConnectionError` method, which centralizes error handling and displays
   *   an error notification using the `ToastrService`.
   * - Returns `false` if the network switch fails due to an error.
   *
   * This method ensures that the application can gracefully handle network switch
   * failures and provide feedback to the user.
   *
   * @returns A promise that resolves to `true` if the network switch is successful,
   *          otherwise `false`.
   */
  async switchNetwork(): Promise<boolean> {
    try {
      const result = await switchChain(wagmiConfig, { chainId: holesky.id });
      console.log(`Switched to:`, result);
      return true;
    } catch (error) {
      this.handleConnectionError(error); // Centralized error handling
      return false;
    }
  }

  /**
   * Starts watching for changes in the wallet account.
   *
   * This method sets up a watcher using the `watchAccount` function from the `@wagmi/core`
   * library, configured with the `wagmiConfig`. It listens for changes in the wallet account
   * and updates the `accountSubject` observable with the new account information whenever a
   * change is detected. This allows other parts of the application to react to account changes
   * by subscribing to the `account$` observable.
   *
   * The method assigns the `unwatchAccount` function to stop the watcher when it is no longer
   * needed, such as when the service is destroyed. This helps prevent memory leaks and ensures
   * that the application does not continue to listen for changes unnecessarily.
   *
   * The `onChange` callback is triggered whenever the account changes, logging the new account
   * information to the console and updating the `accountSubject` with the new value or `undefined`
   * if the account is not available.
   */
  private startWatchingAccount() {
    this.unwatchAccount = watchAccount(wagmiConfig, {
      onChange: (account) => {
        console.log('Account changed:', account);
        this.accountSubject.next(account || undefined);
      },
    });
  }

  /**
   * Starts watching for changes in the blockchain chain ID.
   *
   * This method sets up a watcher using the `watchChainId` function from the `@wagmi/core`
   * library, configured with the `wagmiConfig`. It listens for changes in the chain ID
   * and updates the `chainIdSubject` observable with the new chain ID whenever a change
   * is detected. This allows other parts of the application to react to chain ID changes
   * by subscribing to the `chainId$` observable.
   *
   * The method assigns the `unwatchChainId` function to stop the watcher when it is no
   * longer needed, such as when the service is destroyed. This helps prevent memory leaks
   * and ensures that the application does not continue to listen for changes unnecessarily.
   *
   * The `onChange` callback is triggered whenever the chain ID changes, logging the new
   * chain ID to the console and updating the `chainIdSubject` with the new value or `null`
   * if the chain ID is undefined.
   */
  private startWatchingChainId() {
    this.unwatchChainId = watchChainId(wagmiConfig, {
      onChange: (chainId) => {
        console.log('Chain ID changed:', chainId);
        this.chainIdSubject.next(chainId || null);
      },
    });
  }

  /**
   * Checks if a wallet is connected.
   *
   * @returns `true` if a wallet is connected, otherwise `false`.
   */
    isConnected(): boolean {
      const account = getAccount(wagmiConfig);
      return !!account?.isConnected;
    }

  /**
   * Connects a wallet using the specified connector type.
   *
   * This method initiates the connection process for a wallet based on the
   * provided `connectorType`. It supports three types of connectors: 'injected',
   * 'coinbase', and 'walletConnect'. The method updates the loading state to
   * indicate that a connection attempt is in progress and clears any previous
   * errors.
   *
   * Depending on the `connectorType`, it selects the appropriate connector:
   * - 'injected': Uses the `injected` connector.
   * - 'coinbase': Uses the `coinbaseWallet` connector with the app name 'BX Dex'.
   * - 'walletConnect': Uses the `walletConnect` connector with a specific project ID
   *   and displays a QR modal for connection.
   *
   * The connection attempt is made using the `connect` function with the `wagmiConfig`
   * and the selected connector. The method returns an observable subscription that
   * handles the connection result:
   * - On success, it logs the connection result, updates the account information,
   *   and sets the loading state to false.
   * - On error, it logs the error, updates the error state with the encountered error,
   *   and sets the loading state to false.
   *
   * @param connectorType - The type of connector to use for the wallet connection.
   * @returns An observable subscription to the connection process.
   */
  connectWallet(connectorType: 'injected' | 'coinbase' | 'walletConnect') {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const connector =
      connectorType === 'injected'
        ? injected()
        : connectorType === 'coinbase'
        ? coinbaseWallet({ appName: 'BX Dex' })
        : walletConnect({ projectId: '5c2ca0dd3003fb371acdb8442a626a0c', showQrModal: true });

    return from(connect(wagmiConfig, { connector })).subscribe({
      next: (result: any) => {
        console.log('Wallet connected:', result);
        this.updateAccount();
        this.saveConnectionState(result.accounts[0], result.chainId, true || null);
        this.loadingSubject.next(false);
      },
      error: (error) => {
        console.error('Failed to connect wallet:', error);
      this.handleConnectionError(error); // Centralized error handling
      this.loadingSubject.next(false);
      },
    });
  }
  
  /**
   * Handles errors that occur during wallet connection processes.
   *
   * This method centralizes error handling for wallet connection attempts.
   * It determines the appropriate error message based on the error type
   * and updates the `errorSubject` observable with the error instance.
   * Additionally, it displays an error notification using the `ToastrService`.
   *
   * The method checks for specific error types:
   * - If the error is a `UserRejectedRequestError`, it sets a message indicating
   *   that the user rejected the wallet connection request.
   * - If the error contains a message, it uses that message as the error message.
   * - Otherwise, it defaults to a generic error message.
   *
   * @param error - The error object encountered during the connection process.
   */
  private handleConnectionError(error: any): void {
    let errorMessage = 'An unknown error occurred. Please try again.';
  
    if (error?.name === 'UserRejectedRequestError') {
      errorMessage = 'You rejected the wallet connection request.';
    } else if (error?.message) {
      errorMessage = error.message;
    }
  
    this.errorSubject.next(error instanceof Error ? error : new Error(errorMessage));
    this.toastr.error(errorMessage, 'Connection Failed');
  }

  /**
   * Disconnects the currently connected wallet.
   *
   * This method initiates the disconnection process for the wallet using the `disconnect`
   * function with the `wagmiConfig`. It updates the `loadingSubject` to indicate that a
   * disconnection attempt is in progress and clears any previous errors by setting the
   * `errorSubject` to `null`.
   *
   * Upon successful disconnection, the method performs the following actions:
   * - Logs a message indicating that the wallet has been disconnected.
   * - Updates the `accountSubject` to `undefined` to reflect the disconnected state.
   * - Updates the `chainIdSubject` to `null` to clear the current chain ID.
   * - Calls `clearConnectionState` to remove any persisted wallet connection state from
   *   local storage, ensuring no stale data remains.
   * - Sets the `loadingSubject` to `false` to indicate that the disconnection process
   *   has completed.
   *
   * If an error occurs during the disconnection process, it:
   * - Logs the error message to the console.
   * - Calls `handleConnectionError` to update the error state with the encountered error
   *   and display an error notification using the `ToastrService`.
   * - Sets the `loadingSubject` to `false` to indicate that the disconnection process
   *   has completed, even if it failed.
   *
   * @returns An observable subscription to the disconnection process.
   */
  disconnectWallet() {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    console.log('wagmi config', wagmiConfig);

    return from(disconnect(wagmiConfig)).subscribe({
      next: () => {
        console.log('Wallet disconnected');
        this.accountSubject.next(undefined);
        this.chainIdSubject.next(null);
        this.clearConnectionState();
        this.loadingSubject.next(false);
      },
      error: (error) => {
        console.error('Failed to disconnect wallet:', error);
        this.handleConnectionError(error); // Centralized error handling
        this.loadingSubject.next(false);
      },
    });
  }

  /**
   * Reconnect the wallet using a list of connectors.
   * This method attempts to reconnect the wallet session with the specified connectors.
   *
   * @returns A promise with the result of the reconnection.
   */
    async reconnectWallet(): Promise<void> {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);
  
      try {
        const result: any = await reconnect(wagmiConfig, {
          connectors: [injected(), coinbaseWallet({ appName: 'BX Dex' }), walletConnect({ projectId: '5c2ca0dd3003fb371acdb8442a626a0c', showQrModal: true })],
        });
  
        console.log('Reconnected wallet:', result);
  
        // // Update the state after reconnection
        this.saveConnectionState(result.account, result.chainId, result.isConnected || false);
        // this.toastr.success('Wallet reconnected successfully', 'Success');
      } catch (error) {
        console.error('Failed to reconnect wallet:', error);
        this.handleConnectionError(error); // Centralized error handling
      } finally {
        this.loadingSubject.next(false);
      }
    }

  /**
   * Saves the current wallet connection state to local storage.
   *
   * This method serializes the wallet connection state, including the account
   * address, chain ID, and connection status, and stores it in local storage
   * under the key specified by `LOCAL_STORAGE_KEY`. This allows the application
   * to persist the connection state across sessions, enabling automatic
   * reconnection or state restoration when the application is reloaded.
   *
   * The stored state includes:
   * - `address`: The wallet account address.
   * - `chainId`: The ID of the blockchain network the wallet is connected to.
   * - `isConnected`: A boolean indicating whether the wallet is currently connected.
   *
   * This method is typically called after a successful wallet connection or
   * reconnection to ensure that the latest connection state is saved.
   *
   * @param address - The wallet account address to be saved.
   * @param chainId - The blockchain network ID to be saved.
   * @param isConnected - The connection status to be saved.
   */
  private saveConnectionState(address: GetAccountReturnType, chainId: number | null, isConnected: boolean) {
    const state = { address, chainId, isConnected };
    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Clears the persisted wallet connection state from local storage.
   *
   * This method removes the wallet connection state stored in local storage
   * under the key specified by `LOCAL_STORAGE_KEY`. It is typically used
   * when disconnecting a wallet to ensure that no stale connection data
   * remains, allowing for a clean state upon the next connection attempt.
   *
   * This action helps prevent issues related to outdated or incorrect
   * connection information being used in future wallet interactions.
   */
  private clearConnectionState() {
    localStorage.removeItem(this.LOCAL_STORAGE_KEY);
  }

  /**
   * Cleans up resources when the `WalletService` is destroyed.
   *
   * This method is part of the Angular `OnDestroy` lifecycle hook and is called
   * automatically when the `WalletService` is destroyed. It ensures that any
   * active subscriptions or watchers are properly terminated to prevent memory
   * leaks and unintended behavior.
   *
   * Specifically, it performs the following actions:
   * - Calls `unwatchAccount` to stop watching for account changes.
   * - Calls `unwatchChainId` to stop watching for chain ID changes.
   *
   * These actions ensure that the service does not continue to listen for changes
   * after it has been destroyed, maintaining the integrity and performance of the
   * application.
   */
  ngOnDestroy() {
    this.unwatchAccount();
    this.unwatchChainId();
  }
}