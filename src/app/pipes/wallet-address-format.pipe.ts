import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'walletAddressFormat',
  standalone: true
})
export class WalletAddressFormatPipe implements PipeTransform {

  transform(value: string): string {
    if (!value || value.length < 10) {
      return value; // Return as is if the address is too short
    }
    const firstSix = value.slice(0, 6);
    const lastFour = value.slice(-4);
    return `${firstSix}...${lastFour}`;
  }

}
