import { NextResponse } from 'next/server';
import {
    getBCVerify,
    removeDataStore,
} from '@/lib/auth';

export async function GET(request) {
    try {
        // Get query parameters from the incoming request
        const { searchParams } = new URL(request.url);
        const query = Object.fromEntries(searchParams.entries());

        // Verify the BigCommerce uninstall request
        const session = await getBCVerify(query);

        // Remove store and user data
        await removeDataStore(session);

        return new NextResponse(null, {
            status: 200,
        });
    } catch (error) {
        console.error('BigCommerce uninstall error:', error);

        return NextResponse.json(
            {
                message: error?.message || 'Uninstall failed',
            },
            {
                status: error?.response?.status || 500,
            }
        );
    }
}