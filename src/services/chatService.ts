import { supabase } from '@/lib/supabase';

// ==========================================
// Chat Operations
// ==========================================

export interface Chat {
    id: string;
    user_id: string;
    instance_name: string;
    remote_jid: string;
    contact_name: string | null;
    profile_picture_url: string | null;
    last_message_time: string | null;
    last_message_content: string | null;
    unread_count: number;
    is_group: boolean;
    column_id: string;
    workspace_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    chat_id: string;
    user_id: string;
    message_id: string;
    remote_jid: string;
    from_me: boolean;
    sender_jid: string | null;
    message_type: string;
    content: string | null;
    quoted_message_id: string | null;
    timestamp: string;
    status: string;
    created_at: string;
    media_files?: MediaFile[];
}

export interface MediaFile {
    id: string;
    message_id: string;
    user_id: string;
    file_type: string;
    file_name: string | null;
    mime_type: string | null;
    file_size: number | null;
    file_url: string | null;
    thumbnail_url: string | null;
    duration: number | null;
    width: number | null;
    height: number | null;
    created_at: string;
}

export interface KanbanColumn {
    id: string;
    user_id: string;
    column_id: string;
    label: string;
    description?: string;
    color: string;
    is_visible?: boolean;
    is_default: boolean;
    position: number;
    created_at: string;
}

// ==========================================
// Chat Functions
// ==========================================

export async function upsertChat(userId: string, chatData: {
    instance_name: string;
    remote_jid: string;
    contact_name?: string;
    profile_picture_url?: string;
    last_message_time?: string;
    last_message_content?: string;
    unread_count?: number;
    is_group?: boolean;
    column_id?: string;
    workspace_id?: string;
}): Promise<Chat | null> {
    // Normalize JID to prevent duplicates (deal with @lid vs @s.whatsapp.net)
    let normalizedJid = chatData.remote_jid;
    if (!normalizedJid.includes('@g.us')) {
        const rawNumber = normalizedJid.replace(/\D/g, '');
        normalizedJid = `${rawNumber}@s.whatsapp.net`;
    }

    const { data, error } = await supabase
        .from('chats')
        .upsert({
            user_id: userId,
            instance_name: chatData.instance_name,
            remote_jid: normalizedJid,
            contact_name: chatData.contact_name || null,
            profile_picture_url: chatData.profile_picture_url || null,
            last_message_time: chatData.last_message_time || null,
            last_message_content: chatData.last_message_content || null,
            unread_count: chatData.unread_count || 0,
            is_group: chatData.is_group || false,
            column_id: chatData.column_id || 'leads-novos',
            workspace_id: chatData.workspace_id || null,
        }, {
            onConflict: 'user_id,instance_name,remote_jid', // This constraint MUST exist in DB
            ignoreDuplicates: false,
        })
        .select()
        .single();

    if (error) {
        console.error('Error upserting chat:', error);
        return null;
    }

    return data;
}

export async function getUserChats(userId: string, instanceName?: string, workspaceId?: string): Promise<Chat[]> {
    let query = supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_time', { ascending: false, nullsFirst: false });

    if (instanceName) {
        query = query.eq('instance_name', instanceName);
    }

    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching chats:', error);
        return [];
    }

    return data || [];
}

export async function updateChatColumn(chatId: string, columnId: string): Promise<boolean> {
    const { error } = await supabase
        .from('chats')
        .update({ column_id: columnId })
        .eq('id', chatId);

    if (error) {
        console.error('Error updating chat column:', error);
        return false;
    }

    return true;
}

export async function updateChatUnreadCount(chatId: string, count: number): Promise<boolean> {
    const { error } = await supabase
        .from('chats')
        .update({ unread_count: count })
        .eq('id', chatId);

    if (error) {
        console.error('Error updating unread count:', error);
        return false;
    }

    return true;
}

// ==========================================
// Message Functions
// ==========================================

export async function upsertMessage(userId: string, messageData: {
    chat_id: string;
    message_id: string;
    remote_jid: string;
    from_me: boolean;
    sender_jid?: string;
    message_type?: string;
    content?: string;
    quoted_message_id?: string;
    timestamp: string;
    status?: string;
}): Promise<Message | null> {
    // console.log('Upserting message:', messageData.message_id); // Reduced noise

    const { data, error } = await supabase
        .from('messages')
        .upsert({
            user_id: userId,
            chat_id: messageData.chat_id,
            message_id: messageData.message_id,
            remote_jid: messageData.remote_jid,
            from_me: messageData.from_me,
            sender_jid: messageData.sender_jid || null,
            message_type: messageData.message_type || 'text',
            content: messageData.content || null,
            quoted_message_id: messageData.quoted_message_id || null,
            timestamp: messageData.timestamp,
            status: messageData.status || 'sent',
        }, {
            onConflict: 'user_id,message_id,remote_jid',
            ignoreDuplicates: false,
        })
        .select()
        .single();

    if (error) {
        console.error('CRITICAL: Error upserting message:', error.message, error.details, messageData);
        return null;
    }

    return data;
}

export async function getChatMessages(chatId: string, limit: number = 50): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select(`
      *,
      media_files(*)
    `)
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching messages from DB:', error);
        return [];
    }

    return (data || []).reverse();
}

