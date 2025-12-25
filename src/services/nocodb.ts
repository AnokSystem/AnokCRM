import axios from 'axios';

const BASE_URL = 'https://anokdb.anok.com.br';
const PROJECT_ID = 'pgrqrypaeyndt19';
const AUTH_TOKEN = '0sFW3NnqZf1C6DMxGfk4G9WrZk1YeJc9RBOv1ZhI';

const api = axios.create({
  baseURL: `${BASE_URL}/api/v2/tables`,
  headers: {
    'xc-token': AUTH_TOKEN,
    'Content-Type': 'application/json',
  },
});

// Table IDs - these should be configured based on your NocoDB setup
export const TABLES = {
  LEADS: 'leads',
  PRODUCTS: 'products',
  SUPPLIERS: 'suppliers',
  ORDERS: 'orders',
  FLOWS: 'flows',
  SETTINGS: 'settings',
};

// Generic CRUD operations
export const nocodbService = {
  // GET all records from a table
  async getAll<T>(tableId: string, params?: Record<string, any>): Promise<T[]> {
    try {
      const response = await api.get(`/${tableId}/records`, { params });
      return response.data.list || [];
    } catch (error) {
      console.error(`Error fetching from ${tableId}:`, error);
      throw error;
    }
  },

  // GET single record by ID
  async getById<T>(tableId: string, recordId: string | number): Promise<T> {
    try {
      const response = await api.get(`/${tableId}/records/${recordId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching record ${recordId} from ${tableId}:`, error);
      throw error;
    }
  },

  // POST create new record
  async create<T>(tableId: string, data: Partial<T>): Promise<T> {
    try {
      const response = await api.post(`/${tableId}/records`, data);
      return response.data;
    } catch (error) {
      console.error(`Error creating record in ${tableId}:`, error);
      throw error;
    }
  },

  // POST bulk create records
  async createBulk<T>(tableId: string, data: Partial<T>[]): Promise<T[]> {
    try {
      const response = await api.post(`/${tableId}/records`, data);
      return response.data;
    } catch (error) {
      console.error(`Error bulk creating records in ${tableId}:`, error);
      throw error;
    }
  },

  // PATCH update record
  async update<T>(tableId: string, recordId: string | number, data: Partial<T>): Promise<T> {
    try {
      const response = await api.patch(`/${tableId}/records`, {
        Id: recordId,
        ...data,
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating record ${recordId} in ${tableId}:`, error);
      throw error;
    }
  },

  // DELETE record
  async delete(tableId: string, recordId: string | number): Promise<void> {
    try {
      await api.delete(`/${tableId}/records`, {
        data: { Id: recordId },
      });
    } catch (error) {
      console.error(`Error deleting record ${recordId} from ${tableId}:`, error);
      throw error;
    }
  },

  // Search/filter records
  async search<T>(tableId: string, where: string): Promise<T[]> {
    try {
      const response = await api.get(`/${tableId}/records`, {
        params: { where },
      });
      return response.data.list || [];
    } catch (error) {
      console.error(`Error searching in ${tableId}:`, error);
      throw error;
    }
  },
};

// Brasil API for CNPJ lookup
export const brasilApi = {
  async consultarCNPJ(cnpj: string) {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    try {
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching CNPJ:', error);
      throw error;
    }
  },
};

export default nocodbService;
