import { initializeApp } from "firebase/app";
import { collection, doc, getDocs, getFirestore, setDoc, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, where, deleteDoc } from 'firebase/firestore'
import { v4 } from 'uuid'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_APIKEY,
  authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_DATABASEURL,
  projectId: process.env.NEXT_PUBLIC_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGEBUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGINGSENDERID,
  appId: process.env.NEXT_PUBLIC_APPID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app)

export const getData = async () => {
  try {
    const wallets = collection(db, "wallets");
    const querySnapshot = await getDocs(wallets);
    querySnapshot.forEach((doc) => {
      console.log(doc.data());
    });
  } catch (error) {
    console.warn('Firebase getData error:', error);
  }
}

export const addWallet = async (wallet: string) => {
  try {
    const walletRef = doc(db, 'wallets', v4())
    await setDoc(walletRef, { wallet })
  } catch (error) {
    console.warn('Firebase addWallet error:', error);
  }
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderAddress: string;
  message: string;
  timestamp: Timestamp | null;
}

export interface LiveBet {
  id: string;
  user: string;
  userAddress: string;
  characterId: number;
  amount: number;
  raceNumber: number;
  timestamp: Timestamp | null;
}

export const sendChatMessage = async (sender: string, senderAddress: string, message: string) => {
  try {
    const messagesRef = collection(db, 'chat_messages');
    await addDoc(messagesRef, {
      sender,
      senderAddress,
      message,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Firebase sendChatMessage error - Configure Firestore rules:', error);
    throw error;
  }
}

export const subscribeToChatMessages = (callback: (messages: ChatMessage[]) => void) => {
  const messagesRef = collection(db, 'chat_messages');
  const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
  
  return onSnapshot(q, 
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        } as ChatMessage);
      });
      callback(messages.reverse());
    },
    (error) => {
      console.warn('Firebase chat subscription error - Configure Firestore rules. See public/firebase-rules-example.txt');
      callback([]);
    }
  );
}

export const placeLiveBet = async (user: string, userAddress: string, characterId: number, amount: number, raceNumber: number) => {
  try {
    const betsRef = collection(db, 'live_bets');
    await addDoc(betsRef, {
      user,
      userAddress,
      characterId,
      amount,
      raceNumber,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Firebase placeLiveBet error - Configure Firestore rules:', error);
  }
}

export const subscribeToLiveBets = (raceNumber: number, callback: (bets: LiveBet[]) => void) => {
  const betsRef = collection(db, 'live_bets');
  const q = query(betsRef, where('raceNumber', '==', raceNumber), orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, 
    (snapshot) => {
      const bets: LiveBet[] = [];
      snapshot.forEach((doc) => {
        bets.push({
          id: doc.id,
          ...doc.data(),
        } as LiveBet);
      });
      callback(bets.reverse());
    },
    (error) => {
      console.warn('Firebase bets subscription error - Configure Firestore rules. See public/firebase-rules-example.txt');
      callback([]);
    }
  );
}

export const clearBetsForRace = async (raceNumber: number) => {
  try {
    const betsRef = collection(db, 'live_bets');
    const q = query(betsRef, where('raceNumber', '==', raceNumber));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn('Firebase clearBetsForRace error:', error);
  }
}

export interface JackpotState {
  currentRace: number;
  nextJackpotRace: number;
  lastWinner: string | null;
  lastWinnerAddress: string | null;
  lastWinAmount: number;
  lastDrawTimestamp: Timestamp | null;
}

export interface JackpotWinner {
  id: string;
  winner: string;
  winnerAddress: string;
  amount: number;
  raceNumber: number;
  timestamp: Timestamp | null;
}

export const getJackpotState = async (): Promise<JackpotState> => {
  try {
    const stateRef = doc(db, 'jackpot_state', 'current');
    const snapshot = await import('firebase/firestore').then(m => m.getDoc(stateRef));
    
    if (snapshot.exists()) {
      return snapshot.data() as JackpotState;
    }
    
    const defaultState: JackpotState = {
      currentRace: 0,
      nextJackpotRace: 50,
      lastWinner: null,
      lastWinnerAddress: null,
      lastWinAmount: 0,
      lastDrawTimestamp: null,
    };
    await setDoc(stateRef, defaultState);
    return defaultState;
  } catch (error) {
    console.warn('Firebase getJackpotState error:', error);
    return {
      currentRace: 0,
      nextJackpotRace: 50,
      lastWinner: null,
      lastWinnerAddress: null,
      lastWinAmount: 0,
      lastDrawTimestamp: null,
    };
  }
}

export const updateJackpotRace = async (raceNumber: number): Promise<void> => {
  try {
    const stateRef = doc(db, 'jackpot_state', 'current');
    const nextJackpot = raceNumber === 0 ? 50 : Math.ceil(raceNumber / 50) * 50;
    await setDoc(stateRef, {
      currentRace: raceNumber,
      nextJackpotRace: nextJackpot,
    }, { merge: true });
  } catch (error) {
    console.warn('Firebase updateJackpotRace error:', error);
  }
}

export const subscribeToJackpotState = (callback: (state: JackpotState) => void) => {
  const stateRef = doc(db, 'jackpot_state', 'current');
  
  return onSnapshot(stateRef, 
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as JackpotState);
      } else {
        callback({
          currentRace: 0,
          nextJackpotRace: 50,
          lastWinner: null,
          lastWinnerAddress: null,
          lastWinAmount: 0,
          lastDrawTimestamp: null,
        });
      }
    },
    (error) => {
      console.warn('Firebase jackpot subscription error:', error);
    }
  );
}

export const getActiveBettors = async (fromRace: number): Promise<{user: string, userAddress: string}[]> => {
  try {
    const betsRef = collection(db, 'live_bets');
    const q = query(betsRef, where('raceNumber', '>=', fromRace));
    const snapshot = await getDocs(q);
    
    const bettorsMap = new Map<string, {user: string, userAddress: string}>();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userAddress && !bettorsMap.has(data.userAddress)) {
        bettorsMap.set(data.userAddress, {
          user: data.user || 'Anonymous',
          userAddress: data.userAddress,
        });
      }
    });
    
    return Array.from(bettorsMap.values());
  } catch (error) {
    console.warn('Firebase getActiveBettors error:', error);
    return [];
  }
}

export const recordJackpotWinner = async (
  winner: string,
  winnerAddress: string,
  amount: number,
  raceNumber: number
): Promise<void> => {
  try {
    const winnersRef = collection(db, 'jackpot_winners');
    await addDoc(winnersRef, {
      winner,
      winnerAddress,
      amount,
      raceNumber,
      timestamp: serverTimestamp(),
    });
    
    const stateRef = doc(db, 'jackpot_state', 'current');
    await setDoc(stateRef, {
      currentRace: 0,
      nextJackpotRace: 50,
      lastWinner: winner,
      lastWinnerAddress: winnerAddress,
      lastWinAmount: amount,
      lastDrawTimestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Firebase recordJackpotWinner error:', error);
  }
}
