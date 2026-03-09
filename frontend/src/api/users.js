import { fetchClient } from './client';

export const getStudents = async () => {
    const response = await fetchClient('/auth/students');
    if (!response.ok) throw new Error('Failed to fetch students');
    return response.json();
};
