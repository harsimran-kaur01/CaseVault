import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise =
  globalWithMongo._mongoClientPromise ??
  new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  }).connect();

if (process.env.NODE_ENV !== "production") {
  globalWithMongo._mongoClientPromise = clientPromise;
}

export default clientPromise;