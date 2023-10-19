import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from '../home/home.component';
import { AlertService } from 'src/app/services/alert.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { SpinnerComponent } from 'src/app/shared/spinner/spinner.component';


@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    SpinnerComponent
  ],
  exports:[
    HomeComponent
  ],
  providers:[AlertService]
})
export class MainModule { }
