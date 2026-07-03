/**
 * Auth Service
 *
 * Handles JWT storage, authentication checks, and user session details.
 */

const API_BASE = 'http://localhost:3000/api';

class AuthService {
  /**
   * Performs login request and stores credentials.
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Login failed.');
    }

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data.user;
  }

  /**
   * Logs out the user and redirects to login.html.
   */
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = 'login.html';
  }

  /**
   * Retrieves the raw JWT token.
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Retrieves the parsed user details.
   * @returns {object|null}
   */
  getUser() {
    try {
      const rawUser = localStorage.getItem('auth_user');
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Checks whether the user is authenticated.
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    // Simple expiry check if token is JWT
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        this.logout();
        return false;
      }
      return true;
    } catch (_) {
      return false;
    }
  }
}

export const authService = new AuthService();
