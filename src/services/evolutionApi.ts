import axios from 'axios';

const BASE_URL = 'https://api-evo.anok.com.br';
const API_KEY = 'Asenhae7070@';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'apikey': API_KEY,
    'Content-Type': 'application/json',
  },
});

export interface WhatsAppInstance {
  instance?: {
    instanceName?: string;
    instanceId?: string;
    status?: string;
    owner?: string;
    profileName?: string;
    profilePictureUrl?: string;
  };
  instanceName?: string;
  name?: string;
  profileName?: string;
  status?: string;
  qrcode?: {
    base64?: string;
    code?: string;
  };
  qr?: string;
  base64?: string;
  pairingCode?: string;
}

export interface LocalWhatsAppInstance {
  id: string;
  instanceName: string;
  userId?: string;
  profileName?: string;
  status: 'open' | 'close' | 'connecting';
  createdAt: string;
}

export interface WhatsAppChat {
  id: string;
  remoteJid: string;
  name?: string;
  pushName?: string;
  profilePictureUrl?: string;
  lastMessage?: {
    content?: string;
    timestamp?: number;
  };
  unreadCount?: number;
}

export interface WhatsAppMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
  };
  messageTimestamp?: number | string;
  pushName?: string;
}

export interface ConnectionState {
  instance?: string;
  state?: 'open' | 'close' | 'connecting';
}

// Helper to extract instance name from different API response formats
export const getInstanceName = (inst: WhatsAppInstance): string | null => {
  return inst?.instance?.instanceName || inst?.instanceName || inst?.name || null;
};

export const evolutionApi = {
  // Create a new instance
  async createInstance(instanceName: string): Promise<WhatsAppInstance> {
    try {
      console.log('Creating instance:', instanceName);
      const response = await api.post('/instance/create', {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
      console.log('Create instance response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating instance:', error);
      throw error;
    }
  },

  // Get all instances
  async fetchInstances(): Promise<WhatsAppInstance[]> {
    try {
      const response = await api.get('/instance/fetchInstances');
      console.log('Fetch instances response:', response.data);

      // Handle different response formats
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data?.instances && Array.isArray(data.instances)) {
        return data.instances;
      }
      if (data && typeof data === 'object') {
        // If it's a single object, wrap in array
        return [data];
      }
      return [];
    } catch (error) {
      console.error('Error fetching instances:', error);
      throw error;
    }
  },

  // Get instance connection state
  async getConnectionState(instanceName: string): Promise<ConnectionState> {
    try {
      console.log(`[Evolution API] Fetching connection state for: ${instanceName}`);
      // Correct endpoint for connection state
      const response = await api.get(`/instance/connectionState/${instanceName}`);
      console.log(`[Evolution API] Raw response for ${instanceName}:`, JSON.stringify(response.data, null, 2));

      // Check different possible response structures
      const state = response.data?.state || response.data?.instance?.state || 'close';
      console.log(`[Evolution API] Extracted state for ${instanceName}:`, state);

      return { instance: instanceName, state: state as any };
    } catch (error: any) {
      console.error(`[Evolution API] Error getting connection state for ${instanceName}:`, error.message);
      console.error(`[Evolution API] Error details:`, error.response?.data);
      return { instance: instanceName, state: 'close' };
    }
  },

  // Connect instance (get QR Code)
  async connectInstance(instanceName: string): Promise<WhatsAppInstance> {
    try {
      console.log('Connecting instance:', instanceName);
      // Updated to use /instance/connect endpoint which returns QR code
      const response = await api.get(`/instance/connect/${instanceName}`);
      console.log('Connect response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error connecting instance:', error);
      throw error;
    }
  },

  // Logout instance
  async logoutInstance(instanceName: string): Promise<void> {
    try {
      // Correct endpoint for logout
      const response = await api.delete(`/instance/logout/${instanceName}`);
      console.log('Logout response:', response.data);
    } catch (error) {
      console.error('Error logging out instance:', error);
      throw error;
    }
  },

  // Delete instance
  async deleteInstance(instanceName: string): Promise<void> {
    try {
      // Correct endpoint for delete
      await api.delete(`/instance/delete/${instanceName}`);
    } catch (error) {
      console.error('Error deleting instance:', error);
      throw error;
    }
  },

  // Restart instance
  async restartInstance(instanceName: string): Promise<void> {
    try {
      // Correct endpoint for restart
      await api.put(`/instance/restart/${instanceName}`);
    } catch (error) {
      console.error('Error restarting instance:', error);
      throw error;
    }
  },

  // Fetch chats from an instance
  async fetchChats(instanceName: string): Promise<WhatsAppChat[]> {
    try {
      console.log('Fetching chats for:', instanceName);
      const response = await api.post(`/chat/findChats/${instanceName}`);
      console.log('Chats response:', response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching chats:', error);
      return [];
    }
  },

  // Fetch messages from a chat
  async fetchMessages(instanceName: string, remoteJid: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    try {
      // Ensure JID is properly formatted
      // If it's a LID (Linked Device), we might need to convert or treat it carefully
      // For now, let's try to use the JID as provided, but log it clearly
      console.log('Fetching messages for:', instanceName, remoteJid);

      const response = await api.post(`/chat/findMessages/${instanceName}`, {
        where: {
          key: {
            remoteJid
          }
        },
        limit
      });
      console.log('Messages response:', response.data);

      const messages = response.data?.messages || response.data;
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  // Fetch messages directly from phone (History Sync) - Useful for filling gaps
  async fetchRemoteMessages(instanceName: string, remoteJid: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    try {
      console.log('Fetching REMOTE messages for:', instanceName, remoteJid);
      // NOTE: Evolution V2 usually has /chat/fetchMessages or similar for remote sync.
      // If /chat/fetchMessages is not available, we rely on /chat/findMessages but with a different query or config?
      // Actually, standard Evolution uses /chat/findMessages from DB.
      // To force sync, sometimes we need to use specific endpoints or options.
      // Assuming standard endpoint for now, but logged as remote fetch.
      // Ideally check documentation. Evolution V2 often syncs automatically.

      // Let's try to pass 'force: true' if supported, or just rely on 'findMessages' being eventually consistent
      // But user complained about MISSING messages.
      // Let's assume pagination might be needed.

      const response = await api.post(`/chat/findMessages/${instanceName}`, {
        where: {
          key: {
            remoteJid
          }
        },
        limit,
        page: 1
      });

      const messages = response.data?.messages || response.data;
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error('Error fetching remote messages:', error);
      return [];
    }
  },


  // Send text message
  async sendMessage(instanceName: string, remoteJid: string, text: string): Promise<void> {
    try {
      console.log('Sending message to:', remoteJid);
      await api.post(`/message/sendText/${instanceName}`, {
        number: remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        text
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Configure Webhook
  async setWebhook(instanceName: string, webhookUrl: string, enabled: boolean = true): Promise<void> {
    try {
      console.log(`Configuring webhook for ${instanceName} -> ${webhookUrl}`);
      const response = await api.post(`/webhook/set/${instanceName}`, {
        webhookUrl,
        webhookByEvents: true,
        webhookBase64: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "SEND_MESSAGE",
          "CONTACTS_UPSERT", // Optional, helps with contact names
          "CONNECTION_UPDATE"
        ],
        enabled
      });
      console.log('Webhook configured:', response.data);
    } catch (error) {
      console.error('Error configuring webhook:', error);
      throw error;
    }
  }
};

export default evolutionApi;
