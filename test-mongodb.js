
const dns = require("node:dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const { MongoClient } = require("mongodb");

async function test() {
  try {
    const uri = process.env.MONGODB_URI;

    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();

    console.log("SUCCESS: MongoDB connected!");

    await client.db("admin").command({ ping: 1 });

    console.log("MongoDB ping successful!");

    await client.close();
  } catch (error) {
    console.error("MongoDB error:", error);
  }
}

test();
