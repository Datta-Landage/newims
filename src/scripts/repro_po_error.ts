
import mongoose from 'mongoose';
import { Config } from '../config';
import { Tenant, Branch } from '../models';

const BASE_URL = 'http://localhost:3000/api/v1';

async function run() {
    // 0. Get Tenant & Branch 
    await mongoose.connect(Config.MONGODB_URI);
    const tenant = await Tenant.findOne();
    const branch = await Branch.findOne({ tenantId: tenant?._id });

    if (!tenant || !branch) {
        console.error('No tenant or branch found');
        return;
    }
    const realTenantId = tenant._id.toString();
    const realBranchId = branch._id.toString();

    console.log('Using Tenant:', realTenantId, 'Branch:', realBranchId);
    await mongoose.disconnect();

    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@paltribe.com',
            password: 'password123',
            tenantId: realTenantId
        })
    });

    const loginData = await loginRes.json();
    if (loginData.status !== 'success') {
        console.error('Login Failed:', loginData);
        return;
    }

    const token = loginData.data.accessToken;

    // 2. Create PO
    console.log('Creating PO...');
    const poRes = await fetch(`${BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-branch-id': realBranchId
        },
        body: JSON.stringify({
            vendorId: "696b78952d174168bc372b4c",
            deliveryDate: "2024-12-31T00:00:00.000Z",
            items: [
                {
                    itemId: "696b7f6b2d174168bc372c06",
                    quantity: 20,
                    unitCost: 100,
                    taxRate: 5
                }
            ]
        })
    });

    const poData = await poRes.json();
    console.log('PO Create Response:', JSON.stringify(poData, null, 2));
}

run();
