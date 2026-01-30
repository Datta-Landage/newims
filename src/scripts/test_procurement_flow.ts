
import { connectDB, disconnectDB } from '../config/database';
import { Tenant, User, Branch, Vendor, Item, WorkArea, Category, PurchaseOrder, InventoryStock, Indent } from '../models';
import mongoose from 'mongoose';

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const SA_EMAIL = 'admin@paltribe.com';
const SA_PASSWORD = 'password123';

// Helper for HTTP requests
async function fetchJson(url: string, options: any = {}) {
    console.log(`📡 ${options.method || 'GET'} ${url}`);

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

async function runProcurementTest() {
    console.log('🚀 INITIALIZING PROCUREMENT FLOW TEST...');
    let token: string;
    let headers: any;
    let context: any = {};

    try {
        await connectDB();

        // --- 0. PRE-REQUISITES (DB & CONTEXT) ---
        console.log('\n--- [0. SETUP] ---');
        const tenant = await Tenant.findOne({ status: 'ACTIVE' });
        if (!tenant) throw new Error('No active tenant found.');

        let branch = await Branch.findOne({ tenantId: tenant._id });
        if (!branch) {
            branch = await Branch.create({ tenantId: tenant._id, branchName: 'Test Branch', status: 'ACTIVE', location: 'Test Loc' });
        }

        let user = await User.findOne({ email: SA_EMAIL });
        if (!user) throw new Error('Admin user not found.');

        let category = await Category.findOne({ tenantId: tenant._id });
        if (!category) {
            category = await Category.create({ tenantId: tenant._id, name: 'Test Category', status: 'ACTIVE' });
        }

        let vendor = await Vendor.findOne({ tenantId: tenant._id });
        if (!vendor) {
            vendor = await Vendor.create({ tenantId: tenant._id, vendorName: 'Test Vendor', status: 'ACTIVE' });
        }

        // Work Area
        let workArea = await WorkArea.findOne({ tenantId: tenant._id });
        if (!workArea) {
            workArea = await WorkArea.create({ tenantId: tenant._id, name: 'Test Kitchen', branchIds: [branch._id], status: 'ACTIVE' });
        }

        // Item
        let item = await Item.findOne({ tenantId: tenant._id, itemCode: 'PROC-TEST-001' });
        if (!item) {
            item = await Item.create({
                tenantId: tenant._id,
                itemCode: 'PROC-TEST-001',
                itemName: 'Procurement Test Item',
                categoryId: category._id,
                inventoryUom: 'KG',
                unitCost: 50,
                taxRate: 5,
                status: 'ACTIVE'
            });
        }

        context.itemId = item._id.toString();
        context.vendorId = vendor._id.toString();
        context.branchId = branch._id.toString();
        context.workAreaId = workArea._id.toString();

        context.item = item;

        // Ensure some stock exists (so we can issue ANY quantity, even if partial)
        // Or setup zero stock? The test requires Partial Issue.
        // Partial Issue usually means: Requested 50, Issued 20 (available/authorized).
        // Let's seed 20 stock.
        await InventoryStock.findOneAndUpdate(
            { tenantId: tenant._id, itemId: item._id, workAreaId: workArea._id, branchId: branch._id },
            { quantityInStock: 20 },
            { upsert: true }
        );


        // --- 1. AUTHENTICATION ---
        console.log('\n--- [1. AUTHENTICATION] ---');
        const loginRes = await fetchJson(`${BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email: SA_EMAIL, password: SA_PASSWORD, tenantId: tenant._id.toString() })
        });
        token = loginRes.data.accessToken;
        headers = { Authorization: `Bearer ${token}` };
        headers['x-branch-id'] = branch._id.toString();
        console.log('✅ Login Successful');


        // --- 2. CREATE & APPROVE INDENT ---
        console.log('\n--- [2. CREATE INDENT] ---');
        const indentRes = await fetchJson(`${BASE_URL}/indents`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workAreaId: context.workAreaId,
                remarks: 'Procurement Flow Test',
                entryType: 'OPEN',
                items: [{ itemId: context.itemId, requestedQty: 50 }]
            })
        });
        const indentId = indentRes.data.indentId || indentRes.data._id;
        console.log(`✅ Indent Created: ${indentId}`);

        await fetchJson(`${BASE_URL}/indents/${indentId}/approve`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'APPROVED' })
        });
        console.log('✅ Indent Approved');


        // --- 3. PARTIAL ISSUE ---
        console.log('\n--- [3. PARTIAL ISSUE] ---');
        // Issue 20 items
        const issueRes = await fetchJson(`${BASE_URL}/indents/issue`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                indentId: indentId,
                items: [{ itemId: context.itemId, issuedQty: 20 }]
            })
        });
        console.log(`✅ Indent Issued: Partial 20`);

        // Verify Status
        const indentCheck = await Indent.findById(indentId);
        if (indentCheck?.status !== 'PARTIALLY_ISSUED') {
            throw new Error(`Expected PARTIALLY_ISSUED, got ${indentCheck?.status}`);
        }
        console.log(`✅ Indent Status Verified: ${indentCheck.status}`);

        // DEBUG: Check IndentItem in DB
        const { IndentItem } = await import('../models');
        const dbItems = await IndentItem.find({ indentId: indentId });
        console.log('DEBUG DB Items:', JSON.stringify(dbItems, null, 2));


        // --- 4. PROCUREMENT POOL ---
        console.log('\n--- [4. CHECK POOL] ---');
        const poolRes = await fetchJson(`${BASE_URL}/indents/procurement-pool`, { headers });
        console.log('DEBUG POOL RES:', JSON.stringify(poolRes.data.debug, null, 2));

        const poolItems = poolRes.data.items || poolRes.data; // Handle both structures
        const myItem = poolItems.find((i: any) => {
            const populatedIndent = i.indentId;
            // Check string directly or object property
            const iId = (typeof populatedIndent === 'string') ? populatedIndent : (populatedIndent.indentId || populatedIndent._id || populatedIndent.id);
            return iId === indentId;
        });

        if (!myItem) throw new Error('Indent Item not found in procurement pool');
        if (myItem.pendingQty !== 30) throw new Error(`Expected Pending 30, got ${myItem.pendingQty}`);
        console.log(`✅ Pool Verified: Item found with pending qty 30`);

        context.indentItemId = myItem._id || myItem.indentItemId;


        // --- 5. CREATE DRAFT PO ---
        console.log('\n--- [5. CREATE DRAFT PO] ---');
        const poRes = await fetchJson(`${BASE_URL}/purchase-orders/from-pool`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                vendorId: context.vendorId,
                indentItemIds: [context.indentItemId]
            })
        });
        const po = poRes.data;
        console.log(`✅ PO Created: ${po._id || po.poId} Status: ${po.status}`);

        if (po.status !== 'DRAFT') throw new Error(`Expected PO Status DRAFT, got ${po.status}`);
        if (Math.abs(po.totalAmount - (30 * 50 * 1.05)) > 0.1) {
            // 30 qty * 50 cost * 1.05 tax
            console.warn(`⚠️ Warning: Total Amount mismatch? Expected ${30 * 50 * 1.05}, got ${po.totalAmount}`);
        }


        console.log('\n✨✨ PROCUREMENT FLOW TEST COMPLETED SUCCESSFULLY ✨✨');

    } catch (error: any) {
        console.error('\n❌ TEST FAILED');
        console.error('Error:', error.message || error);
        if (error.data) console.error('Details:', JSON.stringify(error.data, null, 2));
        process.exit(1);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

runProcurementTest();
