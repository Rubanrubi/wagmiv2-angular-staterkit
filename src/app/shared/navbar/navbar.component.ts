import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { WalletService } from '../../services/wallet.service';
import { ModalService } from '../../services/modal.service';
import { ConnectWalletModalComponent } from "../../components/connect-wallet-modal/connect-wallet-modal.component";
import { WalletAddressFormatPipe } from "../../pipes/wallet-address-format.pipe";

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ConnectWalletModalComponent, WalletAddressFormatPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  isConnected: boolean = false;
  walletAddress: string = '';
  networkName: string = '';

  constructor(
    private walletService: WalletService,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) { }
  
  /**
   * Initializes the component and subscribes to account changes.
   *
   * This method is part of the Angular `OnInit` lifecycle hook and is called
   * automatically when the component is initialized. It subscribes to the
   * `account$` observable from the `WalletService` to listen for changes in
   * the wallet account. When the account changes, it updates the component's
   * state, including the connection status, wallet address, and network name.
   *
   * The method also manually triggers change detection using `ChangeDetectorRef`
   * to ensure that the UI reflects the latest state changes.
   */
  ngOnInit(): void {
    this.walletService.account$.subscribe((account) => {
      console.log('account observable', account);
      this.isConnected = !!account?.isConnected;
      this.walletAddress = account?.address || '';
      this.networkName = account?.chainId !== undefined ? this.getNetworkName(account.chainId) : '';
      console.log('chainId', this.networkName);
      this.cdr.detectChanges(); // Manually trigger change detection
    });

    console.log('---', this.isConnected, this.networkName, this.walletAddress);
  }

  /**
   * Handles the network button click event.
   *
   * This method is triggered when the user clicks the network button in the UI.
   * It checks if the current network is unsupported and, if so, attempts to switch
   * to the Holesky network by calling the `switchToHolesky` method. If the network
   * is already supported, it logs a message indicating that no switch is needed.
   */
  onNetworkButtonClick(): void {
    if (this.networkName === 'Unsupported Network') {
      this.switchToHolesky();
    } else {
      console.log('Network is already supported');
    }
  }

  /**
   * Switches the blockchain network to Holesky.
   *
   * This asynchronous method attempts to switch the current blockchain network
   * to Holesky by calling the `switchNetwork` method from the `WalletService`.
   * It logs a success message if the network switch is successful, or an error
   * message if the switch fails.
   */
  async switchToHolesky(): Promise<void> {
    const success = await this.walletService.switchNetwork();
    if (success) {
      console.log('Switched to Holesky');
    } else {
      console.error('Failed to switch to Holesky');
    }
  }

  /**
   * Retrieves the network name based on the chain ID.
   *
   * This helper method takes a `chainId` as input and returns the corresponding
   * network name. It uses a predefined mapping of chain IDs to network names.
   * If the chain ID is not recognized, it returns 'Unsupported Network'.
   *
   * @param chainId - The chain ID for which to retrieve the network name.
   * @returns The network name corresponding to the given chain ID.
   */
  private getNetworkName(chainId: number): string {
    const networks: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten',
      4: 'Rinkeby',
      5: 'Goerli',
      56: 'Binance Smart Chain',
      137: 'Polygon',
      17000: 'Holesky'
      // Add more networks as needed
    };
    return networks[chainId] || 'Unsupported Network';
  }

  /**
   * Disconnects the wallet from MetaMask.
   *
   * This method calls the `disconnectWallet` method from the `WalletService`
   * to initiate the disconnection process for the currently connected wallet.
   * It is typically triggered by a user action, such as clicking a disconnect
   * button in the UI.
   */
  disconnectMetamask() {
    this.walletService.disconnectWallet();
  }

  /**
   * Opens a modal dialog.
   *
   * This method uses the `ModalService` to open a modal dialog with the ID
   * 'crypto-modal'. It is typically triggered by a user action, such as
   * clicking a button to open the modal.
   */
  openModal(): void {
    this.modalService.open('crypto-modal');
  }
}