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
  websocketClient: any;
  @ViewChild('localVideo') localVideo !: ElementRef;
  @ViewChild('remoteVideo') remoteVideo !: ElementRef;


  constructor(
    private alert: AlertService,
    private spinnerService: LoaderService

  ) {
    this.getLocalStream();
    this.getSocketConnetion();
    this.spinnerService.showSpinner()
  }

  getLocalStream() {

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true
    }).then((stream) => {
      this.lazyStream = stream;
      this.streamLocalVideo(stream);
    }).catch(err => {
      this.spinnerService.hideSpinner();
      Swal.fire({ text: 'Unable to connect your Camera!', icon: 'error' }).then(res=>{ this.spinnerService.showSpinner()});
      setTimeout(() => {
        this.getLocalStream();
      }, 30000)
    });
  }

  getSocketConnetion() {
    this.websocketClient = io(environment.baseUrl, {
      reconnection: true,
      reconnectionDelay: 500,
      transports: ['websocket']
    });
    this.websocketClient.connect();
    this.websocketClient.emit("connection");
    this.websocketClient.on("myPeerId", (data: any) => {
      console.log("myPeerId", data)
      this.getPeerConnection(data?.peerId);
    })
    this.websocketClient.on("connection", (socket: any) => {
      console.log("connection", socket.id); // x8WIv7-mJelg7on_ALbx
    });
    
    // client-side
    this.websocketClient.on("connect", () => {
      console.log("connect"); // x8WIv7-mJelg7on_ALbx
    });

    this.websocketClient.on("disconnect", () => {
      console.log("disconnect"); // undefined
    });
    this.websocketClient.on('user-disconnected', (userId:string) =>{
      // console.log('user-disconnected',userId);
      if (this.peers[userId]){
          this.peers[userId].close();
      }
      
  })
  }

  initPeerConnection(id: string) {
    if (id) {
      this.currentCall = this.peer.call(id, this.lazyStream);
      if (this.currentCall?.peer) {
        this.currentCall.on('stream', (remoteStream) => {
          if (!this.peerList.length) {
            this.spinnerService.hideSpinner();
            this.alert.successToast("Connection Established")
            this.streamRemoteVideo(remoteStream);
            this.peerList.push(this.currentCall?.peer);

          }
        });
        this.currentCall.on('close', () => {
          this.alert.warnToast("Connection Break ")
          this.currentCall.close();
          this.onNext();
          this.peerList.pop();
        
        });
        this.currentCall.on('error', () => {
          //call new peer Id
          this.spinnerService.showSpinner();
          this.alert.errorToast("Connection Error")
          this.peer.reconnect();
          this.currentCall?.close();
          this.websocketClient.emit("freeToConnect", {}, (res: any) => {
            this.initPeerConnection(res?.nextPeerId)
          });
        });
      }
      this.peers[id] = this.currentCall;
    }
  }

  getPeerConnection(socketId: string) {
    this.peer = new Peer(socketId, {
      config: environment.iceServersConfig
    });
    this.getPeerId();
  }

  private getPeerId = () => {
    this.peer?.on('open', (id) => {
      this.peerId = id;
      this.websocketClient.emit("freeToConnect", {}, (res: any) => {
        this.initPeerConnection(res?.nextPeerId)
      });
    });
    this.peer?.on('connection', (dataConnection) => {
      console.log('connection', dataConnection);
    });
    this.peer?.on('call', (call) => {
      if (!this.otherPeerId) {
        call.answer(this.lazyStream);
        call.on('stream', (remoteStream) => {
          if (!this.peerList.length) {
            this.otherPeerId = call.peer;
            this.currentPeer = call.peerConnection;
            this.websocketClient.emit("peerConnected");
            this.alert.successToast("New Connection Established")
            this.spinnerService.hideSpinner();
            this.streamRemoteVideo(remoteStream);
            this.peerList.push(call.peer);
          }
        });
        call.on('close', () => {
          this.alert.warnToast("Connection Break")
          this.peerList.pop();
          this.otherPeerId = '';
          call.close();
          this.onNext();
        });
        call.on('error', () => {
          //call new peer Id
          this.otherPeerId = '';
          call.close();
          this.spinnerService.showSpinner()
          this.alert.errorToast("Unable To Connect")
          this.peer.reconnect();
          this.websocketClient.emit("freeToConnect", {}, (res: any) => {
            this.initPeerConnection(res?.nextPeerId)
          });
        });      
      }
    });
  }

  streamLocalVideo(stream: any) {
    try {
      this.localVideo.nativeElement.srcObject = stream;
    } catch (error) {
      this.alert.errorToast("Connection Error");
    };
    this.localVideo.nativeElement.play();
  }

  onNext() {
    // this.alert.warnToast("Trying to Connecting Next Person")
    console.warn("Trying to Connecting Next Person")
    // this.currentPeer.close();
    this.peerList.pop();
    this.otherPeerId = '';

    if (this.currentPeer?.peer) {
      this.currentPeer.close();
    }
    if (this.currentCall?.peer) {
      this.currentCall.close();
    }
    this.spinnerService.showSpinner();
    this.smallScreen ? this.remoteVideo.nativeElement.srcObject = null : this.localVideo.nativeElement.srcObject = null;
    this.websocketClient.emit("peerDisconnected");
    this.websocketClient.emit("freeToConnect", {}, (res: any) => {
      this.initPeerConnection(res?.nextPeerId)
    });
  }

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

  sendFreetoConnect() {
    this.websocketClient.emit("freeToConnect", {}, (res: any) => {
      console.log("freeToConnect res", res);
      if (res?.nextPeerId) {
        this.initPeerConnection(res?.nextPeerId);
      }
    });
  }
}
