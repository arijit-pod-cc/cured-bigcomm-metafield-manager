import { NextResponse } from 'next/server';
import {
    encodePayload,
    getBCAuth,
    setSession,
} from '@/lib/auth';

export async function GET(request) {
    try {
        // Get query parameters from the incoming request
        const { searchParams } = new URL(request.url);
        const query = Object.fromEntries(searchParams.entries());

        // Authenticate the app on install
        const session = await getBCAuth(query);

        // Create signed JWT context
        const encodedContext = encodePayload(session);

        // Store session
        await setSession(session);

        // Redirect to the app with context
        const redirectUrl = new URL('/', request.url);
        redirectUrl.searchParams.set('context', encodedContext);

        return NextResponse.redirect(redirectUrl, 302);
    } catch (error) {
        console.error('BigCommerce auth error:', error);

        return NextResponse.json(
            {
                message: error?.message || 'Authentication failed',
            },
            {
                status: error?.response?.status || 500,
            }
        );
    }
}