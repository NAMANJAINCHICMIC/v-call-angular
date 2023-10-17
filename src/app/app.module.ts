import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {WebcamModule} from 'ngx-webcam';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environment/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MainModule } from './main/main/main.module';
import { AlertService } from './services/alert.service';
import { NgxSpinnerModule } from 'ngx-spinner';

@NgModule({
  declarations: [
    AppComponent,
   
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    WebcamModule,
    FormsModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireStorageModule,
    AngularFireDatabaseModule,
    AngularFireStorageModule,
    HttpClientModule,
    NgbModule,
    MainModule,
  ],
  providers:[
    AlertService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
