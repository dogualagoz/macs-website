const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const fetchEvents = async () => {
    try {
        const response = await fetch(`${API_URL}/events`);
        if (!response.ok) {
            throw new Error('Events yüklenirken bir hata oluştu');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
    }
};

export const fetchCategories = async () => {
    try {
        const response = await fetch(`${API_URL}/events/categories`);
        if (!response.ok) {
            throw new Error('Kategoriler yüklenirken bir hata oluştu');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};