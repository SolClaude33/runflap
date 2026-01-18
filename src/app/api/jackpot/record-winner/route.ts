import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET || '';

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
    app = initializeApp(firebaseConfig, 'jackpot-record');
    db = getFirestore(app);
  }
  return db;
}

export async function POST(request: NextRequest) {
  try {
    const { winner, winnerAddress, amount, raceNumber, secret } = await request.json();

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const firestore = getFirebaseDb();

    const winnersRef = collection(firestore, 'jackpot_winners');
    await addDoc(winnersRef, {
      winner,
      winnerAddress,
      amount,
      raceNumber,
      timestamp: serverTimestamp(),
    });

    const stateRef = doc(firestore, 'jackpot_state', 'current');
    await setDoc(stateRef, {
      currentRace: 0,
      nextJackpotRace: 50,
      lastWinner: winner,
      lastWinnerAddress: winnerAddress,
      lastWinAmount: amount,
      lastDrawTimestamp: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Winner recorded and race counter reset',
      winner,
      amount,
    });
  } catch (error) {
    console.error('Record winner error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to record winner' 
    }, { status: 500 });
  }
}
