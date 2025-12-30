
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  Timestamp,
  onSnapshot,
  limit
} from "firebase/firestore";
import { db as firestore } from "./firebase";
import { User, Activity, Target } from '../types';

class FirebaseDB {
  // --- Users ---
  async getUsers() {
    const q = query(collection(firestore, "users"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
  }

  async getUser(uid: string) {
    const docRef = doc(firestore, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as User) : null;
  }

  async getUserByEmail(email: string) {
    const q = query(collection(firestore, "users"), where("email", "==", email), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as User;
  }

  async addUser(user: User) {
    await setDoc(doc(firestore, "users", user.uid), {
      ...user,
      createdAt: Timestamp.now().toMillis(),
      updatedAt: Timestamp.now().toMillis()
    });
    return user;
  }

  async updateUser(uid: string, updates: Partial<User>) {
    const docRef = doc(firestore, "users", uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now().toMillis()
    });
  }

  async deleteUser(uid: string) {
    await deleteDoc(doc(firestore, "users", uid));
  }

  // --- Activities ---
  async getActivities() {
    const q = query(collection(firestore, "activities"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), activityId: doc.id } as Activity));
  }

  async addActivity(activity: Omit<Activity, 'activityId'>) {
    const docRef = await addDoc(collection(firestore, "activities"), {
      ...activity,
      timestamp: Timestamp.now().toMillis()
    });
    return { ...activity, activityId: docRef.id };
  }

  async updateActivityStatus(id: string, approved: boolean) {
    const docRef = doc(firestore, "activities", id);
    await updateDoc(docRef, { approved });
  }

  // --- Targets ---
  async getTargets() {
    const q = query(collection(firestore, "targets"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), targetId: doc.id } as Target));
  }

  async addTarget(target: Omit<Target, 'targetId'>) {
    const docRef = await addDoc(collection(firestore, "targets"), {
      ...target,
      createdAt: Timestamp.now().toMillis()
    });
    return { ...target, targetId: docRef.id };
  }

  async updateTarget(id: string, updates: Partial<Target>) {
    const docRef = doc(firestore, "targets", id);
    await updateDoc(docRef, updates);
  }

  async deleteTarget(id: string) {
    await deleteDoc(doc(firestore, "targets", id));
  }

  // --- Real-time Listeners ---
  subscribeToActivities(callback: (activities: Activity[]) => void) {
    const q = query(collection(firestore, "activities"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), activityId: doc.id } as Activity)));
    });
  }

  subscribeToUsers(callback: (users: User[]) => void) {
    const q = query(collection(firestore, "users"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as User));
    });
  }

  subscribeToTargets(callback: (targets: Target[]) => void) {
    const q = query(collection(firestore, "targets"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), targetId: doc.id } as Target)));
    });
  }
}

export const db = new FirebaseDB();
