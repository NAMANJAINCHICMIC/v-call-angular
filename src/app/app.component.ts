import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { Peer } from "peerjs";
import { PresenceService } from './services/presence.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit , OnDestroy {
  peer !: Peer;
  peerIdShare !: string;
  tempShare !: string;
  emailId !: string;
  peerId !: string;
  callReceived = signal("");
  private lazyStream: any;
  currentPeer: any;
  private peerList: Array<any> = [];

  // @HostListener('window:beforeunload', ['$event'])
  // beforeunloadHandler(event:Event) {
  //   this.presenceService.delete(this.tempShare).subscribe(res=> console.log(res));
  //   console.log("xss")
  //   this.presenceService.create("hlood")
  //   event.preventDefault();
  //   return false;
  // }
  constructor(private presenceService : PresenceService) {

  }
  ngOnDestroy(): void {
    // this.presenceService.delete(this.tempShare);
    this.presenceService.create("hlood")
  }

  ngOnInit(): void {
    

  //  this.presenceService.getAll();
    
  }

  addEmail() {
    this.peer = new Peer(this.emailId, {
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
      this.presenceService.create(id).subscribe((res : any)=>{
        this.tempShare = res?.name
        console.log(res)});
    });
    this.peer.on('connection', (dataConnection)=>{
      console.log(dataConnection);
    });
    this.peer.on('call', (call) => {
      console.log("hit5", call.peer);
      console.log(this.peer.connections)
      this.callReceived.set(call.peer);
      confirm("CALL FROM " + this.callReceived()) ?
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      }).then((stream) => {
        this.lazyStream = stream;
          this.streamRemoteVideo(stream);
          call.answer(stream);
          call.on('stream', (remoteStream) => {
            console.log("hit5", call);
            this.currentPeer = call.peerConnection;
            if (!this.peerList.includes(call.peer)) {
              this.streamRemoteVideo(remoteStream);
              this.peerList.push(call.peer);
            }
          });
          call.on('close', () => {
            console.warn("close")
            //call new peer Id
            // this.callPeer(this.peerIdShare);
          });
          call.on('error', () => {
            //call new peer Id
            // this.callPeer(this.peerIdShare);
            console.warn("Error")
            this.peer.reconnect();
          });
          
        }).catch(err => {
          console.log(err + 'Unable to get media');
        })
        : {};
    });
  }

  connectWithPeer(): void {
    this.callPeer(this.peerIdShare);
  }

  private callPeer(id: string): void {

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true
    }).then((stream) => {
      this.lazyStream = stream;
      this.streamRemoteVideo(stream);
      const call = this.peer.call(id, stream);
      console.log(call);

      call.on('stream', (remoteStream) => {
        console.log("hit5", call.peer);
        if (!this.peerList.includes(call.peer)) {
          this.currentPeer = call.peerConnection;
          this.streamRemoteVideo(remoteStream);
          this.peerList.push(call.peer);
        }
      });
      call.on('close', () => {
        console.warn("close2")
        //call new peer Id
        // this.callPeer(this.peerIdShare);
      });
      call.on('error', () => {
        //call new peer Id
        // this.callPeer(this.peerIdShare);
        console.warn("Error2")
        this.peer.reconnect();
      });
    }).catch(err => {
      console.log(err + 'Unable to connect');
    });
  }

  private streamRemoteVideo(stream: any): void {
    const video = document.createElement('video');
    video.classList.add('video');
    video.srcObject = stream;
    video.play();

    document.getElementById('remote-video')?.append(video);
  }

  screenShare(): void {
    this.shareScreen();
  }

  private shareScreen(): void {
    // @ts-ignore
    navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      }
    }).then(stream => {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      const sender = this.currentPeer.getSenders().find((s: any) => s.track.kind === videoTrack.kind);
      sender.replaceTrack(videoTrack);
    }).catch(err => {
      console.log('Unable to get display media ' + err);
    });
  }

  private stopScreenShare(): void {
    const videoTrack = this.lazyStream.getVideoTracks()[0];
    const sender = this.currentPeer.getSenders().find((s: any) => s.track.kind === videoTrack.kind);
    sender.replaceTrack(videoTrack);
  }

  async getVideoDevices() {
    const videoDevices = await navigator.mediaDevices.enumerateDevices().then((devices) => {
      devices.filter((device) => device.kind === 'videoinput');
      console.log(devices)
    });

    return videoDevices;
  }

  onHitNext(){
    this.connectWithPeer();
  }
}
