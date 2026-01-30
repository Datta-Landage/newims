
import { connectDB, disconnectDB } from '../config/database';
import { Tenant, User, Role } from '../models';
import mongoose from 'mongoose';

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const SA_EMAIL = 'admin@paltribe.com';
const SA_PASSWORD = 'password123';
const BM_EMAIL = 'manager@paltribe.com';
const BM_PASSWORD = 'password123';

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

async function verifyPermissions() {
    console.log('🚀 Starting Verification...');

    try {
        await connectDB();
        console.log('✅ MongoDB Connected');

        const tenant = await Tenant.findOne({ status: 'ACTIVE' });
        if (!tenant) throw new Error('No active tenant found. Please run seed.');
        const tenantId = tenant._id.toString();
        console.log(`🏢 Tenant ID: ${tenantId}`);

        const saUser = await User.findOne({ email: SA_EMAIL });
        const bmUser = await User.findOne({ email: BM_EMAIL });

        if (!saUser || !bmUser) {
            console.error('❌ Users not found in DB!');
            process.exit(1);
        }
        console.log('✅ Users exist in DB');

        // 1. Login as SA
        console.log(`🔑 Logging in as Super Admin...`);
        const saLogin = await fetchJson(`${BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
                email: SA_EMAIL,
                password: SA_PASSWORD,
                tenantId: tenantId
            })
        });
        const saToken = saLogin.data.accessToken;
        console.log('✅ SA Logged In');

        // 2. Login as BM
        console.log('🔑 Logging in as Branch Manager...');
        const bmLogin = await fetchJson(`${BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
                email: BM_EMAIL,
                password: BM_PASSWORD,
                tenantId: tenantId
            })
        });
        const bmToken = bmLogin.data.accessToken;
        console.log('✅ BM Logged In');

        // 3. Test: BM trying to list Users (Should HAVE permission initially)
        console.log('🧪 Testing BM access to List Users (Should be ALLOWED)...');
        try {
            await fetchJson(`${BASE_URL}/users`, {
                headers: { Authorization: `Bearer ${bmToken}` }
            });
            console.log('✅ BM can list users.');
        } catch (error: any) {
            console.error('❌ BM FAILED to list users:', JSON.stringify(error, null, 2));
        }

        // 4. Test: Remove USER.VIEW permission from BM
        console.log('🔄 removing USER.VIEW permission from BM role...');

        // Fetch BM Role ID
        const rolesResponse = await fetchJson(`${BASE_URL}/roles`, { headers: { Authorization: `Bearer ${saToken}` } });
        const bmRole = rolesResponse.data.find((r: any) => r.roleCode === 'BM');
        if (!bmRole) throw new Error('BM Role not found via API');

        // Fetch User View Permission ID
        const permissionsResponse = await fetchJson(`${BASE_URL}/permissions`, { headers: { Authorization: `Bearer ${saToken}` } });
        const userViewPerm = permissionsResponse.data.find((p: any) => p.permissionCode === 'USER.VIEW');
        if (!userViewPerm) throw new Error('USER.VIEW Permission not found via API');

        // Get current permissions (Use roleId NOT _id because toJSON transforms it)
        const bmRoleDetails = await fetchJson(`${BASE_URL}/roles/${bmRole.roleId}`, { headers: { Authorization: `Bearer ${saToken}` } });
        const currentPermIds = bmRoleDetails.data.permissions.map((p: any) => p.permissionId);

        // Remove USER.VIEW
        const newPermIds = currentPermIds.filter((id: string) => id !== userViewPerm.permissionId);

        await fetchJson(`${BASE_URL}/roles/${bmRole.roleId}/permissions`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${saToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permissionIds: newPermIds })
        });
        console.log('✅ Permission Removed.');

        // 5. Test: BM trying to list Users (Should be DENIED)
        console.log('🧪 Testing BM access to List Users (Should be DENIED)...');
        try {
            await fetchJson(`${BASE_URL}/users`, {
                headers: { Authorization: `Bearer ${bmToken}` }
            });
            console.error('❌ BM WAS ABLE to list users (Should have failed).');
        } catch (error: any) {
            if (error.status === 403) {
                console.log('✅ BM was correctly denied access.');
            } else {
                console.error('❌ Unexpected error:', error.status, JSON.stringify(error.data, null, 2));
            }
        }

        // 6. Restore Permission
        console.log('🔄 Restoring USER.VIEW permission...');
        await fetchJson(`${BASE_URL}/roles/${bmRole.roleId}/permissions`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${saToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permissionIds: currentPermIds })
        });
        console.log('✅ Permission Restored.');

        // 7. Test: BM trying to delete SA User (Should be DENIED by code check)
        console.log('🧪 Testing BM deletes SA User (Should be DENIED)...');
        // Find SA User ID
        const usersResponse = await fetchJson(`${BASE_URL}/users`, { headers: { Authorization: `Bearer ${saToken}` } });
        // Depending on list implementation, might not return email if restricted? 
        // SA Should see everything.
        const saUserRes = usersResponse.data.find((u: any) => u.email === SA_EMAIL);

        if (!saUserRes) {
            console.error('❌ Could not find SA User in list.');
        } else {
            try {
                // Use _id from API response (which might involve id transformation too?)
                // User model also has toJSON transform?
                // Let's check User response. Usually it is _id or id.
                // Assuming _id or id.
                const saUserId = saUserRes._id || saUserRes.id;

                await fetchJson(`${BASE_URL}/users/${saUserId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${bmToken}` }
                });
                console.error('❌ BM WAS ABLE to delete SA user (CRITICAL FAILURE).');
            } catch (error: any) {
                if (error.status === 403) {
                    console.log('✅ BM was correctly denied deleting SA user.');
                } else {
                    console.error('❌ Unexpected error:', error.status, JSON.stringify(error.data, null, 2));
                }
            }
        }

    } catch (error: any) {
        console.error('❌ Verification Script Failed:', error.message || error);
        if (error.data) console.error('Response Data:', JSON.stringify(error.data, null, 2));
    } finally {
        console.log('ℹ️ Disconnecting DB...');
        await disconnectDB();
        console.log('✅ MongoDB Disconnected');
        process.exit(0);
    }
}

verifyPermissions();
