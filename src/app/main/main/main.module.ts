import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from '../home/home.component';
import { AlertService } from 'src/app/services/alert.service';


@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
  ],
  exports:[
    HomeComponent
  ],
  providers:[AlertService]
})
export class MainModule { }
