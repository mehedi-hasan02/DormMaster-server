const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 8000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fvwg0tw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  async function run() {
    try {
        const mealCollection = client.db('dormMasterDB').collection('meals');

        //meal related api

        app.post('/meal', async(req,res)=>{
            const item = req.body;
            const result = await mealCollection.insertOne(item);
            res.send(result);
        })

        app.get('/meal', async(req,res)=>{
            const result = await mealCollection.find().toArray();
            res.send(result);
        })
      
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
  }
  run().catch(console.dir);

app.get('/', (req,res)=>{
    res.send('Check your meal')
})

app.listen(port, ()=>{
    console.log('Port id running on', port);
})