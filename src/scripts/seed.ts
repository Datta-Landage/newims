import dns from 'dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB, disconnectDB } from '../config/database';
import {
    Tenant, TenantStatus,
    Role,
    User, UserStatus,
    Branch, BranchStatus
} from '../models';
import { ModuleKey } from '../constants/modules';
import { generateDisplayId } from '../utils/sequence-generator';
import { AuthService } from '../services/auth.service';

const seed = async () => {
    console.log('🌱 Starting Fresh Seed...');
    await connectDB();

    try {
        // 1. Clean Database (Truncate all collections)
        console.log('🧹 Cleaning all existing collections...');
        const collections = await mongoose.connection.db?.collections();
        if (collections) {
            for (const collection of collections) {
                console.log(`   - Clearing: ${collection.collectionName}`);
                await collection.deleteMany({});
            }
        }

        // 2. Create Tenant
        console.log('🏢 Creating Tenant...');
        const generateTenantId = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        const tenantId = generateTenantId();
        const tenant = await Tenant.create({
            _id: tenantId,
            tenantName: 'Hipalz Enterprise',
            status: TenantStatus.ACTIVE,
        });

        // 3. Create Headquarters Branch
        console.log('🏢 Creating Headquarters Branch...');
        const mainBranch = await Branch.create({
            tenantId: tenant._id,
            displayId: await generateDisplayId('BR'),
            branchName: 'Headquarters',
            location: 'Sainikpuri',
            status: BranchStatus.ACTIVE
        });

        // 4. Create Roles
        console.log('👑 Creating Roles...');
        const allModules = Object.values(ModuleKey);

        const saRole = await Role.create({
            roleName: 'Super Admin',
            roleCode: 'SA',
            modules: allModules,
            isSystemRole: true
        });

        // Branch Manager Modules
        const bmModules = [
            ModuleKey.DASHBOARD,
            ModuleKey.USERS,
            ModuleKey.VENDOR_MANAGEMENT,
            ModuleKey.INVENTORY_MASTER,
            ModuleKey.CREATE_PO,
            ModuleKey.PURCHASE_ORDERS,
            ModuleKey.SPECIAL_ORDERS,
            ModuleKey.GRN_RTV,
            ModuleKey.CREATE_INDENT,
            ModuleKey.APPROVE_INDENTS,
            ModuleKey.ISSUE_STOCK,
            ModuleKey.WORK_AREAS,
            ModuleKey.REPORTS
        ];

        const bmRole = await Role.create({
            roleName: 'Branch Manager',
            roleCode: 'BM',
            modules: bmModules,
            isSystemRole: true
        });

        // Purchase Executive Modules
        const peModules = [
            ModuleKey.DASHBOARD,
            ModuleKey.VENDOR_MANAGEMENT,
            ModuleKey.INVENTORY_MASTER,
            ModuleKey.CREATE_PO,
            ModuleKey.PURCHASE_ORDERS,
            ModuleKey.SPECIAL_ORDERS,
            ModuleKey.WORK_AREAS
        ];

        const peRole = await Role.create({
            roleName: 'Purchase Executive',
            roleCode: 'PE',
            modules: peModules
        });

        // Store Manager Modules
        const smModules = [
            ModuleKey.DASHBOARD,
            ModuleKey.INVENTORY_MASTER,
            ModuleKey.PURCHASE_ORDERS,
            ModuleKey.GRN_RTV,
            ModuleKey.APPROVE_INDENTS,
            ModuleKey.ISSUE_STOCK,
            ModuleKey.WORK_AREAS
        ];

        const smRole = await Role.create({
            roleName: 'Store Manager',
            roleCode: 'SM',
            modules: smModules
        });

        // Indent Requester Modules
        const irModules = [
            ModuleKey.DASHBOARD,
            ModuleKey.CREATE_INDENT,
            ModuleKey.INVENTORY_MASTER // View only implied by access
        ];

        const irRole = await Role.create({
            roleName: 'Indent Requester',
            roleCode: 'IR',
            modules: irModules
        });

        // 7. Create Super Admin User
        console.log('👤 Creating Super Admin User...');
        const passwordHash = await AuthService.hashPassword('password123');

        const saUser = await User.create({
            tenantId: tenant._id,
            roleId: saRole._id,
            name: 'Hipalz Admin',
            email: 'admin@hipalz.com',
            passwordHash: passwordHash,
            status: UserStatus.ACTIVE,
            displayId: await generateDisplayId('US'),
            // Link to the Headquarters branch by default
            branchId: mainBranch._id,
            branches: [{
                branchId: mainBranch._id,
                roleId: saRole._id
            }]
        });

        // 8. Create Other Role Users
        console.log('👥 Creating Role-Based Users...');

        // Branch Manager User
        if (bmRole) {
            await User.create({
                tenantId: tenant._id,
                roleId: bmRole._id, // Default Role
                name: 'Branch Manager',
                email: 'bm@hipalz.com',
                passwordHash: passwordHash,
                status: UserStatus.ACTIVE,
                displayId: await generateDisplayId('US'),
                branchId: mainBranch._id, // Default Branch
                branches: [{
                    branchId: mainBranch._id,
                    roleId: bmRole._id
                }]
            });
            console.log('   - Created Branch Manager (bm@hipalz.com)');
        }

        // Purchase Executive User
        if (peRole) {
            await User.create({
                tenantId: tenant._id,
                roleId: peRole._id, // Default Role
                name: 'Purchase Exec',
                email: 'pe@hipalz.com',
                passwordHash: passwordHash,
                status: UserStatus.ACTIVE,
                displayId: await generateDisplayId('US'),
                branchId: mainBranch._id, // Default Branch
                branches: [{
                    branchId: mainBranch._id,
                    roleId: peRole._id
                }]
            });
            console.log('   - Created Purchase Executive (pe@hipalz.com)');
        }

        // Store Manager User
        if (smRole) {
            await User.create({
                tenantId: tenant._id,
                roleId: smRole._id, // Default Role
                name: 'Store Manager',
                email: 'sm@hipalz.com',
                passwordHash: passwordHash,
                status: UserStatus.ACTIVE,
                displayId: await generateDisplayId('US'),
                branchId: mainBranch._id, // Default Branch
                branches: [{
                    branchId: mainBranch._id,
                    roleId: smRole._id
                }]
            });
            console.log('   - Created Store Manager (sm@hipalz.com)');
        }

        // Indent Requester User
        if (irRole) {
            await User.create({
                tenantId: tenant._id,
                roleId: irRole._id, // Default Role
                name: 'Indent Requester',
                email: 'ir@hipalz.com',
                passwordHash: passwordHash,
                status: UserStatus.ACTIVE,
                displayId: await generateDisplayId('US'),
                branchId: mainBranch._id, // Default Branch
                branches: [{
                    branchId: mainBranch._id,
                    roleId: irRole._id
                }]
            });
            console.log('   - Created Indent Requester (ir@hipalz.com)');
        }

        console.log('\n✅ Database Seeded Successfully!');
        console.log('-------------------------------------------');
        console.log('� SYSTEM DETAILS:');
        console.log(`   Tenant ID:      ${tenant._id}`);
        console.log(`   Tenant Name:    ${tenant.tenantName}`);
        console.log('-------------------------------------------');
        console.log('🏢 BRANCH DETAILS:');
        console.log(`   Branch Name:    ${mainBranch.branchName}`);
        console.log(`   Branch ID:      ${mainBranch._id}`);
        console.log('-------------------------------------------');
        console.log('👤 USER DETAILS:');
        console.log(`   Name:           ${saUser.name}`);
        console.log(`   Email:          ${saUser.email}`);
        console.log(`   Password:       password123`);
        console.log(`   Role:           Super Admin`);
        console.log('-------------------------------------------');

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
};

seed();
