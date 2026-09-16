import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  private headers(token?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(path: string, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: this.headers(token),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return this.parseBody<T>(response);
  }

  async post<T>(path: string, body: unknown, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return this.parseBody<T>(response);
  }

  async patch<T>(path: string, body: unknown, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return this.parseBody<T>(response);
  }

  async put<T>(path: string, body: unknown, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers(token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return this.parseBody<T>(response);
  }

  async delete<T = void>(path: string, token?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers(token),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return this.parseBody<T>(response);
  }

  /** DELETE/neki POST odgovori mogu biti prazni (204 / null) — ne smiju bacati grešku. */
  private async parseBody<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const text = (await response.text()).trim();
    if (!text || text === 'null') {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  private async parseError(response: Response): Promise<Error> {
    try {
      const data = (await response.json()) as { message?: string | string[] };
      const message = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message ?? response.statusText;
      return new Error(message);
    } catch {
      return new Error(response.statusText);
    }
  }
}
