import { Component } from '@angular/core';
import { WalletService } from '../../services/wallet.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-connect-wallet-modal',
  standalone: true,
  imports: [],
  templateUrl: './connect-wallet-modal.component.html',
  styleUrl: './connect-wallet-modal.component.css'
})
export class ConnectWalletModalComponent {

  constructor(
    private walletService: WalletService,
  ) {}

  connectWallet(type: 'injected' | 'coinbase' | 'walletConnect') {
    this.walletService.connectWallet(type);
  }

  disconnectWallet() {
    this.walletService.disconnectWallet();
  }

}
