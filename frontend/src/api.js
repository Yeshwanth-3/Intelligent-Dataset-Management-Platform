import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getAiSuggestions = async (vid) => {
    const response = await api.get(`/datasets/version/${vid}/ai-suggestions`);
    return response.data;
};


export const getRules = async (dsid) => {
    const response = await api.get(`/datasets/${dsid}/rules`);
    return response.data;
};

export const createRule = async (dsid, data) => {
    const response = await api.post(`/datasets/${dsid}/rules`, data);
    return response.data;
};

export const updateRule = async (rid, data) => {
    const response = await api.put(`/rules/${rid}`, data);
    return response.data;
};

export const deleteRule = async (rid) => {
    const response = await api.delete(`/rules/${rid}`);
    return response.data;
};

export default api;

