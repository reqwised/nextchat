import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { roomId, message, type = 'text' } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is participant
    const participant = await sql`
      SELECT 1 FROM room_participants 
      WHERE room_id = ${roomId} AND user_id = ${userId}
    `;

    if (participant.length === 0) {
      return NextResponse.json(
        { error: 'Not a participant' },
        { status: 403 }
      );
    }

    // Insert message
    const result = await sql`
      INSERT INTO messages (room_id, sender_id, type, message)
      VALUES (${roomId}, ${userId}, ${type}, ${message})
      RETURNING id, type, message, sender_id as sender, created_at
    `;

    return NextResponse.json({ 
      success: true,
      message: result[0]
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}