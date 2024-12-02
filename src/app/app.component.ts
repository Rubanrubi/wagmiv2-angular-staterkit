import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { wagmiConfig } from './config/wagmi-config';
import { createConnector, getAccount, getEnsName } from '@wagmi/core'
import { WalletService } from './services/wallet.service';
import { NavbarComponent } from "./shared/navbar/navbar.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'bx-dex';

  constructor(private walletService: WalletService) {}

  async ngOnInit() {
    initFlowbite();
    // const connector = this.injectedService.injected({});
    // console.log('Connector:', connector);
    const { address } = getAccount(wagmiConfig)
    const ensName = await getEnsName(wagmiConfig, { address: address ?? '0x' });
    console.log('ENS name:', ensName);
  }


}
