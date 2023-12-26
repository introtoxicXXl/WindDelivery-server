const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
app = express();

// middleware
app.use(cookieParser());
app.use(express.json())
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send('Unamortized Access')
        }
        req.user = decoded;
        next();
    })
}


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
        const cartsCollection = client.db('cartsDB').collection('carts');
        const usersCollection = client.db('usersDB').collection('users');


        // jwt 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true })
        })


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

        // add food 
        app.post('/products', async(req, res) => {
            const food = req.body;
            const result = await productsCollection.insertOne(food);
            res.send(result)
        })
        app.post('/products2', async(req, res) => {
            const food = req.body;
            const result = await cartsCollection.insertOne(food);
            res.send(result)
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
               // update product
               app.put('/product/:id', async (req, res) => {
                const id = req.params.id;
                const product = req.body;
                const filter = { _id: new ObjectId(id) }
                const options = { upsert: true }
                const updateProduct = {
                    $set: {
                        strMeal: product.strMeal,
                        strMealThumb: product.strMealThumb,
                        strPrice: product.strPrice,
                        email: product.email,
                        strCategory: product.strCategory,
                        strArea: product.strArea,
                        idMeal: product.idMeal,
                        strInstructions: product.strInstructions
                    }
                }
                const result = await productsCollection.updateOne(filter, updateProduct, options)
                res.send(result)
            })
               app.put('/product2/:id', async (req, res) => {
                const id = req.params.id;
                const product = req.body;
                const filter = { _id: new ObjectId(id) }
                const options = { upsert: true }
                const updateProduct = {
                    $set: {
                        strMeal: product.strMeal,
                        strMealThumb: product.strMealThumb,
                        strPrice: product.strPrice,
                        email: product.email,
                        strCategory: product.strCategory,
                        strArea: product.strArea,
                        idMeal: product.idMeal,
                        strInstructions: product.strInstructions
                    }
                }
                const result = await cartsCollection.updateOne(filter, updateProduct, options)
                res.send(result)
            })

        // single product 
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result)
        })

        app.get('/products/cart', async (req, res) => {
            const ids = req.query.ids;
            const idsArray = ids.split(',');
            const objectIds = idsArray.map(id => new ObjectId(id));
            const query = { _id: { $in: objectIds } };
            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        // users 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const existingUser = await usersCollection.findOne({ email: user.email });
            if (!existingUser) {
                const result = await usersCollection.insertOne(user);
                res.send(result);
            }
        })

        // add product by user email 
        app.post('/addCart', async (req, res) => {
            const products = req.body;
            for (const product of products) {
                const existingProduct = await cartsCollection.findOne({ _id: product._id });

                if (existingProduct) {
                    const result = await cartsCollection.updateOne({ _id: product._id }, { $inc: { quantity: product.quantity } });
                    res.send(result)
                } else {
                    const result = await cartsCollection.insertOne(product);
                    res.send(result)
                }
            }
        })

        // orders 
        app.get('/orders', verifyToken, async (req, res) => {
            if (req.user.email !== req.query.email) {
                res.status(403).send({ message: 'Forbidden Access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        })
        // logout 
        app.post('/logout', async (req, res) => {
            const user = req.body;
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })

        })



        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await cartsCollection.deleteOne(query);
            res.send(result);
        })
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await productsCollection.deleteOne(query);
            res.send(result);
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