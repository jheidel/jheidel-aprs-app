import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { firestore } from 'firebase';
import * as moment from 'moment';
import { CredentialsService, Credentials } from '../auth/credentials.service';

import { AngularFirestore } from '@angular/fire/firestore';

interface Itinerary {
  text: string;
  created_at: firestore.Timestamp;
}

interface Gateway {
  hostname: string;
  started_at: firestore.Timestamp;
  healthy_at: firestore.Timestamp;
}

interface Packet {
  received_at: firestore.Timestamp;
  message: string;
  has_position: boolean;
  position: firestore.GeoPoint;
  src: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  @ViewChild('editor') editor: ElementRef;
  isLoading = false;

  canWrite = false;

  itin: Itinerary | undefined;
  gateways: Array<Gateway> | undefined;
  packets: Array<Packet> | undefined;

  constructor(private fs: AngularFirestore, private credentialsService: CredentialsService) {}

  ngOnInit() {
    this.isLoading = true;

    this.fs
      .collection<Itinerary>('itineraries', (ref) => ref.orderBy('created_at', 'desc').limit(1))
      .valueChanges()
      .subscribe((v) => {
        this.isLoading = false;
        this.itin = !!v ? v[0] : undefined;
      });

    this.fs
      .collection<Gateway>('aprs_gateways', (ref) => ref.orderBy('healthy_at', 'desc'))
      .valueChanges()
      .subscribe((gateways) => {
        this.gateways = gateways;
      });

    this.fs
      .collection<Packet>('aprs_packets', (ref) => ref.orderBy('received_at', 'desc').limit(15))
      .valueChanges()
      .subscribe((packets) => {
        this.packets = packets;
      });

    this.credentialsService.credentials.subscribe((creds) => {
      this.canWrite = !!creds.settings && creds.settings.can_write;
    });
  }

  formatTime(ts: firestore.Timestamp): string {
    return moment(ts.toDate()).toString();
  }

  formatAge(ts: firestore.Timestamp): string {
    return moment.duration(moment().diff(moment(ts.toDate()))).humanize();
  }

  toHealthStyle(ts: firestore.Timestamp): string {
    return moment.duration(moment().diff(moment(ts.toDate()))).asSeconds() < 90 ? 'healthy' : 'unhealthy';
  }

  formatGps(p: firestore.GeoPoint): string {
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
      created_at: firestore.Timestamp.now(),
      text: body,
    });
  }
}
