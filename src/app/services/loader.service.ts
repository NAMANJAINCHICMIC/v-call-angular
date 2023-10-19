import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  /**
   * 
   * @param spinner | dependency injection of NgxSpinnerService,
   */
  constructor(
    private spinner: NgxSpinnerService 
  ) { }

  /**
   * below function is implemented to show spinner
   */
  showSpinner() {
    this.spinner.show();
  }

  /**
   * below function is implemented to hide spinner
   */
  hideSpinner() {
    this.spinner.hide();
  }
}
