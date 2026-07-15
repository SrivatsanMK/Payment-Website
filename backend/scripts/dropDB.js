const { MongoClient } = require('mongodb');

async function dropDB() {
  const uri = 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('dealer-payment');
    await db.dropDatabase();
    console.log('Dropped dealer-payment database.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

dropDB();
