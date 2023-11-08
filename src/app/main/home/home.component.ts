import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import Peer, { MediaConnection } from 'peerjs';
import { io } from 'socket.io-client';
import { AlertService } from 'src/app/services/alert.service';
import { LoaderService } from 'src/app/services/loader.service';
import { environment } from 'src/environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  peer !: Peer;
  peerIdShare !: string;
  tempShare !: string;
  emailId !: string;
  peerId !: string;
  otherPeerId?: string = '';
  peers : { [key: string]: any } = new Object({});
  private lazyStream!: MediaStream;
  currentPeer!: any;
  currentCall !: MediaConnection;
  private peerList: Array<any> = [];
  smallScreen = true;
  isConnected = false;
  websocketClient: any;
  @ViewChild('localVideo') localVideo !: ElementRef;
  @ViewChild('remoteVideo') remoteVideo !: ElementRef;


  constructor(
    private alert: AlertService,
    private spinnerService: LoaderService

  ) {
    this.getLocalStream();
    this.spinnerService.showSpinner();
  }

  // video input from user's webcam 
  getLocalStream() {

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true
    }).then((stream) => {
      this.lazyStream = stream;
      this.streamLocalVideo(stream);
      this.getSocketConnetion();
    }).catch(err => {
      this.spinnerService.hideSpinner();
      Swal.fire({ text: 'Unable to connect your Camera!', icon: 'error' }).then(res=>{ this.spinnerService.showSpinner()});
      setTimeout(() => {
        this.getLocalStream();
      }, 30000)
    });
  }

  // Socket Connection established with Node js using socketIO
  getSocketConnetion() {
    this.websocketClient = io(environment.baseUrl, {
      reconnection: true,
      reconnectionDelay: 500,
      transports: ['websocket']
    });
    this.websocketClient.connect();
    this.websocketClient.emit("connection");
    this.websocketClient.on("myPeerId", (data: any) => {
      // console.log("myPeerId", data)
      this.getPeerConnection(data?.peerId);
    })

    this.websocketClient.on('user-disconnected', (userId:string) =>{
      // console.log('user-disconnected',userId);
      if (this.peers[userId]){
          this.peers[userId].close();
      }
      
  })
  }

  //establish peer connection using peerjs
  getPeerConnection(socketId: string) {
    this.peer = new Peer(socketId, {
      config: environment.iceServersConfig
    });
    this.getPeerId();
  }

  private getPeerId = () => {
    this.peer?.on('open', (id) => {
      this.peerId = id;
      console.log("open getPeerId")
      // this.websocketClient.emit("freeToConnect", {}, (res: any) => {
      //   this.initPeerConnection(res?.nextPeerId)
      // });
      this.sendFreetoConnect();
    });
    this.peer?.on('call', (call) => {
      console.log("call",call.peer, call)
      if (!this.isConnected) {
        call.answer(this.lazyStream);
        call.on('stream', (remoteStream) => {
          if (!this.isConnected) {       
            this.currentPeer?.close();
            this.websocketClient.emit("peerConnected");
            this.currentPeer = call.peerConnection;
            this.isConnected = true
            console.log("stream on getPeerId")
            this.alert.successToast("New Connection Established")
            this.spinnerService.hideSpinner();
            this.streamRemoteVideo(remoteStream); 
          }
        });
        call.on('close', () => {
          this.alert.warnToast("Connection Break");
          console.log("close on getPeerId");
          this.onNext();
        });
        call.on('error', () => {
          //call new peer Id

          call.close();
          this.onNext();
          this.spinnerService.showSpinner()
          this.alert.errorToast("Unable To Connect")
          // this.peer.reconnect();
          // this.websocketClient.emit("freeToConnect", {}, (res: any) => {
          //   this.initPeerConnection(res?.nextPeerId)
          // });
        });      
      }
      else{
        console.log("call close",call.peer)
        call.close();
      }
    });
  }
// Connecting person who are available online
  initPeerConnection(id: string) {
    // this.onNext();
    if (id) {
      // this.getLocalStream();
      this.currentCall = this.peer.call(id, this.lazyStream);
      if (this.currentCall?.peer) {
        this.currentCall.on('stream', (remoteStream) => {
          if (!this.isConnected) {
            this.spinnerService.hideSpinner();
            this.alert.successToast("Connection Established")
            this.streamRemoteVideo(remoteStream);
            this.isConnected = true;
            console.log("stream on initPeerConnection");
          }
        });
        this.currentCall.on('close', () => {
          this.alert.warnToast("Connection Break ");
          console.log("close on initPeerConnection");
          // this.currentCall.close();
          this.onNext();     
        });
        this.currentCall.on('error', () => {
          //call new peer Id
          this.spinnerService.showSpinner();
          this.alert.errorToast("Connection Error")
          this.onNext();
          this.currentCall?.close();
          // this.websocketClient.emit("freeToConnect", {}, (res: any) => {
          //   this.initPeerConnection(res?.nextPeerId)
          // });
        });
      }
      this.peers[id] = this.currentCall;
    }
  }

  streamLocalVideo(stream: any) {
    try {
      this.localVideo.nativeElement.srcObject = stream;
    } catch (error) {
      this.alert.errorToast("Connection Error");
    };
    this.localVideo.nativeElement.play();
  }
// connecting next person by breaking connection with connected person
  onNext() {
    // this.alert.warnToast("Trying to Connecting Next Person")
    console.warn("Trying to Connecting Next Person")
    this.currentPeer?.close();
    this.currentCall?.close();
    this.isConnected = false;

    this.spinnerService.showSpinner();
    this.smallScreen ? this.remoteVideo.nativeElement.srcObject = null : this.localVideo.nativeElement.srcObject = null;
    this.websocketClient.emit("peerDisconnected");
    // this.websocketClient.emit("freeToConnect", {}, (res: any) => {
    //   this.initPeerConnection(res?.nextPeerId)
    // });
    this.sendFreetoConnect();
  }
// toggle small screen with large screen
  toggleVideo() {
    this.smallScreen = !this.smallScreen;
    const toggleStream = this.remoteVideo.nativeElement.srcObject;
    this.remoteVideo.nativeElement.srcObject = this.localVideo.nativeElement.srcObject
    this.localVideo.nativeElement.srcObject = toggleStream;
    this.localVideo.nativeElement.play();
    this.remoteVideo.nativeElement.play();
  }

  streamRemoteVideo(stream: MediaStream) {
    if (this.smallScreen) {
      this.remoteVideo.nativeElement.srcObject = stream
      this.remoteVideo.nativeElement.play();
    } else {
      this.localVideo.nativeElement.srcObject = stream;
      this.localVideo.nativeElement.play();
    }
  }
// when pesron is available to connect send request to backend that he is free
  sendFreetoConnect() {
    this.websocketClient.emit("freeToConnect", {}, (res: any) => {
      console.log("freeToConnect res", res);
      if (res?.nextPeerId) {
        this.initPeerConnection(res?.nextPeerId);
      }
    });
  }
}
