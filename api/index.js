const app = require("../app");

module.exports = app;

module.exports = async(req, res) => {

    try {

        await connectDB();

        return app(req, res);

    } catch (error) {

        console.error("❌ VERCEL SERVER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};