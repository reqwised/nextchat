import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params; // ✅ wajib pakai await sekarang
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // lanjutkan query seperti biasa
  const participant = await sql`
    SELECT 1 FROM room_participants 
    WHERE room_id = ${roomId} AND user_id = ${userId}
  `;

  if (participant.length === 0) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }

  const messages = await sql`
      SELECT 
        m.id,
        m.type,
        m.message,
        m.sender_id as sender,
        m.created_at,
        m.media_url,
        m.media_type,
        m.file_name,
        m.file_size,
        u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ${roomId}
      ORDER BY m.created_at ASC
    `;

  return NextResponse.json({ messages });
}
