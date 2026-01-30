
import { connectDB, disconnectDB } from '../config/database';
import { Tenant, User, Branch } from '../models';
import mongoose from 'mongoose';

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const SA_EMAIL = 'admin@paltribe.com';
const SA_PASSWORD = 'password123';

async function fetchJson(url: string, options: any = {}) {
    console.log(`📡 Fetching ${url} [${options.method || 'GET'}]`);

    // Ensure headers exist and Content-Type is set if body is present
    if (!options.headers) options.headers = {};
    if (options.body && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, options);
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = { error: 'Invalid JSON response' };
    }

    if (!response.ok) {
        throw { status: response.status, data };
    }
    return data;
}

async function verifyNewApis() {
    console.log('🚀 Starting Verification...');

    try {
        await connectDB();

        const tenant = await Tenant.findOne({ status: 'ACTIVE' });
        if (!tenant) throw new Error('No active tenant found.');
        const tenantId = tenant._id.toString();

        const branch = await Branch.findOne({ tenantId: tenant._id });
        const branchId = branch ? branch._id.toString() : null;
        console.log(`🏢 Tenant ID: ${tenantId}, Branch ID: ${branchId}`);

        // 1. Login
        const saLogin = await fetchJson(`${BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
                email: SA_EMAIL,
                password: SA_PASSWORD,
                tenantId: tenantId
            })
        });
        const token = saLogin.data.accessToken;
        console.log('✅ SA Logged In');

        const headers: any = { Authorization: `Bearer ${token}` };
        if (branchId) headers['x-branch-id'] = branchId;

        // 2. Test PO List
        console.log('🧪 Testing PO List...');
        const pos = await fetchJson(`${BASE_URL}/purchase-orders`, { headers });
        console.log(`✅ PO List fetched. Count: ${pos.data?.pos?.length || 0}`);

        // 3. Test Dashboard Stats
        console.log('🧪 Testing Dashboard Stats...');
        const stats = await fetchJson(`${BASE_URL}/dashboard/stats`, { headers });
        console.log('✅ Dashboard Stats:', stats.data);

        // 4. Test Profile
        console.log('🧪 Testing Profile...');
        const profile = await fetchJson(`${BASE_URL}/profile/me`, { headers });
        console.log(`✅ Profile Fetched: ${profile.data?.name}`);

        // 5. Test Reports (Sample)
        console.log('🧪 Testing Reports (Live Stock)...');
        const liveStock = await fetchJson(`${BASE_URL}/reports/live-stock`, { headers });
        console.log(`✅ Live Stock Repo fetched. Rows: ${liveStock.data?.length || 0}`);

        console.log('🧪 Testing Reports (PO Status)...');
        const poStatus = await fetchJson(`${BASE_URL}/reports/po-status`, { headers });
        console.log(`✅ PO Status Report fetched. Rows: ${poStatus.data?.length || 0}`);

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message || error);
        if (error.data) console.error('Response Data:', JSON.stringify(error.data, null, 2));
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

verifyNewApis();
