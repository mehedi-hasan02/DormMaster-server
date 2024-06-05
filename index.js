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
    const upcomingMealCollection = client.db('dormMasterDB').collection('upcomingMeals');
    const requestMealCollection = client.db('dormMasterDB').collection('requestMeals');
    const reviewCollection = client.db('dormMasterDB').collection('reviews');
    const userCollection = client.db('dormMasterDB').collection('users');

    //meal related api

    app.post('/meal', async (req, res) => {
      const item = req.body;
      const result = await mealCollection.insertOne(item);
      res.send(result);
    });

    app.get('/meal', async (req, res) => {
      const result = await mealCollection.find().toArray();
      res.send(result);
    });

    app.get('/meal/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await mealCollection.findOne(query);
      res.send(result);
    });

    app.patch('/meal/:id', async (req, res) => {
      const item = req.body;
      console.log(item);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          title: item.title,
          category: item.category,
          image: item.image,
          price: item.price,
          ingredients: item.ingredients,
          rating: item.rating,
          like: item.like,
          description: item.description
        }
      }

      const result = await mealCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //review related api
    app.post('/review', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    app.get('/review/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { mealId: id };
      const result = await reviewCollection.find(filter).toArray();
      res.send(result);
    });

    //upcoming meal related api
    app.post('/upcomingMeal', async (req, res) => {
      const item = req.body;
      const result = await upcomingMealCollection.insertOne(item);
      res.send(result);
    });

    app.get('/upcomingMeal', async (req, res) => {
      const result = await upcomingMealCollection.find().toArray();
      res.send(result);
    });

    //meal request related api
    app.post('/mealRequest', async (req, res) => {
      const item = req.body;
      const result = await requestMealCollection.insertOne(item);
      res.send(result);
    });

    app.get('/mealRequest', async (req, res) => {
      const result = await requestMealCollection.find().toArray();
      res.send(result);
    });

    app.patch('/mealRequest/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: data.status
        }
      }

      const result = await requestMealCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    //user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exit', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          role: 'admin',
        }
      }

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete('/users/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};

      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Check your meal')
})

app.listen(port, () => {
  console.log('Port id running on', port);
})