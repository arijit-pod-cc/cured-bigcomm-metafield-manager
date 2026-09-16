import { NextResponse } from 'next/server';
import {
    encodePayload,
    getBCVerify,
    setSession,
} from '@/lib/auth';

const APP_URL = process.env.APP_URL;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = Object.fromEntries(searchParams.entries());

        const session = await getBCVerify(query);

        const encodedContext = encodePayload(session);

        await setSession(session);

        const redirectUrl = new URL(
            session.url || '/',
            APP_URL
        );

        redirectUrl.searchParams.set(
            'context',
            encodedContext
        );

        return NextResponse.redirect(redirectUrl, 302);
    } catch (error) {
        console.error('Load error:', error);

        return NextResponse.json(
            {
                message: error?.message || 'Unable to load app',
            },
            {
                status: error?.response?.status || 500,
            }
        );
    }
}