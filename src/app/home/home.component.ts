import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import * as moment from 'moment';
import { CredentialsService, Credentials } from '../auth/credentials.service';
import * as L from 'leaflet';

import { AngularFirestore } from '@angular/fire/firestore';

interface Itinerary {
  text: string;
  created_at: firebase.firestore.Timestamp;
}

interface Gateway {
  hostname: string;
  started_at: firebase.firestore.Timestamp;
  healthy_at: firebase.firestore.Timestamp;
}

interface WebPacket {
  userAgent: string;
}

interface Packet {
  received_at: firebase.firestore.Timestamp;
  message: string;
  has_position: boolean;
  position: firebase.firestore.GeoPoint;
  web?: WebPacket;
  id?: string;
}

interface Secrets {
  mapboxAccessToken: string;
  garmin: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  @ViewChild('editor') editor: ElementRef;
  @ViewChild('packetMessage') packetMessage: ElementRef;
  isLoading = false;

  canWrite = false;

  itin: Itinerary | undefined;
  gateways: Array<Gateway> | undefined;
  packets: Array<Packet> | undefined;
  secrets: Secrets | undefined;
  now: firebase.firestore.Timestamp = firebase.firestore.Timestamp.now();

  map: L.Map | undefined;
  mapOptions: L.MapOptions | undefined;
  layers: L.Layer[] | undefined;

  private intervalID: number | undefined;

  constructor(private fs: AngularFirestore, private credentialsService: CredentialsService) {}

  onMapReady(map: L.Map) {
    this.map = map;
  }

  ngOnInit() {
    this.isLoading = true;

    this.mapOptions = {
      layers: [
        L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
          maxZoom: 18,
          attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
          id: 'mapbox/outdoors-v11',
          tileSize: 512,
          zoomOffset: -1,
          accessToken: 'pk.eyJ1IjoiamhlaWRlbCIsImEiOiJja2U4MnF1a3Qxc21sMnV1bHZ1aWZ5ZXo2In0.U5PGgGIw0wmlCNcZKfbDgQ',
        }),
      ],
      zoom: 7,
      center: L.latLng(47.25, -121),
    };

    this.fs
      .collection<Itinerary>('itineraries', (ref) => ref.orderBy('created_at', 'desc').limit(1))
      .valueChanges()
      .subscribe((v) => {
        this.isLoading = false;
        this.now = firebase.firestore.Timestamp.now();
        this.itin = !!v ? v[0] : undefined;
      });

    this.fs
      .collection<Gateway>('gateways', (ref) => ref.orderBy('healthy_at', 'desc'))
      .valueChanges()
      .subscribe((gateways) => {
        this.now = firebase.firestore.Timestamp.now();
        this.gateways = gateways;
      });

    const since = firebase.firestore.Timestamp.fromMillis(
      firebase.firestore.Timestamp.now().toMillis() - 5 * 24 * 3600 * 1000
    );

    this.fs
      .collection<Packet>('packets', (ref) =>
        ref.orderBy('received_at', 'desc').where('received_at', '>', since).limit(1000)
      )
      .valueChanges({ idField: 'id' })
      .subscribe((packets) => {
        this.now = firebase.firestore.Timestamp.now();
        this.packets = packets;

        const coords = this.packets.filter((p) => p.has_position);

        let layers: Array<L.Layer> = coords.map((p) => {
          const text = this.formatGps(p.position) + '<br>' + this.formatTime(p.received_at) + '<br>' + p.message;
          const marker = L.marker([p.position.latitude, p.position.longitude], {
            icon: L.icon({
              iconSize: [25, 41],
              iconAnchor: [13, 41],
              iconUrl: 'leaflet/marker-icon.png',
              iconRetinaUrl: 'leaflet/marker-icon-2x.png',
              shadowUrl: 'leaflet/marker-shadow.png',
            }),
          });
          marker
            .bindTooltip(text, {
              direction: 'top',
            })
            .openTooltip();
          return marker;
        });

        const route = L.polyline(
          coords.map((p) => {
            return [p.position.latitude, p.position.longitude];
          }),
          {
            color: 'red',
          }
        );
        layers.push(route);
        this.layers = layers;

        if (coords && coords.length) {
          this.map.fitBounds(route.getBounds(), {
            padding: L.point(24, 24),
            maxZoom: 12,
            animate: true,
          });
        }
      });

    this.fs
      .collection('environment')
      .doc<Secrets>('secrets')
      .valueChanges()
      .subscribe((doc) => {
        this.secrets = doc;
      });

    this.credentialsService.credentials.subscribe((creds) => {
      this.canWrite = !!creds.settings && creds.settings.can_write;
    });

    if (this.intervalID) {
      window.clearInterval(this.intervalID);
    }
    this.intervalID = window.setInterval(() => {
      this.now = firebase.firestore.Timestamp.now();
    }, 5000);
  }

  formatTime(ts: firebase.firestore.Timestamp): string {
    return moment(ts.toDate()).toString();
  }

  formatAge(now: firebase.firestore.Timestamp, ts: firebase.firestore.Timestamp): string {
    return moment.duration(moment(now.toDate()).diff(moment(ts.toDate()))).humanize();
  }

  isHealthy(ts: firebase.firestore.Timestamp): boolean {
    return moment.duration(moment().diff(moment(ts.toDate()))).asSeconds() < 90;
  }

  toHealthStyle(ts: firebase.firestore.Timestamp): string {
    return this.isHealthy(ts) ? 'healthy' : 'unhealthy';
  }

  formatGps(p: firebase.firestore.GeoPoint): string {
    if (!p) {
      return 'unknown';
    }
    let ns = 'N';
    let lat = p.latitude;
    if (lat < 0) {
      ns = 'S';
      lat *= -1;
    }

    let ew = 'E';
    let long = p.longitude;
    if (long < 0) {
      ew = 'W';
      long *= -1;
    }
    const mult = 10000;
    return Math.round(lat * mult) / mult + '° ' + ns + ', ' + Math.round(long * mult) / mult + '° ' + ew;
  }

  onSaveEditor() {
    const body = this.editor.nativeElement.value;
    this.fs.collection('itineraries').add({
      created_at: firebase.firestore.Timestamp.now(),
      text: body,
    });
  }

  getPosition(): Promise<firebase.firestore.GeoPoint> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (resp) => {
          const pt = new firebase.firestore.GeoPoint(resp.coords.latitude, resp.coords.longitude);
          resolve(pt);
        },
        (err) => {
          reject(err);
        }
      );
    });
  }

  onPacketMessage() {
    const body = this.packetMessage.nativeElement.value.trim();
    this.packetMessage.nativeElement.value = '';

    this.getPosition()
      .then((pos) => {
        const packet: Packet = {
          received_at: firebase.firestore.Timestamp.now(),
          message: body,
          has_position: true,
          position: pos,
          web: {
            userAgent: navigator.userAgent,
          },
        };
        return this.fs.collection('packets').add(packet);
      })
      .then((result) => {
        alert('Post successful');
      })
      .catch((e) => alert('Error: ' + e.message));
  }

  onDeletePacket(e: MouseEvent) {
    const id = (<HTMLInputElement>e.target).dataset['id'];
    if (!confirm('Are you sure you want to delete packet "' + id + '"?')) {
      return;
    }
    this.fs
      .collection('packets')
      .doc(id)
      .delete()
      .catch((e) => alert(e));
  }
}
