import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map, take, tap } from "rxjs/operators";
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument
} from "angularfire2/firestore";
import * as firebase from "firebase/app";

// CUSTOM TYPES
type CollectionPredicate<T> = string | AngularFirestoreCollection<T>;
type DocPredicate<T> = string | AngularFirestoreDocument<T>;

@Injectable({
  providedIn: "root"
})
export class FirestoreService {
  constructor(public _db: AngularFirestore) {}

  // REF
  col<T>(ref: CollectionPredicate<T>, queryFn?): AngularFirestoreCollection<T> {
    return typeof ref === "string" ? this._db.collection<T>(ref, queryFn) : ref;
  }

  doc<T>(ref: DocPredicate<T>): AngularFirestoreDocument<T> {
    return typeof ref === "string" ? this._db.doc<T>(ref) : ref;
  }

  // TIMESTAMP
  get timestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  // CREATE
  // add a document to a collection
  add<T>(
    ref: CollectionPredicate<T>,
    data
  ): Promise<firebase.firestore.DocumentReference> {
    const timestamp = this.timestamp;
    return this.col(ref).add({
      ...data,
      updatedAt: timestamp,
      createdAt: timestamp
    });
  }

  // upsert a document to a collection
  upsert<T>(ref: DocPredicate<T>, data: any): Promise<void> {
    const doc = this.doc(ref)
      .snapshotChanges()
      .pipe(take(1))
      .toPromise();

    return doc.then(snap => {
      return snap.payload.exists ? this.update(ref, data) : this.set(ref, data);
    });
  }

  // set a document to a collection w/o overwrite
  set<T>(ref: DocPredicate<T>, data: any): Promise<void> {
    const timestamp = this.timestamp;
    return this.doc(ref).set(
      {
        ...data,
        updatedAt: timestamp,
        createdAt: timestamp
      },
      { merge: true }
    );
  }

  // get a doc from a collection with the uid
  doc$<T>(ref: DocPredicate<T>): Observable<T> {
    return this.doc(ref)
      .snapshotChanges()
      .pipe(
        map(actions => {
          const data = actions.payload.data() as any;
          const uid = actions.payload.id;
          return { uid, ...data };
        })
      );
  }

  // get the entier collection with the uid
  col$<T>(ref: CollectionPredicate<T>, queryFn?): Observable<T[]> {
    return this.col(ref, queryFn)
      .snapshotChanges()
      .pipe(
        map(actions => {
          return actions.map(a => {
            const data = a.payload.doc.data() as any;
            const uid = a.payload.doc.id;
            return { uid, ...data };
          });
        })
      );
  }

  // UPDATE a document
  update<T>(ref: DocPredicate<T>, data: any): Promise<void> {
    return this.doc(ref).update({
      ...data,
      updatedAt: this.timestamp
    });
  }

  // DELETE a document
  delete<T>(ref: DocPredicate<T>): Promise<void> {
    return this.doc(ref).delete();
  }
}
