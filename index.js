const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()
app = express();

// middleware

app.use(express.json())
app.use(cors())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dtrhla5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const productsCollection = client.db('productsDB').collection('products');

        // all product 
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await productsCollection.find()
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send(result);
        })

        // top 6 items 
        app.get('/top-items', async (req, res) => {
            const cursor = productsCollection.find().sort({ strBuyCount: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result)
        })

        // pagination 
        app.get('/productsCount', async (req, res) => {
            const count = await productsCollection.estimatedDocumentCount();
            res.send({ count });
        })

        // search by name 
        app.get('/search-product', async (req, res) => {
            const { name } = req.query;
            const searchedFoods = await productsCollection.find({ strMeal: { $regex: new RegExp(name, 'i') } }).toArray();
            if (searchedFoods.length === 0) {

                return res.status(404).send({ message: `${name} is not available right now` });
            }
            res.send(searchedFoods);

        });

        // single product 
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send(`Wind delivery is running`)
})
app.listen(port, () => {
    console.log('wind delivery is running', port)
})