import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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
    app = initializeApp(firebaseConfig, 'jackpot-bettors');
    db = getFirestore(app);
  }
  return db;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromRace = parseInt(searchParams.get('fromRace') || '0', 10);

    const firestore = getFirebaseDb();
    const betsRef = collection(firestore, 'live_bets');
    const q = query(betsRef, where('raceNumber', '>=', fromRace));
    const snapshot = await getDocs(q);

    const bettorsMap = new Map<string, { user: string; userAddress: string }>();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userAddress && !bettorsMap.has(data.userAddress)) {
        bettorsMap.set(data.userAddress, {
          user: data.user || 'Anonymous',
          userAddress: data.userAddress,
        });
      }
    });

    const bettors = Array.from(bettorsMap.values());

    return NextResponse.json({
      success: true,
      bettors,
      count: bettors.length,
      fromRace,
    });
  } catch (error) {
    console.error('Get bettors error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get bettors' 
    }, { status: 500 });
  }
}
