import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import Peer, { MediaConnection } from 'peerjs';
import { io } from 'socket.io-client';
import { AlertService } from 'src/app/services/alert.service';
import { LoaderService } from 'src/app/services/loader.service';
import { SpinnerComponent } from 'src/app/shared/spinner/spinner.component';
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
  callReceived = signal("");
  recordStart = signal(true);
  peers : { [key: string]: any } = new Object({});
  private lazyStream!: MediaStream;
  private remoteLazyStream!: MediaStream;
  private recordLazyStream!: MediaStream;
  currentPeer!: any;
  currentCall !: MediaConnection;
  private peerList: Array<any> = [];
  smallScreen = true;
  private socket!: WebSocket;
  websocketClient: any;
  recorder: any;
  @ViewChild('localVideo') localVideo !: ElementRef;
  @ViewChild('remoteVideo') remoteVideo !: ElementRef;


  constructor(
    private http: HttpClient,
    private alert: AlertService,
    private changeDetectorRef: ChangeDetectorRef,
    private spinnerService: LoaderService

  ) {
    this.getLocalStream();
    this.getSocketConnetion();
    this.spinnerService.showSpinner()
    // this.initSockets();
  }

  getLocalStream() {

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true
    }).then((stream) => {
      this.lazyStream = stream;
      this.streamLocalVideo(stream);
    }).catch(err => {
      Swal.fire({ text: 'Unable to connect your Camera!', icon: 'error' });
      console.log(err + 'Unable to connect');
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
    // this.websocketClient.on("freeToConnect", (socket:any) => {
    //   console.log("connection",socket.id); // x8WIv7-mJelg7on_ALbx
    // });

    // client-side
    this.websocketClient.on("connect", () => {
      console.log("connect"); // x8WIv7-mJelg7on_ALbx
    });

    this.websocketClient.on("disconnect", () => {
      console.log("disconnect"); // undefined
    });
    this.websocketClient.on('user-disconnected', (userId:string) =>{
      console.log('user-disconnected',userId);
      if (this.peers[userId]){
          this.peers[userId].close();
      }
      
  })
  }

  initPeerConnection(id: string) {
    console.log(id);
    if (id) {
      this.currentCall = this.peer.call(id, this.lazyStream);
      console.log("hit5", this.currentCall?.peer);
      if (this.currentCall?.peer) {

        this.currentCall.on('stream', (remoteStream) => {
          console.log("call peerList", this.currentCall?.peer, this.peerList);
          if (!this.peerList.length) {
            this.spinnerService.hideSpinner();
            this.alert.successToast("Connection Accepted")
            // this.currentPeer = this.currentCall;
            this.streamRemoteVideo(remoteStream);
            this.peerList.push(this.currentCall?.peer);
            // this.currentCall.emit(myEvent);
          }
        });
        this.currentCall.on('close', () => {
          console.warn("close2")
          this.alert.warnToast("Connection Break ")
          this.currentCall.close();
          this.onNext();
          this.peerList.pop();
          // this.spinnerService.showSpinner()
          // //call new peer Id
          // console.log(this.peer.disconnected)
          // this.websocketClient.emit("freeToConnect", {}, (res: any) => {
          //   console.log("freeToConnect res", res);
          //   this.initPeerConnection(res?.nextPeerId)

          // });
        });
        this.currentCall.on('error', () => {
          //call new peer Id
          this.spinnerService.showSpinner()
          console.warn("Error2")
          this.alert.errorToast("Connection Error")
          this.peer.reconnect();
          this.currentCall?.close();
          this.websocketClient.emit("freeToConnect", {}, (res: any) => {
            console.log("freeToConnect res", res);
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
        console.log("freeToConnect onStart", res);
        this.initPeerConnection(res?.nextPeerId)

      });
    });
    this.peer?.on('connection', (dataConnection) => {
      console.log('connection', dataConnection);

    });
    this.peer?.on('call', (call) => {
      // console.log("call from", call.peer);
      this.callReceived.set(call.peer);
      // if (confirm("CALL FROM " + this.callReceived())) {
      if (!this.otherPeerId) {
        call.answer(this.lazyStream);
        call.on('stream', (remoteStream) => {
          // console.log("remote call", call);
          // console.log("call peerList", this.peerList);
          if (!this.peerList.length) {
            this.otherPeerId = call.peer;
            this.currentPeer = call.peerConnection;
            this.websocketClient.emit("peerConnected");
            this.alert.successToast("Call Received")
            this.spinnerService.hideSpinner();
            this.remoteLazyStream = remoteStream;
            this.streamRemoteVideo(remoteStream);
            this.peerList.push(call.peer);
          }
        });
        call.on('close', () => {
          this.alert.warnToast("Connection Break By Another Person")
          this.peerList.pop();
          console.warn("Connection Break By Another Person")
          this.otherPeerId = '';
          call.close();
          this.onNext();

          // this.spinnerService.showSpinner()
          // //call new peer Id
          // this.websocketClient.emit("freeToConnect", {}, (res: any) => {
          //   console.log("freeToConnect res", res);
          //   this.initPeerConnection(res?.nextPeerId)

          // });
        });
        call.on('error', () => {
          //call new peer Id
          console.warn("Error")
          this.otherPeerId = '';
          call.close();
          this.spinnerService.showSpinner()

          this.alert.errorToast("Unable To Connect")
          this.peer.reconnect();
          this.websocketClient.emit("freeToConnect", {}, (res: any) => {
            console.log("freeToConnect res", res);
            this.initPeerConnection(res?.nextPeerId)

          });
        });
       
      }
    });
  }

  streamLocalVideo(stream: any) {
    // stream.getAudioTracks()[0].enabled = false;
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

    // console.log("hitClose", this.currentCall.open);
    if (this.currentPeer?.peer) {
      console.log("hitClose currentPeer", this.currentPeer?.peer);
      this.currentPeer.close();
    }
    // console.log("hitClose currentCall", this.currentCall?.peer);
    if (this.currentCall?.peer) {
      console.log("hitClose currentCall", this.currentCall?.peer);
      this.currentCall.close();
    }
    // this.peer.removeAllListeners();
    // this.peer._removeConnection(this.peerList?.[0]);
    console.log(this.peer.disconnected)
    // if (!this.peer.disconnected) {
    //   this.peer.removeAllListeners();
    // }
    // this.currentPeer?.remove();
    this.spinnerService.showSpinner();
    this.smallScreen ? this.remoteVideo.nativeElement.srcObject = null : this.localVideo.nativeElement.srcObject = null;
    this.websocketClient.emit("peerDisconnected");
    this.websocketClient.emit("freeToConnect", {}, (res: any) => {
      console.log("freeToConnect onNext", res);
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

  startRecording() {
    this.recordStart.set(false);
    navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
      // video: true,
      // audio: {
      //   echoCancellation: true,
      //   noiseSuppression: true
      // }
    }).then(stream => {
      this.recordLazyStream = stream;

      this.recorder = new MediaRecorder(stream);
      this.recorder.start();
      const videoTrack = this.recordLazyStream.getVideoTracks()[0];
      videoTrack.onended = () => {
        console.log("stop screenshare")
        this.changeDetectorRef.detectChanges();
        this.stopRecording();
      };
      this.recorder.ondataavailable = (event: any) => {
        console.log("ondataavailable")
        // Save the recorded video data to a file.
        const blob = new Blob([event.data], { type: 'video/webm' });
        const file = new File([blob], 'recording.webm');
        // Save the file to a file.
        const link = document.createElement("a");
        link.href = URL.createObjectURL(file)
        link.download = "v14.webm"
        link.click();
        link.remove();
      };
    }).catch(err => {
      console.log('Unable to get display media ' + err);
    });
  }

  stopRecording() {
    this.recordStart.set(true);
    console.log("stop recording")
    if (this.recordLazyStream) {
      const tracks = this.recordLazyStream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    this.recorder.stop();
  }

  sendFreetoConnect() {
    this.websocketClient.emit("freeToConnect", {}, (res: any) => {
      console.log("freeToConnect res", res);
      if (res?.nextPeerId) {
        this.initPeerConnection(res?.nextPeerId)
      }

    });
  }
}
