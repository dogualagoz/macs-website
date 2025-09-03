import { BASE_URL } from './http';
import { getAuthHeader } from './auth';

/**
 * Get all users
 * @returns {Promise<Array>} List of users
 */
export const getAllUsers = async () => {
  const response = await fetch(`${BASE_URL}/users`, {
    headers: {
      ...getAuthHeader()
    }
  });

  if (!response.ok) {
    throw new Error('Kullanıcıları getirme başarısız');
  }

  return response.json();
};

/**
 * Delete a user
 * @param {string} userId User ID to delete
 * @returns {Promise<Object>} Response
 */
export const deleteUser = async (userId) => {
  console.log(`Deleting user with ID: ${userId}`);
  console.log(`API URL: ${BASE_URL}/users/${userId}`);
  console.log(`Auth headers:`, getAuthHeader());
  
  try {
    const response = await fetch(`${BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader()
      }
    });

    console.log(`Delete response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Delete error response: ${errorText}`);
      throw new Error(`Kullanıcı silme başarısız: ${response.status} ${errorText}`);
    }

    // API yanıt olarak boş bir 204 dönebilir, bu durumda JSON parse etmeye çalışmayalım
    if (response.status === 204) {
      return { success: true };
    }
    
    return response.json();
  } catch (error) {
    console.error("Delete user API error:", error);
    throw error;
  }
};
