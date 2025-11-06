import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const roomId = params.roomId;

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

    // Get messages
    const messages = await sql`
      SELECT 
        m.id,
        m.type,
        m.message,
        m.sender_id as sender,
        m.created_at,
        u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ${roomId}
      ORDER BY m.created_at ASC
    `;

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}