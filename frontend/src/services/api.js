const API_URL = "http://localhost:8000";

export const fetchEvents = async () => {
    try {
        const response = await fetch(`${API_URL}/events`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
    }
}; 