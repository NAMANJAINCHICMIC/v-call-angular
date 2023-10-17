import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AUTH_URL } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  endPointApi = ".json"
  constructor( private http : HttpClient) {

  }

  getAll() {
    return this.http.get(`${AUTH_URL}${this.endPointApi}`,{});
  }

  create(peerId:any) {   
    return  this.http.post(`${AUTH_URL}${this.endPointApi}`,{peerId});
  }

  update(key: string, value: any) {   
    return  this.http.put(`${AUTH_URL}/${key}${this.endPointApi}`,{value});
  }

  delete(key: string) {
    return  this.http.delete(`${AUTH_URL}/${key}${this.endPointApi}`);
  }

}