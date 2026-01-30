import { Context } from 'hono';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { Config } from '../config';

export class AuthController {
    static async login(c: Context) {
        const { tenantId, email, password } = await c.req.json();
        const result = await AuthService.login(tenantId, email, password);

        const isProduction = Config.NODE_ENV === 'production';

        setCookie(c, 'accessToken', result.tokens.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            path: '/',
            maxAge: 60 * 60, // 1 hour (matches JWT expiration)
        });

        setCookie(c, 'refreshToken', result.tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return c.json(new ApiResponse(200, {
            user: result.user,
            modules: result.modules,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
        }, 'Login successful'));
    }

    static async refreshToken(c: Context) {
        // Try to get refresh token from body first, then from cookie
        let refreshToken: string | undefined;
        try {
            const body = await c.req.json();
            refreshToken = body.refreshToken;
        } catch {
            // Body might be empty, try cookie
        }

        // Fallback to cookie if not in body
        if (!refreshToken) {
            refreshToken = getCookie(c, 'refreshToken');
        }

        if (!refreshToken) {
            return c.json(new ApiResponse(400, null, 'Refresh token is required'), 400);
        }

        const tokens = await AuthService.refreshAccessToken(refreshToken);

        const isProduction = Config.NODE_ENV === 'production';

        setCookie(c, 'accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            path: '/',
            maxAge: 60 * 60, // 1 hour (matches JWT expiration)
        });

        // Update refresh token cookie as well
        setCookie(c, 'refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return c.json(new ApiResponse(200, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken // Return new refresh token
        }, 'Token refreshed successfully'));
    }

    static async logout(c: Context) {
        deleteCookie(c, 'accessToken');
        deleteCookie(c, 'refreshToken');

        return c.json(new ApiResponse(200, null, 'Logged out successfully'));
    }
}
