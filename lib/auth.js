import jwt from 'jsonwebtoken';
import BigCommerce from 'node-bigcommerce';
import db from './db';

const {
    API_URL,
    AUTH_CALLBACK,
    CLIENT_ID,
    CLIENT_SECRET,
    JWT_KEY,
    LOGIN_URL,
} = process.env;

// Used for internal configuration; 3rd party apps may remove
const apiConfig = {};

if (API_URL && LOGIN_URL) {
    apiConfig.apiUrl = API_URL;
    apiConfig.loginUrl = LOGIN_URL;
}

// Create BigCommerce instance
// https://github.com/bigcommerce/node-bigcommerce/
const bigcommerce = new BigCommerce({
    logLevel: 'info',
    clientId: CLIENT_ID,
    secret: CLIENT_SECRET,
    callback: AUTH_CALLBACK,
    responseType: 'json',
    headers: { 'Accept-Encoding': '*' },
    apiVersion: 'v3',
    ...apiConfig,
});

export function bigcommerceClient(
    accessToken,
    storeHash,
    apiVersion = 'v3'
) {
    return new BigCommerce({
        clientId: CLIENT_ID,
        accessToken,
        storeHash,
        responseType: 'json',
        apiVersion,
        ...apiConfig,
    });
}

// Authorizes app on install
export function getBCAuth(query) {
    return bigcommerce.authorize(query);
}

// Verifies app on load/uninstall
export function getBCVerify({ signed_payload_jwt }) {
    if (!signed_payload_jwt) {
        throw new Error('The signed_payload_jwt query parameter is required.');
    }

    return jwt.verify(signed_payload_jwt, CLIENT_SECRET, {
        algorithms: ['HS256'],
    });
}

export async function setSession(session) {
    await Promise.all([
        db.setUser(session),
        db.setStore(session),
        db.setStoreUser(session),
    ]);
}

export async function getSession({ query: { context = '' } }) {
    if (typeof context !== 'string') return;

    const { context: storeHash, user } = decodePayload(context);

    const hasUser = await db.hasStoreUser(
        storeHash,
        String(user?.id)
    );

    // Before retrieving session/hitting APIs, check user
    if (!hasUser) {
        throw new Error(
            'User is not available. Please login or ensure you have access permissions.'
        );
    }

    const accessToken = await db.getStoreToken(storeHash);

    return {
        accessToken,
        storeHash,
        user,
    };
}

// JWT functions to sign/verify 'context' query param from /api/auth or /api/load
export function encodePayload({ user, owner, ...session }) {
    const contextString = session?.context ?? session?.sub;
    const context = contextString.split('/')[1] || '';

    return jwt.sign(
        { context, user, owner },
        JWT_KEY,
        { expiresIn: '24h' }
    );
}

// Verifies JWT for getSession (product APIs)
export function decodePayload(encodedContext) {
    return jwt.verify(encodedContext, JWT_KEY);
}

// Removes store and storeUser on uninstall
export async function removeDataStore(session) {
    await db.deleteStore(session);
    await db.deleteUser(session);
}

// Removes users from app - getSession() for user will fail after user is removed
export async function removeUserData(session) {
    await db.deleteUser(session);
}

// Removes user from storeUsers on logout
export async function logoutUser({ storeHash, user }) {
    const session = {
        context: `store/${storeHash}`,
        user,
    };

    await db.deleteUser(session);
}
