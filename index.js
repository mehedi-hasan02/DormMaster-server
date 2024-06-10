const { MongoClient, ServerApiVersion, ObjectId, serialize } = require('mongodb');
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 8000;

//middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://magenta-semifreddo-dd33c1.netlify.app'
  ]
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fvwg0tw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.token;

//   console.log('Value of the middleware: ', token);

//   if (!token) {
//     return res.status(401).send({ message: 'not authorize' })
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     //error
//     if (err) {
//       console.log(err);
//       return req.status(401).send({ message: 'unauthorize' })
//     }
//     req.user = decoded;
//     next();
//   })

// }

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
  try {
    const mealCollection = client.db('dormMasterDB').collection('meals');
    const upcomingMealCollection = client.db('dormMasterDB').collection('upcomingMeals');
    const requestMealCollection = client.db('dormMasterDB').collection('requestMeals');
    const reviewCollection = client.db('dormMasterDB').collection('reviews');
    const userCollection = client.db('dormMasterDB').collection('users');
    const planCollection = client.db('dormMasterDB').collection('plans');
    const paymentCollection = client.db('dormMasterDB').collection('payments');


    //jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      // console.log('inside verify', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }

      const token = req.headers.authorization.split(' ')[1];
      // console.log("1",token);
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin'

      if (!isAdmin) {
        res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    //meal related api

    app.post('/meal', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await mealCollection.insertOne(item);
      res.send(result);
    });


    app.get('/meal', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      console.log(search);
      const minPrice = req.query.minPrice;
      const maxPrice = req.query.maxPrice;

      let query = {
        title: { $regex: search, $options: 'i' },
      }
      if (filter) query.category = filter

      if (minPrice && maxPrice) {
        query.price = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
      }
      const result = await mealCollection.find(query).toArray();
      res.send(result);
    });

    // app.get('/meal/:email', async (req, res) => {
    //   const adminEmail = req.params.email;
    //   const filter = { adminEmail: adminEmail };
    //   const result = await mealCollection.find(filter).toArray();
    //   res.send(result);
    // });

    app.get('/meal/:id', verifyToken, async (req, res) => {
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
          review: item.review,
          like: item.like,
          description: item.description
        }
      }
      if (item.review) {
        updateDoc.$inc = { review: 1 };
      }

      const result = await mealCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch('/reviewCount/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      let count = { $inc: { review: 1 } };

      const result = await mealCollection.updateOne(filter, count);
      res.send(result);

    });

    app.patch('/likeCount/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      let count = { $inc: { like: 1 } };

      const result = await mealCollection.updateOne(filter, count);
      res.send(result);
    })

    app.delete('/meal/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await mealCollection.deleteOne(filter);
      res.send(result);
    });


    //plan related api
    app.get('/plan', async (req, res) => {
      const result = await planCollection.find().toArray();
      res.send(result);
    });

    app.get('/plan/:name', verifyToken, async (req, res) => {
      const name = req.params.name;
      const filter = { name: name };
      const result = await planCollection.findOne(filter);
      res.send(result);
    })

    //review related api
    app.post('/review', verifyToken, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.patch('/review/:id', verifyToken, async (req, res) => {
      const data = req.body;
      console.log(data);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          review: data.review
        }
      }

      const result = await reviewCollection.updateOne(filter, updateDoc);
      req.send(result);
    })

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

    app.patch('/reviewLike/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { mealId: id };
      console.log(filter);

      let count = { $inc: { like: 1 } };
      const result = await reviewCollection.updateMany(filter, count);
      res.send(result);
    });

    app.patch('/reviewReview/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { mealId: id };

      const count = { $inc: { reviewCount: 1 } };
      const result = await reviewCollection.updateMany(filter, count);
      res.send(result);
    });

    app.delete('/review/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(filter);
      res.send(result);
    });

    //upcoming meal related api
    app.post('/upcomingMeal', async (req, res) => {
      const item = req.body;
      const result = await upcomingMealCollection.insertOne(item);
      res.send(result);
    });

    app.get('/upcomingMeal', async (req, res) => {
      const filter = req.query.filter || {};

      const sortBy = req.query.sortBy || 'like';
      const order = parseInt(req.query.order) || -1;
      const result = await upcomingMealCollection.find(filter).sort({ [sortBy]: order }).toArray();
      // const result = await upcomingMealCollection.find().toArray();
      res.send(result);
    });

    app.get('/upcomingMeal/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await upcomingMealCollection.findOne(filter);
      res.send(result);
    });

    app.patch('/upcomingMealLike/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      let count = { $inc: { like: 1 } };

      const result = await upcomingMealCollection.updateOne(filter, count);
      res.send(result);
    })

    app.delete('/upcomingMeal/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await upcomingMealCollection.deleteOne(filter);
      res.send(result);
    });

    //meal request related api
    app.post('/mealRequest', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await requestMealCollection.insertOne(item);
      res.send(result);
    });

    await requestMealCollection.createIndex({ userName: 1 });
    await requestMealCollection.createIndex({ userEmail: 1 });
    app.get('/mealRequest', async (req, res) => {

      const search = req.query.search;

      let query = {
        $or: [
          { userName: { $regex: search, $options: 'i' } },
          { userEmail: { $regex: search, $options: 'i' } }
        ]
      }
      const result = await requestMealCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/mealRequest/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { userEmail: email };
      const result = await requestMealCollection.find(filter).toArray();
      res.send(result);
    })

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

    app.delete('/mealRequest/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await requestMealCollection.deleteOne(filter);
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

    await userCollection.createIndex({ name: 1 });
    await userCollection.createIndex({ email: 1 });
    app.get('/users', async (req, res) => {

      //search by user name and email
      const search = req.query.search || '';

      let query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }

      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      // let admin = false;

      // if (user) {
      //   admin = user?.role === 'admin'
      // }
      res.send(user);
    });
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      let admin = false;

      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({admin});
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

    app.patch('/users/:email',async(req,res)=>{
      const email = req.params.email;
      const filter = {email: email};
      const {membership} = req.body;
      console.log(membership);

      if(!membership)
        {
          return res.status(400).send({error: 'Membership data is required'});
        }

      const updateDoc = {
        $set: {
          membership: membership
        }
      }

      const result = await userCollection.updateOne(filter,updateDoc);
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });


    //payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      // console.log(price);
      const amount = parseInt(price * 100);
      // console.log(amount, 'amount inside the intend');

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: [
          "card"
        ],
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.post('/payment', async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    app.get('/payment/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await paymentCollection.find(filter).toArray();
      res.send(result);
    })



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