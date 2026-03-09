const API_URL = 'http://localhost:8000';

export async function fetchClient(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (response.status === 401) {
        // Handle token expiration
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    return response;
}
