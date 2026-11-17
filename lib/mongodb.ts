
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise: Promise<MongoClient> =
  globalWithMongo._mongoClientPromise ??
  new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  }).connect();

if (process.env.NODE_ENV !== "production") {
  globalWithMongo._mongoClientPromise = clientPromise;
}

export default clientPromise;
