'use server';

import { bigcommerceClient, decodePayload } from '@/lib/auth';

async function getBigCommerceClient(context) {
    if (!context) {
        return null;
    }

    const session = decodePayload(context);
    const storeHash = session?.context;
    const user = session?.user;

    if (!storeHash || !user?.id) {
        return null;
    }

    const db = (await import('@/lib/db')).default;
    const hasUser = await db.hasStoreUser(storeHash, String(user.id));

    if (!hasUser) {
        return null;
    }

    const accessToken = await db.getStoreToken(storeHash);

    if (!accessToken) {
        return null;
    }

    return bigcommerceClient(accessToken, storeHash);
}

function normalizePagination(meta = {}, fallbackPage = 1, fallbackLimit = 20) {
    const pagination = meta.pagination || {};

    return {
        total: Number(pagination.total ?? 0),
        count: Number(pagination.count ?? 0),
        perPage: Number(pagination.per_page ?? pagination.perPage ?? fallbackLimit),
        currentPage: Number(pagination.current_page ?? pagination.currentPage ?? fallbackPage),
        totalPages: Number(pagination.total_pages ?? pagination.totalPages ?? 1),
    };
}

export async function fetchProductsItems(context, options = {}) {
    const { page = 1, limit = 50, search = '' } = options;
    const client = await getBigCommerceClient(context);

    if (!client) {
        return {
            items: [],
            pagination: normalizePagination({}, page, limit),
        };
    }

    const params = new URLSearchParams({
        page: String(Number(page) || 1),
        limit: String(Number(limit) || 50),
        include: 'images',
    });

    if (search.trim()) {
        params.set('keyword', search.trim());
    }

    const response = await client.get(`/catalog/products?${params.toString()}`);

    const items = (response?.data || []).map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        image: `/api/product/${product.id}/image?context=${encodeURIComponent(context)}`,
    }));

    return {
        items,
        pagination: normalizePagination(response?.meta, page, limit),
    };
}

export async function fetchVariantsItems(context, options = {}) {
    const { page = 1, limit = 50, search = '' } = options;
    const client = await getBigCommerceClient(context);

    if (!client) {
        return {
            items: [],
            pagination: normalizePagination({}, page, limit),
        };
    }

    const params = new URLSearchParams({
        page: String(Number(page) || 1),
        limit: String(Number(limit) || 50),
        include: 'variants',
    });

    if (search.trim()) {
        params.set('keyword', search.trim());
    }

    const response = await client.get(`/catalog/products?${params.toString()}`);

    const items = (response?.data || []).map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        image: `/api/product/${product.id}/image?context=${encodeURIComponent(context)}`,
        variantCount: Array.isArray(product?.variants) ? product.variants.length : 0,
    }));

    return {
        items,
        pagination: normalizePagination(response?.meta, page, limit),
    };
}

export async function fetchOrdersItems(context, options = {}) {
    const { page = 1, limit = 50, search = '' } = options;
    const client = await getBigCommerceClient(context);

    if (!client) {
        return {
            items: [],
            pagination: normalizePagination({}, page, limit),
        };
    }

    const params = new URLSearchParams({
        page: String(Number(page) || 1),
        limit: String(Number(limit) || 50),
    });

    if (search.trim()) {
        params.set('keyword', search.trim());
    }

    const response = await client.get(`/orders?${params.toString()}`);

    const items = (response?.data || []).map((order) => ({
        id: order.id,
        name: order?.customer?.first_name
            ? `${order.customer.first_name} ${order.customer.last_name || ''}`.trim()
            : `Order #${order.id}`,
        sku: order?.order_id || order?.id || null,
        image: null,
    }));

    return {
        items,
        pagination: normalizePagination(response?.meta, page, limit),
    };
}

export async function fetchPagesItems(context, options = {}) {
    const { page = 1, limit = 50, search = '' } = options;
    const client = await getBigCommerceClient(context);

    if (!client) {
        return {
            items: [],
            pagination: normalizePagination({}, page, limit),
        };
    }

    const params = new URLSearchParams({
        page: String(Number(page) || 1),
        limit: String(Number(limit) || 50),
    });

    if (search.trim()) {
        params.set('keyword', search.trim());
    }

    const response = await client.get(`/content/pages?${params.toString()}`);

    const items = (response?.data || []).map((page) => ({
        id: page.id,
        name: page.name,
        sku: page.url || page.id,
        image: null,
        type: page.type || 'page',
    }));

    return {
        items,
        pagination: normalizePagination(response?.meta, page, limit),
    };
}

export async function fetchCategoryItems(category, context, options = {}) {
    const normalizedCategory = String(category || '').toLowerCase();

    if (normalizedCategory === 'products') {
        return fetchProductsItems(context, options);
    }

    if (normalizedCategory === 'variants') {
        return fetchVariantsItems(context, options);
    }

    if (normalizedCategory === 'orders') {
        return fetchOrdersItems(context, options);
    }

    if (normalizedCategory === 'pages') {
        return fetchPagesItems(context, options);
    }

    return {
        items: [],
        pagination: normalizePagination({}, options.page || 1, options.limit || 50),
    };
}
