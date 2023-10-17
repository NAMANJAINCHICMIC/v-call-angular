import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from '../home/home.component';
import { AlertService } from 'src/app/services/alert.service';
import { NgxSpinnerModule } from 'ngx-spinner';


@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    NgxSpinnerModule,

  ],
  exports:[
    HomeComponent
  ],
  providers:[AlertService]
})
export class MainModule { }
