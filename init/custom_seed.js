require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URL = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wonderlust";

main()
    .then(() => {
        console.log("Connected to DB");
        initDB();
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    try {
        // Delete old data
        await Listing.deleteMany({});
        await User.deleteMany({ username: { $in: ["demo", "shyam"] } });

        // Create users
        let demoUser = new User({ email: "demo@gmail.com", username: "demo" });
        let registeredDemo = await User.register(demoUser, "demo");
        console.log("Created user: demo (password: demo)");

        let shyamUser = new User({ email: "shyam@gmail.com", username: "shyam" });
        let registeredShyam = await User.register(shyamUser, "shyam");
        console.log("Created user: shyam (password: shyam)");

        // Add owner to every listing
        const allListings = initData.data;
        const demoListings = allListings.slice(0, 10).map((obj) => ({
            ...obj,
            owner: registeredDemo._id,
        }));

        const shyamListings = allListings.slice(10, 20).map((obj) => ({
            ...obj,
            owner: registeredShyam._id,
        }));

        // Insert new data
        await Listing.insertMany([...demoListings, ...shyamListings]);

        console.log("10 listings created for demo, 10 listings created for shyam!");
        mongoose.connection.close();
    } catch (err) {
        console.log(err);
        mongoose.connection.close();
    }
};
