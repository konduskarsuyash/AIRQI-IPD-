import axios from 'axios';

const API_URL = 'http://192.168.2.50:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (email, password) => {
  try {
    const response = await api.post('/login', { email, password });
    console.log('Login response:', response.data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const signup = async (username, email, password) => {
  try {
    console.log('Sending signup request with:', { username, email, password });
    const response = await api.post('/signup', { username, email, password });
    console.log('Signup response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error.response?.data || error.message;
  }
};

export const getCurrentUser = async (token) => {
  try {
    const response = await api.get('/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export default api; 