import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

const api = {
    // --- Auth ---
    login: async (email, password) => {
        const loginData = new URLSearchParams();
        loginData.append('username', email);
        loginData.append('password', password);

        const response = await axios.post(`${API_URL}/login`, loginData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data;
    },

    register: async (email, password, username, fullName) => {
        try {
            const response = await axios.post(`${API_URL}/users`, {
                email,
                password,
                username,
                full_name: fullName
            });
            return response.data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    // --- Entries ---
    getEntries: async (token, search = '', sentiment = '') => {
        let url = `${API_URL}/journal-entries`;
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (sentiment && sentiment !== 'All') params.append('sentiment', sentiment);

        if (Array.from(params).length > 0) {
            url += `?${params.toString()}`;
        }

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    createEntry: async (token, textContent) => {
        const response = await axios.post(`${API_URL}/journal-entries`,
            { text_content: textContent },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        return response.data;
    },

    deleteEntry: async (token, entryId) => {
        await axios.delete(`${API_URL}/journal-entries/${entryId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },

    // --- Voice ---
    transcribeAudio: async (token, audioBlob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await axios.post(`${API_URL}/transcribe-audio`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    createVoiceEntry: async (token, audioBlob) => {
        const formData = new FormData();
        // Ensure the file has a .webm extension so the backend recognizes it
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await axios.post(`${API_URL}/journal-entries/voice`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    // --- Chat (RAG) ---
    chatWithJournal: async (token, question) => {
        const response = await axios.post(`${API_URL}/chat`,
            { question },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    }
};

export default api;
