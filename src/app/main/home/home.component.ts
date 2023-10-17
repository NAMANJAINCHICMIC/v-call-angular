import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, ViewChild, signal } from '@angular/core';
import Peer from 'peerjs';
import { io } from 'socket.io-client';
import { AlertService } from 'src/app/services/alert.service';
import { WEBSOCKET_URL, environment } from 'src/environment/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  peer !: Peer;
  peerIdShare !: string;
  tempShare !: string;
  emailId !: string;
  peerId !: string;
  callReceived = signal("");
  recordStart = signal(true);
  private lazyStream!: MediaStream;
  private remoteLazyStream!: MediaStream;
  private recordLazyStream!: MediaStream;
  currentPeer!: any;
  private peerList: Array<any> = [];
  smallScreen = true;
  private socket!: WebSocket;
  websocketClient: any;
  recorder: any;
  @ViewChild('localVideo') localVideo !: ElementRef;
  @ViewChild('remoteVideo') remoteVideo !: ElementRef;


  constructor(private http: HttpClient, private alert: AlertService , private changeDetectorRef: ChangeDetectorRef) {
    this.getLocalStream();
    this.getSocketConnetion();
    // this.initSockets();
  }

  getLocalStream() {

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true
    }).then((stream) => {
      this.lazyStream = stream;
      // const options = {
      //   audioBitsPerSecond: 128000,
      //   videoBitsPerSecond: 2500000,

      // };
      // const mediaRecorder = new MediaRecorder(stream, options);

      // this.recorder = new MediaRecorder(stream);
      // setTimeout(() => {
      //   this.recorder.stop();
      //   console.log("stop");

      //   this.recorder.onstop = (e: any) => {
      //     console.log("onstop")
      //   };
      // }, 10000);
      // this.recorder.start();
      // this.recorder.ondataavailable = (event: any) => {
      //   const blob = new Blob([event.data], { type: 'video/webm' });
      //   const file = new File([blob], 'recording.webm');
      //   const link = document.createElement("a");
      //   link.href = URL.createObjectURL(file)
      //   link.download = "v14.webm"
      //   link.click();
      //   link.remove();
      // };
      this.streamLocalVideo(stream);
      // this.streamRemoteVideo(stream);
    }).catch(err => {
      Swal.fire({ text: 'Unable to connect your Camera!', icon: 'error' });
      console.log(err + 'Unable to connect');
      setTimeout(() => {
        this.getLocalStream();
      }, 30000)
    });
  }

  // initSockets() {
  //   this.socket = new WebSocket(WEBSOCKET_URL);

  //   this.socket.onopen = () => {
  //     console.log('WebSocket connection established.');
  //     this.getPeerConnection();
  //   };

  //   this.socket.onmessage = (event: any) => {
  //     console.log('Received message:', event.data);
  //     if (event?.data?.peerId) {
  //       this.initPeerConnection(event?.data?.peerId);
  //     }
  //   };

  //   this.socket.onclose = (event: any) => {
  //     console.log('WebSocket connection closed:', event);
  //     this.alert.warnToast(" WebSocket Connection Break")
  //   };

  //   this.socket.onerror = (error: any) => {
  //     this.alert.warnToast("WebSocket Connection Break")
  //     console.error('WebSocket error:', error);
  //   };
  // }

  sendMessage(message: string): void {
    console.log(message);
    // this.socket.send(message);
  }

  closeConnection(): void {
    this.socket.close();
  }

  getSocketConnetion(){
    this.websocketClient=io(environment.baseUrl, {
      reconnection: true,
      reconnectionDelay: 500,
      transports: ['websocket']
  });
   this.websocketClient.connect();
   this.websocketClient.emit("connection");
   this.websocketClient.on("myPeerId", (data:any)=>{
    console.log("myPeerId",data)
    this.getPeerConnection(data?.peerId);
  })
  this.websocketClient.on("connection", (socket:any) => {
    console.log("connection",socket.id); // x8WIv7-mJelg7on_ALbx
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

  }

  //   emitSocket(eventName: string, data: any, callBack: Function) {
  //     this.socket.emit(eventName, data, callBack);
  // }

  initPeerConnection(id: string) {
    const call = this.peer.call(id, this.lazyStream);
    console.log(call);

    call.on('stream', (remoteStream) => {
      console.log("hit5", call.peer);
      if (!this.peerList.includes(call.peer)) {
        this.currentPeer = call;
        this.streamRemoteVideo(remoteStream);
        this.peerList.push(call.peer);
      }
    });
    call.on('close', () => {
      console.warn("close2")
      //call new peer Id
      // this.callPeer(this.peerIdShare);
      this.alert.warnToast("Connection Break by me")
      this.sendMessage(JSON.stringify({
        freeToConnect: true,
      }));
      call.close();
      this.websocketClient.emit("freeToConnect",{},(res:any)=>{
        console.log("freeToConnect res",res);
        this.initPeerConnection(res?.nextPeerId)
  
      });
    });
    call.on('error', () => {
      //call new peer Id
      // this.callPeer(this.peerIdShare);
      console.warn("Error2")
      this.alert.errorToast("Connection Error")
      this.peer.reconnect();
      this.sendMessage(JSON.stringify({
        freeToConnect: true,
        disconnected: true
      }));
      call.close();
      this.websocketClient.emit("freeToConnect",{},(res:any)=>{
        console.log("freeToConnect res",res);
        this.initPeerConnection(res?.nextPeerId)
  
      });
    });
  }

  getPeerConnection(socketId: string) {
    console.log(socketId)
    this.peer = new Peer(socketId , {
      config: {
        'iceServers': [
          { url: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:relay1.expressturn.com:3478',
            username: 'ef058N8W648XNTFE41',
            credential: 'lfZkFWILXV947OXl'
          },
        ]
      }
    });
    this.getPeerId();
  }

  private getPeerId = () => {
    this.peer.on('open', (id) => {
      this.peerId = id;
      // this.websocketClient.emit("peerId",this.peerId );
      // this.sendMessage(this.peerId);
      this.sendMessage(JSON.stringify({
        peerId: this.peerId,
        freeToConnect: true,
        disconnected: false
      }));
      this.websocketClient.emit("freeToConnect",{},(res:any)=>{
        console.log("freeToConnect res",res);
        this.initPeerConnection(res?.nextPeerId)
  
      });
    });
    this.peer.on('connection', (dataConnection) => {
      console.log('connection', dataConnection);

    });
    this.peer.on('call', (call) => {
      console.log("call from", call.peer);
      console.log("peer.connections", this.peer.connections)
      this.callReceived.set(call.peer);
      // if (confirm("CALL FROM " + this.callReceived())) {
        this.websocketClient.emit("peerConnected");
        call.answer(this.lazyStream);
        call.on('stream', (remoteStream) => {
          console.log("remote call", call);
          // this.currentPeer = call.peerConnection;
          if (!this.peerList.includes(call.peer)) {
            this.remoteLazyStream = remoteStream;
            this.streamRemoteVideo(remoteStream);
            this.peerList.push(call.peer);
          }
        });
        call.on('close', () => {
          this.alert.warnToast("Connection Break")
          console.warn("close")
          //call new peer Id
          // this.callPeer(this.peerIdShare);
          // call.close();
          this.sendMessage(JSON.stringify({
            freeToConnect: true,
          }));
          this.websocketClient.emit("freeToConnect",{},(res:any)=>{
            console.log("freeToConnect res",res);
            this.initPeerConnection(res?.nextPeerId)
      
          });
        });
        call.on('error', () => {
          //call new peer Id
          // this.callPeer(this.peerIdShare);
          console.warn("Error")
          // call.close();
          this.alert.errorToast("Unable To Connect")
          this.sendMessage(JSON.stringify({
            disconnected: true
          }));
          this.peer.reconnect();
          this.websocketClient.emit("freeToConnect",{},(res:any)=>{
            console.log("freeToConnect res",res);
            this.initPeerConnection(res?.nextPeerId)
      
          });
        });

      // }
    });
  }

  // streamRemoteVideo(stream: any) {
  //   // stream.getAudioTracks()[0].enabled = true;
  //   try {
  //     this.remoteVideo.nativeElement.srcObject = stream;
  //   } catch (error) {
  //     this.remoteVideo.nativeElement.src = URL.createObjectURL(stream);
  //   };
  //   this.remoteVideo.nativeElement.play();
  // }

  streamLocalVideo(stream: any) {
    stream.getAudioTracks()[0].enabled = false;
    console.log(this.localVideo.nativeElement)
    try {
      this.localVideo.nativeElement.srcObject = stream;
    } catch (error) {
      this.alert.errorToast("Connection Error")
      // this.localVideo.nativeElement.src = URL.createObjectURL(stream);
      // this.localVideo.nativeElement.srcObject = null;
    };
    this.localVideo.nativeElement.play();
    console.log(this.localVideo.nativeElement)
  }

  onNext() {
    // this.websocketClient.connect();
    // this.websocketClient.emit("connection");
    // this.localVideo.nativeElement.pause();
    // this.remoteVideo.nativeElement.srcObject = null;
    this.currentPeer?.close();
    this.websocketClient.emit("peerDisconnected");
    this.websocketClient.emit("freeToConnect",{},(res:any)=>{
      console.log("freeToConnect res",res);
      this.initPeerConnection(res?.nextPeerId)

    });
    this.sendMessage(JSON.stringify({
      freeToConnect: true
    }));
    this.smallScreen ? this.remoteVideo.nativeElement.srcObject = null : this.localVideo.nativeElement.srcObject = null;
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
      audio:true
      // video: true,
      // audio: {
      //   echoCancellation: true,
      //   noiseSuppression: true
      // }
    }).then(stream => {
      this.recordLazyStream = stream;
      this.recorder = new MediaRecorder(stream);
      // setTimeout(() => {
      //   console.log("stop");
      //   this.recorder.onstop = (e: any) => {
      //     console.log("onstop")
      //   };
      // }, 10000);
      this.recorder.start();
      // this.recordStart.set(true);
      const videoTrack =  this.recordLazyStream.getVideoTracks()[0];
      videoTrack.onended = () => {
        console.log("stop screenshare")
        // this.recordStart.set(true);
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
}