// ==========================================
// Kanban Column Functions
// ==========================================

export async function getUserKanbanColumns(userId: string, workspaceId?: string): Promise<KanbanColumn[]> {
    let query = supabase
        .from('kanban_columns')
        .select('*')
        .order('position');

    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    } else {
        // Strict Isolation: Always filter by user if no workspace specified
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching kanban columns:', error);
        return [];
    }

    return data || [];
}


export async function createKanbanColumn(userId: string, columnData: {
    column_id: string;
    label: string;
    description?: string;
    color: string;
    is_visible?: boolean;
    is_default?: boolean;
    position?: number;
    workspace_id?: string;
}): Promise<KanbanColumn | null> {
    const { data, error } = await supabase
        .from('kanban_columns')
        .insert({
            user_id: userId,
            column_id: columnData.column_id,
            label: columnData.label,
            description: columnData.description || null,
            color: columnData.color,
            is_visible: columnData.is_visible !== undefined ? columnData.is_visible : true,
            is_default: columnData.is_default || false,
            position: columnData.position || 0,
            workspace_id: columnData.workspace_id || null,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating kanban column:', error);
        return null;
    }

    return data;
}

export async function deleteKanbanColumn(columnId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('column_id', columnId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting kanban column:', error);
        return false;
    }

    return true;
}

export async function updateKanbanColumn(
    columnId: string,
    userId: string,
    updates: { label?: string; description?: string; color?: string; is_visible?: boolean; position?: number }
): Promise<KanbanColumn | null> {
    const { data, error } = await supabase
        .from('kanban_columns')
        .update(updates)
        .eq('column_id', columnId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating kanban column:', error);
        return null;
    }

    return data;
}

export async function updateKanbanColumnPositions(
    userId: string,
    updates: { column_id: string; position: number }[]
): Promise<boolean> {
    // We update sequentially or use an rpc if available. 
    // For simplicity with standard Supabase client, we'll map updates.
    // To avoid unique constraint issues if swapping, we might need care, 
    // but typically position isn't unique constraint.

    // Using upsert would be ideal if we had all fields, but we only have position.
    // So we iterate updates.

    const { error } = await supabase.rpc('update_kanban_positions', {
        updates: updates,
        user_uuid: userId
    });

    if (error) {
        // Fallback if RPC doesn't exist: Client-side loop ( slower but works without new migration)
        console.warn('RPC update_kanban_positions failed/missing, falling back to client-side updates', error);

        for (const update of updates) {
            await supabase
                .from('kanban_columns')
                .update({ position: update.position })
                .eq('column_id', update.column_id)
                .eq('user_id', userId);
        }
        return true;
    }

    return true;
}

// ==========================================
// Sync Functions - Evolution API to Supabase
// ==========================================

export async function syncChatsFromEvolution(
    userId: string,
    instanceName: string,
    evolutionChats: any[]
): Promise<Chat[]> {
    const syncedChats: Chat[] = [];

    for (const chat of evolutionChats) {
        const chatData = {
            instance_name: instanceName,
            remote_jid: chat.remoteJid,
            contact_name: chat.name || chat.pushName || null,
            profile_picture_url: chat.profilePictureUrl || null,
            last_message_time: chat.lastMessage?.timestamp
                ? new Date(parseInt(chat.lastMessage.timestamp) * 1000).toISOString()
                : null,
            last_message_content: chat.lastMessage?.content || null,
            unread_count: chat.unreadCount || 0,
            is_group: chat.remoteJid?.includes('@g.us') || false,
        };

        const syncedChat = await upsertChat(userId, chatData);
        if (syncedChat) {
            syncedChats.push(syncedChat);
        }
    }

    return syncedChats;
}

export async function syncMessagesFromEvolution(
    userId: string,
    chatId: string,
    remoteJid: string,
    evolutionMessages: any[]
): Promise<Message[]> {
    const syncedMessages: Message[] = [];

    for (const msg of evolutionMessages) {
        const messageData = {
            chat_id: chatId,
            message_id: msg.key.id,
            remote_jid: remoteJid,
            from_me: msg.key.fromMe || false,
            sender_jid: msg.key.participant || null,
            message_type: getMessageType(msg),
            content: extractMessageContent(msg),
            timestamp: new Date(parseInt(msg.messageTimestamp) * 1000).toISOString(),
            status: 'delivered',
        };

        const syncedMessage = await upsertMessage(userId, messageData);
        if (syncedMessage) {
            syncedMessages.push(syncedMessage);
        }
    }

    return syncedMessages;
}

// Helper functions
function getMessageType(msg: any): string {
    if (msg.message?.conversation || msg.message?.extendedTextMessage) return 'text';
    if (msg.message?.imageMessage) return 'image';
    if (msg.message?.videoMessage) return 'video';
    if (msg.message?.audioMessage) return 'audio';
    if (msg.message?.documentMessage) return 'document';
    if (msg.message?.stickerMessage) return 'sticker';
    return 'unknown';
}

function extractMessageContent(msg: any): string {
    if (msg.message?.conversation) return msg.message.conversation;
    if (msg.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
    if (msg.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
    if (msg.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
    return '';
}
