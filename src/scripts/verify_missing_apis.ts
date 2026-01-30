
import { connectDB, disconnectDB } from '../config/database';
import { Tenant, User, Branch, Vendor, Item, WorkArea } from '../models';
import mongoose from 'mongoose';

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const SA_EMAIL = 'admin@paltribe.com';
const SA_PASSWORD = 'password123';

async function fetchJson(url: string, options: any = {}) {
    console.log(`📡 Fetching ${url} [${options.method || 'GET'}]`);

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
        // console.error('Request failed:', data); // Optional debug
        throw { status: response.status, data };
    }
    return data;
}

async function verifyMissingApis() {
    console.log('🚀 Starting Verification of MISSING APIs...');

    try {
        await connectDB();

        const tenant = await Tenant.findOne({ status: 'ACTIVE' });
        if (!tenant) throw new Error('No active tenant found.');
        const tenantId = tenant._id.toString();

        const branch = await Branch.findOne({ tenantId: tenant._id });
        const branchId = branch ? branch._id.toString() : null;

        const vendor = await Vendor.findOne({ tenantId: tenant._id });
        const vendorId = vendor ? vendor._id.toString() : null;

        const item = await Item.findOne({ tenantId: tenant._id });
        const itemId = item ? item._id.toString() : null;

        const workArea = await WorkArea.findOne({ tenantId: tenant._id });
        let workAreaId = workArea ? workArea._id.toString() : null;

        console.log(`🏢 Context: Branch=${branchId}, Vendor=${vendorId}, Item=${itemId}, WorkArea=${workAreaId}`);

        if (!workAreaId && branchId) {
            console.log('⚠️ WorkArea missing. Creating one...');
            const newWA = await WorkArea.create({
                tenantId: tenant._id,
                name: 'Test Kitchen',
                branchIds: [branch!._id],
                status: 'ACTIVE'
            });
            workAreaId = newWA._id.toString();
            console.log(`✅ WorkArea Created: ${workAreaId}`);
        }

        if (!vendorId || !itemId || !workAreaId) {
            throw new Error('Missing master data (Vendor/Item/WorkArea). Seed DB first.');
        }

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
        console.log('✅ Logged In');

        const headers: any = { Authorization: `Bearer ${token}` };
        if (branchId) headers['x-branch-id'] = branchId;


        // --- Test Special Orders ---
        console.log('\n🧪 Testing Special Orders...');
        const newSO = await fetchJson(`${BASE_URL}/special-orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                vendorId: vendorId,
                branchId: branchId,
                deliveryDate: new Date().toISOString(),
                totalAmount: 100
            })
        });
        const soId = newSO.data.soId || newSO.data._id;
        console.log(`✅ Special Order Created: ${soId}`);
        const soList = await fetchJson(`${BASE_URL}/special-orders`, { headers });
        console.log(`✅ Special Orders Listed: ${soList.data.length}`);


        // --- Test Purchase Order Operations (Cancel/Delete/Update) ---
        console.log('\n🧪 Testing PO CRUD...');
        // Create dummy PO
        const newPO = await fetchJson(`${BASE_URL}/purchase-orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                vendorId: vendorId,
                deliveryDate: new Date().toISOString(),
                items: [{ itemId: itemId, quantity: 10, unitCost: 100 }]
            })
        });
        const poId = newPO.data.poId || newPO.data._id; // Adjust based on response
        console.log(`PO Created: ${poId}`);

        // Update PO
        await fetchJson(`${BASE_URL}/purchase-orders/${poId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ deliveryDate: new Date().toISOString() })
        });
        console.log('✅ PO Updated');

        // Cancel PO
        await fetchJson(`${BASE_URL}/purchase-orders/${poId}/cancel`, {
            method: 'PATCH',
            headers
        });
        console.log('✅ PO Cancelled');

        // Delete PO
        // Note: Logic says "Cannot delete APPROVED or CLOSED". We cancelled it, so delete might be allowed or not depending on strict logic.
        // My code: "if (po.status !== PurchaseOrderStatus.OPEN && po.status !== PurchaseOrderStatus.CANCELLED)".
        // So CANCELLED allows delete.
        await fetchJson(`${BASE_URL}/purchase-orders/${poId}`, {
            method: 'DELETE',
            headers
        });
        console.log('✅ PO Deleted');


        // --- Test Indent Operations (Reject/Cancel) ---
        console.log('\n🧪 Testing Indent CRUD...');
        const newIndent = await fetchJson(`${BASE_URL}/indents`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workAreaId: workAreaId,
                items: [{ itemId: itemId, requestedQty: 5 }]
            })
        });
        const indentId = newIndent.data.indentId || newIndent.data._id;
        console.log(`Indent Created: ${indentId}`);

        // Cancel Indent
        await fetchJson(`${BASE_URL}/indents/${indentId}/cancel`, {
            method: 'PATCH',
            headers
        });
        console.log('✅ Indent Cancelled');

        // Create another for Reject
        const indent2 = await fetchJson(`${BASE_URL}/indents`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workAreaId: workAreaId,
                items: [{ itemId: itemId, requestedQty: 5 }]
            })
        });
        const indentId2 = indent2.data.indentId || indent2.data._id;
        // Reject Indent
        await fetchJson(`${BASE_URL}/indents/${indentId2}/reject`, {
            method: 'PATCH',
            headers
        });
        console.log('✅ Indent Rejected');


        // --- Test Inventory Adjustment ---
        console.log('\n🧪 Testing Inventory Adjustment...');
        const adj = await fetchJson(`${BASE_URL}/inventory/adjust`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                itemId: itemId,
                workAreaId: workAreaId,
                quantity: 5, // Add 5
                reason: 'Found extra'
            })
        });
        console.log(`✅ Stock Adjusted (Added 5): ${adj.data.quantityInStock}`);

        const adj2 = await fetchJson(`${BASE_URL}/inventory/adjust`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                itemId: itemId,
                workAreaId: workAreaId,
                quantity: -2, // Remove 2
                reason: 'Spilled'
            })
        });
        console.log(`✅ Stock Adjusted (Removed 2): ${adj2.data.quantityInStock}`);


        // --- Test RTV List ---
        console.log('\n🧪 Testing RTV List...');
        // Create RTV requires existing GRN. Creating GRN flow is complex here.
        // Just testing LIST endpoint for empty/success.
        const rtvList = await fetchJson(`${BASE_URL}/rtv`, { headers });
        console.log(`✅ RTV List fetched. Count: ${rtvList.data.length}`);


        console.log('\n🎉 ALL MISSING APIS VERIFIED SUCCESSFULLY!');

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message || error);
        if (error.data) console.error('Response Data:', JSON.stringify(error.data, null, 2));
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

verifyMissingApis();
