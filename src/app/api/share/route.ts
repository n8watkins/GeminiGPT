import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const SHARED_CHATS_DIR = path.join(process.cwd(), 'shared-chats');

export async function POST(request: NextRequest) {
  try {
    const { chat } = await request.json();

    if (!chat || !chat.id || !chat.messages) {
      return NextResponse.json(
        { error: 'Invalid chat data' },
        { status: 400 }
      );
    }

    // Generate a unique share ID
    const shareId = uuidv4();

    // Prepare the shared chat data
    const sharedChat = {
      shareId,
      originalChatId: chat.id,
      title: chat.title,
      messages: chat.messages,
      createdAt: new Date().toISOString(),
      sharedAt: new Date().toISOString(),
    };

    // Save to file
    const filePath = path.join(SHARED_CHATS_DIR, `${shareId}.json`);
    await writeFile(filePath, JSON.stringify(sharedChat, null, 2), 'utf-8');

    // Return the share ID and URL
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:1337'}/share/${shareId}`;

    return NextResponse.json({
      shareId,
      shareUrl,
      success: true,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    const filePath = path.join(SHARED_CHATS_DIR, `${shareId}.json`);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Shared chat not found' },
        { status: 404 }
      );
    }

    const fileContent = await readFile(filePath, 'utf-8');
    const sharedChat = JSON.parse(fileContent);

    return NextResponse.json(sharedChat);
  } catch (error) {
    console.error('Error fetching shared chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared chat' },
      { status: 500 }
    );
  }
}
