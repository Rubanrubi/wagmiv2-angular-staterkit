import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, from } from 'rxjs';
import { connect, disconnect, getAccount, type GetAccountReturnType, switchChain, watchAccount, watchChainId } from '@wagmi/core';
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
    const account = getAccount(wagmiConfig);
    this.accountSubject.next(account);
  }

  private updateChainId() {
    const chainId = getAccount(wagmiConfig)?.chain?.id || null;
    this.chainIdSubject.next(chainId);
  }

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

  private startWatchingAccount() {
    this.unwatchAccount = watchAccount(wagmiConfig, {
      onChange: (account) => {
        console.log('Account changed:', account);
        this.accountSubject.next(account || undefined);
      },
    });
  }

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
      next: (result) => {
        console.log('Wallet connected:', result);
        this.updateAccount();
        this.loadingSubject.next(false);
      },
      error: (error) => {
        console.error('Failed to connect wallet:', error);
      this.handleConnectionError(error); // Centralized error handling
      this.loadingSubject.next(false);
      },
    });
  }

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

  disconnectWallet() {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return from(disconnect(wagmiConfig)).subscribe({
      next: () => {
        console.log('Wallet disconnected');
        this.accountSubject.next(undefined);
        this.chainIdSubject.next(null);
        this.loadingSubject.next(false);
      },
      error: (error) => {
        console.error('Failed to disconnect wallet:', error);
        this.handleConnectionError(error); // Centralized error handling
        this.loadingSubject.next(false);
      },
    });
  }

  ngOnDestroy() {
    this.unwatchAccount();
    this.unwatchChainId();
  }
}