import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { QuoteService } from './quote.service';
import { AngularFirestore } from '@angular/fire/firestore';

interface Itinerary {
  text: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  quote: string | undefined;
  isLoading = false;

  text: string | undefined;

  constructor(private quoteService: QuoteService, private fs: AngularFirestore) {}

  ngOnInit() {
    this.isLoading = true;

    this.quoteService
      .getRandomQuote({ category: 'dev' })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((quote: string) => {
        this.quote = quote;
      });

    const query = this.fs.collection<Itinerary>('itineraries', (ref) => ref.orderBy('created_at', 'desc').limit(1));
    query.valueChanges().subscribe((v) => {
      console.log(v);
      this.text = !!v ? v[0].text : '';
    });
  }
}
