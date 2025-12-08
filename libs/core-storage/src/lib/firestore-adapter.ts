import { IStorageAdapter } from './storage.interface';
import * as admin from 'firebase-admin';

/**
 * Firestore Storage Adapter
 * Implements storage using Google Cloud Firestore
 */
export class FirestoreStorageAdapter<T = unknown>
  implements IStorageAdapter<T>
{
  private db: admin.firestore.Firestore;
  private collectionName: string;

  constructor(collectionName: string, firebaseApp?: admin.app.App) {
    this.collectionName = collectionName;

    if (firebaseApp) {
      this.db = firebaseApp.firestore();
    } else if (admin.apps.length > 0) {
      this.db = admin.firestore();
    } else {
      throw new Error(
        'Firebase app not initialized. Please initialize Firebase before creating FirestoreStorageAdapter.'
      );
    }
  }

  /**
   * Save a single document
   */
  async save(data: T, docId?: string): Promise<void> {
    try {
      const collection = this.db.collection(this.collectionName);

      // Remove undefined fields to avoid Firestore errors
      const cleanData = this.removeUndefinedFields(data);

      if (docId) {
        await collection
          .doc(docId)
          .set(cleanData as admin.firestore.DocumentData);
      } else {
        await collection.add(cleanData as admin.firestore.DocumentData);
      }
    } catch (error) {
      console.error(
        `[Firestore] Error saving to ${this.collectionName}/${docId || 'new'}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Load all documents from collection
   */
  async load(): Promise<T | null> {
    try {
      const snapshot = await this.db.collection(this.collectionName).get();

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs.map((doc) => ({
        firestoreId: doc.id,
        ...doc.data(),
      }));

      return data as T;
    } catch (error) {
      console.error(
        `Error loading from Firestore collection ${this.collectionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Load a single document by ID
   */
  async loadById(docId: string): Promise<T | null> {
    try {
      const doc = await this.db
        .collection(this.collectionName)
        .doc(docId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return {
        firestoreId: doc.id,
        ...doc.data(),
      } as T;
    } catch (error) {
      console.error(`Error loading document ${docId} from Firestore:`, error);
      throw error;
    }
  }

  /**
   * Query documents with a filter
   */
  async query(
    field: string,
    operator: admin.firestore.WhereFilterOp,
    value: unknown
  ): Promise<T[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where(field, operator, value)
        .get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc) => ({
        firestoreId: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error(
        `Error querying Firestore collection ${this.collectionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all documents from the collection
   */
  async getAll(): Promise<T[]> {
    try {
      const snapshot = await this.db.collection(this.collectionName).get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc) => ({
        firestoreId: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error(
        `Error getting all documents from Firestore collection ${this.collectionName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(docId: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(docId).delete();
    } catch (error) {
      console.error(`Error deleting document ${docId} from Firestore:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple documents by query
   */
  async deleteByQuery(
    field: string,
    operator: admin.firestore.WhereFilterOp,
    value: unknown
  ): Promise<number> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where(field, operator, value)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error(`Error deleting documents from Firestore:`, error);
      throw error;
    }
  }

  /**
   * Batch write operations
   */
  async batchWrite(
    operations: Array<{ type: 'set' | 'delete'; docId: string; data?: T }>
  ): Promise<void> {
    try {
      console.log(
        `    [Firestore] Batch write to ${this.collectionName}: ${operations.length} operations`
      );
      const batch = this.db.batch();
      const collection = this.db.collection(this.collectionName);

      for (const op of operations) {
        const docRef = collection.doc(op.docId);

        if (op.type === 'set' && op.data) {
          const cleanData = this.removeUndefinedFields(op.data);
          batch.set(docRef, cleanData as admin.firestore.DocumentData);
        } else if (op.type === 'delete') {
          batch.delete(docRef);
        }
      }

      await batch.commit();
      console.log(`    [Firestore] Batch committed successfully`);
    } catch (error) {
      console.error(`Error in batch write to Firestore:`, error);
      throw error;
    }
  }

  /**
   * Check if Firestore is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.db.collection(this.collectionName).limit(1).get();
      return true;
    } catch (error) {
      console.error('Firestore not available:', error);
      return false;
    }
  }

  /**
   * Get collection reference
   */
  getCollection(): admin.firestore.CollectionReference {
    return this.db.collection(this.collectionName);
  }

  /**
   * Remove undefined fields from an object recursively
   * Firestore doesn't accept undefined values
   */
  private removeUndefinedFields(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeUndefinedFields(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedFields(value);
        }
      }
      return cleaned;
    }

    return obj;
  }
}
