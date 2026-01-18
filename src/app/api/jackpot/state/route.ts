import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_APIKEY,
  authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGEBUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGINGSENDERID,
  appId: process.env.NEXT_PUBLIC_APPID,
};

let app: any;
let db: any;

function getFirebaseDb() {
  if (!app) {
    app = initializeApp(firebaseConfig, 'jackpot-state');
    db = getFirestore(app);
  }
  return db;
}

export async function GET() {
  try {
    const firestore = getFirebaseDb();
    const stateRef = doc(firestore, 'jackpot_state', 'current');
    const snapshot = await getDoc(stateRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const pendingDraw = data.currentRace > 0 && data.currentRace % 50 === 0;
      
      return NextResponse.json({
        success: true,
        currentRace: data.currentRace,
        nextJackpotRace: data.nextJackpotRace,
        lastWinner: data.lastWinner,
        lastWinnerAddress: data.lastWinnerAddress,
        lastWinAmount: data.lastWinAmount,
        pendingDraw,
      });
    }

    const defaultState = {
      currentRace: 0,
      nextJackpotRace: 50,
      lastWinner: null,
      lastWinnerAddress: null,
      lastWinAmount: 0,
      lastDrawTimestamp: null,
    };
    
    await setDoc(stateRef, defaultState);

    return NextResponse.json({
      success: true,
      ...defaultState,
      pendingDraw: false,
    });
  } catch (error) {
    console.error('Jackpot state error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get state' 
    }, { status: 500 });
  }
}
