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

export const fetchFeaturedEvent = async () => {
    try {
        const response = await fetch(`${API_URL}/events/featured`);
        if (response.status === 404) {
            // Öne çıkan etkinlik yoksa null döndür
            return null;
        }
        if (!response.ok) {
            throw new Error('Öne çıkan etkinlik yüklenirken bir hata oluştu');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching featured event:', error);
        // Hata durumunda da null döndür, uygulama çökmesin
        return null;
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

export const fetchProjects = async () => {
    try {
        const response = await fetch(`${API_URL}/projects`);
        if (!response.ok) {
            throw new Error('Projects yüklenirken bir hata oluştu');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
    }
};

export const fetchFeaturedProject = async () => {
    try {
        const response = await fetch(`${API_URL}/projects/featured`);
        if (response.status === 404) {
            // Öne çıkan proje yoksa null döndür
            return null;
        }
        if (!response.ok) {
            throw new Error('Öne çıkan proje yüklenirken bir hata oluştu');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching featured project:', error);
        // Hata durumunda da null döndür, uygulama çökmesin
        return null;
    }
};

export const fetchProjectCategories = async () => {
    try {
        const response = await fetch(`${API_URL}/projects/categories`);
        if (!response.ok) {
            throw new Error('Proje kategorileri yüklenirken bir hata oluştu');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching project categories:', error);
        throw error;
    }
};