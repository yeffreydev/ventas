import { NextRequest, NextResponse } from 'next/server';

const CRM_SERVER_URL = process.env.CRM_SERVER_URL || 'http://localhost:3001';

// GET - Get scheduled messages queue stats from CRM server
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${CRM_SERVER_URL}/scheduled-messages/stats`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CRM Server error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch stats from CRM server', serverUrl: CRM_SERVER_URL },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error connecting to CRM server:', error.message);
    return NextResponse.json(
      { 
        error: 'Could not connect to CRM server', 
        message: error.message,
        serverUrl: CRM_SERVER_URL 
      },
      { status: 503 }
    );
  }
}

// POST - Manually trigger message poll on CRM server
export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${CRM_SERVER_URL}/scheduled-messages/trigger-poll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CRM Server error:', errorText);
      return NextResponse.json(
        { error: 'Failed to trigger poll on CRM server' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error connecting to CRM server:', error.message);
    return NextResponse.json(
      { 
        error: 'Could not connect to CRM server', 
        message: error.message,
        serverUrl: CRM_SERVER_URL 
      },
      { status: 503 }
    );
  }
}
