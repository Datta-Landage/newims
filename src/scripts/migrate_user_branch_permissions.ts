import { connectDB, disconnectDB } from '../config/database';
import { User } from '../models';

/**
 * Migration: Normalize user.branch permissions storage
 *
 * Context:
 * - Previously, branches.permissions was defined as Map<string, boolean>, which
 *   does not allow keys with dots like "BRANCH.CREATE".
 * - Schema has been updated to use a plain object (Mixed) for permissions.
 *
 * This script:
 * - Iterates all users
 * - For each branch in user.branches, if permissions is a Map, convert it to a plain object
 * - Saves the user only if any branch was modified
 */
async function migrateUserBranchPermissions() {
  console.log('🚀 Starting migration: user.branch permissions -> plain object');

  await connectDB();

  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users to inspect`);

    let updatedCount = 0;

    for (const user of users) {
      let modified = false;

      if (Array.isArray((user as any).branches)) {
        (user as any).branches = (user as any).branches.map((b: any) => {
          if (!b) return b;

          // If permissions is a Map, convert to plain object
          if (b.permissions instanceof Map) {
            const obj = Object.fromEntries(b.permissions as Map<string, boolean>);
            b.permissions = obj;
            modified = true;
          }

          return b;
        });
      }

      if (modified) {
        await user.save();
        updatedCount++;
        console.log(`✅ Migrated user ${user._id.toString()} (${user.email})`);
      }
    }

    console.log(`🎉 Migration complete. Users updated: ${updatedCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

migrateUserBranchPermissions();

