import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.hyperliquid.xyz';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Hyperliquid API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Hyperliquid API' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch all required data in parallel
    const [allMidsRes, spotMetaRes, perpsMetaRes] = await Promise.all([
      fetch(`${API_BASE_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' })
      }),
      fetch(`${API_BASE_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'spotMeta' })
      }),
      fetch(`${API_BASE_URL}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta' })
      })
    ]);

    const [allMids, spotMeta, perpsMeta] = await Promise.all([
      allMidsRes.json(),
      spotMetaRes.json(),
      perpsMetaRes.json()
    ]);

    return NextResponse.json({
      allMids,
      spotMeta,
      perpsMeta
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}