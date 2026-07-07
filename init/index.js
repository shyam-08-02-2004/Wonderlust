const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderlust";

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

        // Add owner to every listing
        const listings = initData.data.map((obj) => ({
            ...obj,
            owner: "6a490a29b4a08403fd8fdd07",
        }));

        // Insert new data
        await Listing.insertMany(listings);

        console.log("Database initialized successfully!");
        mongoose.connection.close();
    } catch (err) {
        console.log(err);
    }
};