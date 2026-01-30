// // db-migrate.js
// import { MongoClient } from "mongodb";

// // --- Configuration ---
// // The full connection URIs (WITHOUT the database name at the end)
// const SOURCE_MONGO_URI =
//   "mongodb+srv://hussaink47:KAvtvWt4eRYdj7RY@cluster0.febh0yn.mongodb.net/";
// const DESTINATION_MONGO_URI =
//   "mongodb+srv://hussaink47:KAvtvWt4eRYdj7RY@cluster0.febh0yn.mongodb.net/";

// // The specific database names to use for the operation
// const SOURCE_DB_NAME = "test";
// const DESTINATION_DB_NAME = "ims";

// // --- NEW: Connection / timeout options (prevents “stuck” connects) ---
// const CLIENT_OPTS = {
//   // Fail fast if SRV/DNS/IP allowlist/auth prevents server selection
//   serverSelectionTimeoutMS: 10_000,
//   // Fail fast on initial socket connect
//   connectTimeoutMS: 10_000,
//   // Avoid infinite socket waits during operations
//   socketTimeoutMS: 60_000,
//   // Keep pool small; this is a one-off migration script
//   maxPoolSize: 5,
// };
// // ---------------------

// /**
//  * Copies all collections and their documents from the source database to the destination database.
//  */
// async function copyCollections() {
//   let sourceClient;
//   let destinationClient;

//   try {
//     console.log("--- Starting MongoDB Copy Process ---");
//     console.log(`Source URI: ${SOURCE_MONGO_URI.substring(0, 60)}...`);
//     console.log(
//       `Destination URI: ${DESTINATION_MONGO_URI.substring(0, 60)}...`
//     );
//     console.log(`Target Source DB: ${SOURCE_DB_NAME}`);
//     console.log(`Target Destination DB: ${DESTINATION_DB_NAME}`);

//     // 1. Connect to both MongoDB instances
//     sourceClient = new MongoClient(SOURCE_MONGO_URI, CLIENT_OPTS);
//     destinationClient = new MongoClient(DESTINATION_MONGO_URI, CLIENT_OPTS);

//     console.log("\nConnecting to SOURCE...");
//     await sourceClient.connect();
//     console.log(`✅ Connected to Source cluster`);

//     console.log("Connecting to DESTINATION...");
//     await destinationClient.connect();
//     console.log(`✅ Connected to Destination cluster`);

//     // Specify the database using the separate DB name variables
//     const sourceDb = sourceClient.db(SOURCE_DB_NAME);
//     const destinationDb = destinationClient.db(DESTINATION_DB_NAME);

//     console.log(`✅ Using Source DB: ${SOURCE_DB_NAME}`);
//     console.log(`✅ Using Destination DB: ${DESTINATION_DB_NAME}`);

//     // Quick ping to confirm connectivity (helps surface auth/IP issues)
//     console.log("\nPinging SOURCE admin...");
//     await sourceDb.admin().command({ ping: 1 });
//     console.log("✅ SOURCE ping ok");

//     console.log("Pinging DESTINATION admin...");
//     await destinationDb.admin().command({ ping: 1 });
//     console.log("✅ DESTINATION ping ok");

//     // --- Drop all existing collections in the destination database ---
//     console.log(
//       `\nStarting cleanup of Destination DB: ${DESTINATION_DB_NAME}...`
//     );

//     const existingDestCollections = await destinationDb
//       .listCollections()
//       .toArray();

//     const destCollectionNames = existingDestCollections
//       .map((c) => c.name)
//       .filter((name) => !name.startsWith("system."));

//     for (const name of destCollectionNames) {
//       try {
//         await destinationDb.collection(name).drop();
//         console.log(`   - Dropped collection: ${name}`);
//       } catch (e) {
//         // If collection disappears between list/drop, ignore
//         console.warn(
//           `   ! Could not drop ${name} (skipping):`,
//           e?.message ?? e
//         );
//       }
//     }

//     if (destCollectionNames.length > 0) {
//       console.log(
//         `Cleanup complete. ${destCollectionNames.length} collections removed from ${DESTINATION_DB_NAME}.`
//       );
//     } else {
//       console.log(
//         `Cleanup complete. Destination DB ${DESTINATION_DB_NAME} was already empty.`
//       );
//     }
//     // -------------------------------------------------------------------------

//     // 2. Get the list of all collections in the source database
//     const collections = await sourceDb.listCollections().toArray();
//     const collectionNames = collections
//       .map((c) => c.name)
//       .filter((name) => !name.startsWith("system."));

//     if (collectionNames.length === 0) {
//       console.log(
//         `No user collections found in Source DB: ${SOURCE_DB_NAME}. Exiting.`
//       );
//       return;
//     }

//     console.log(
//       `\nFound ${
//         collectionNames.length
//       } user collections to copy:\n- ${collectionNames.join("\n- ")}`
//     );
//     console.log("\n--- Starting Collection Copy ---");

//     // 3. Iterate over collections and copy data
//     for (const collectionName of collectionNames) {
//       console.log(`\n==> Copying collection: ${collectionName}`);

//       const sourceCollection = sourceDb.collection(collectionName);
//       const destinationCollection = destinationDb.collection(collectionName);

//       // Fetch all documents from the source collection
//       console.log(`   Fetching docs from source...`);
//       const documents = await sourceCollection.find({}).toArray();
//       console.log(`   Found ${documents.length} docs.`);

//       if (documents.length > 0) {
//         console.log(`   Inserting into destination...`);
//         const result = await destinationCollection.insertMany(documents, {
//           ordered: false,
//         });

//         console.log(
//           `   ✅ Copied ${result.insertedCount} documents to ${collectionName}.`
//         );
//       } else {
//         console.log(`   (empty) Skipping ${collectionName}.`);
//       }
//     }

//     console.log("\n--- MongoDB Copy Complete! ---");
//   } catch (error) {
//     console.error("\n!!! An error occurred during the copy process:");
//     console.error(error);
//     process.exitCode = 1;
//   } finally {
//     // 4. Ensure connections are closed
//     try {
//       if (sourceClient) {
//         await sourceClient.close();
//         console.log("Source client closed.");
//       }
//     } catch (e) {
//       console.warn("Failed to close source client:", e?.message ?? e);
//     }

//     try {
//       if (destinationClient) {
//         await destinationClient.close();
//         console.log("Destination client closed.");
//       }
//     } catch (e) {
//       console.warn("Failed to close destination client:", e?.message ?? e);
//     }
//   }
// }

// // Execute the main function
// copyCollections();
