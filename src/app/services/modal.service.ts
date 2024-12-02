import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Modal } from 'flowbite';
import type { ModalOptions, ModalInterface } from 'flowbite';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalInstance: ModalInterface | null = null;
  private isOpenSubject = new BehaviorSubject<boolean>(false);

  constructor() {}

  open(modalId: string, options?: ModalOptions): void {
    const $modalElement = document.querySelector(`#${modalId}`) as HTMLElement;
    if ($modalElement) {
      const modalOptions: ModalOptions = {
        placement: 'center',
        backdrop: 'dynamic',
        backdropClasses: 'bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40',
        closable: true,
        ...options
      };

      this.modalInstance = new Modal($modalElement, modalOptions);
      this.modalInstance.show();
      this.isOpenSubject.next(true);
    }
  }

  close(): void {
    if (this.modalInstance) {
      this.modalInstance.hide();
      this.isOpenSubject.next(false);
    }
  }

  isOpen(): Observable<boolean> {
    return this.isOpenSubject.asObservable();
  }
}