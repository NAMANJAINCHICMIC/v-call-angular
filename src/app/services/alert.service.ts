import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  toastObj:any;
  obj:any;
  constructor() { this.obj = {
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
};
this.toastObj = { icon: '', title: '' };
}

  toastShow(obj:any) {
    const Toast = Swal.mixin(this.obj);
    Toast.fire(obj);
}

successToast(message:any) {
    this.toastObj.icon = 'success';
    this.toastObj.title = message;
    this.toastShow(this.toastObj);
}

errorToast(message:any) {
    this.toastObj.icon = 'error';
    this.toastObj.title = message;
    this.toastShow(this.toastObj);
}

warnToast(message:any) {
    this.toastObj.icon = 'warning';
    this.toastObj.title = message;
    this.toastShow(this.toastObj);
}
}
