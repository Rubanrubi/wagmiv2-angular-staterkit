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

  ngOnInit(): void {
    // Subscribe to account changes
    this.walletService.account$.subscribe((account) => {
      console.log('account observable', account);
      this.isConnected = !!account?.isConnected;
      this.walletAddress = account?.address || '';
      this.networkName = account?.chainId !== undefined ? this.getNetworkName(account.chainId) : '';
      console.log('chainId', this.networkName)
      this.cdr.detectChanges(); // Manually trigger change detection
    });
  }

// Method to handle button click
onNetworkButtonClick(): void {
  if (this.networkName === 'Unsupported Network') {
    this.switchToHolesky();
  } else {
    console.log('Network is already supported');
  }
}

// Helper method to switch to Holesky
async switchToHolesky(): Promise<void> {
  const success = await this.walletService.switchNetwork();
  if (success) {
    console.log('Switched to Holesky');
  } else {
    console.error('Failed to switch to Holesky');
  }
}

  // Helper method to get the network name from chain ID
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

  disconnectMetamask() {
    this.walletService.disconnectWallet();
  }

  openModal(): void {
    this.modalService.open('crypto-modal');
  }

}
