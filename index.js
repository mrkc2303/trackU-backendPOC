const mongoose = require('mongoose');
const express = require('express');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect("", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`Mongo db connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

const userSchema = new mongoose.Schema({
    walletAddress: {
        required: true,
        type: String,
        unique: true
    },
    projects: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
        default: []
    }
}, {
    timestamps: true
});

const projectSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerWallet: {
        type: String,
        required: true,
        unique: true
    },
    trigger: {
        type: Array,
        default: []
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);

const main = async () => {
    await connectDB();

    const app = express();
    const port = 5050;

    app.use(express.json());

    const router = express.Router();

    router.post('/registerUser', async (req, res) => {
        const data = new User({
            walletAddress: req.body.walletAddress,
        });

        try {
            const dataToSave = await data.save();
            res.status(200).json(dataToSave);
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

    router.get('/checkUser', async (req, res) => {
        const { walletAddress } = req.query;
        try {
            const user = await User.findOne({ walletAddress: walletAddress });
            if (user) {
                res.status(200).json(user);
            } else {
                res.status(404).json({ message: "User not found" });
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    router.post('/addProject', async (req, res) => {
        const { walletAddress } = req.body;

        try {
            const user = await User.findOne({ walletAddress: walletAddress });
            if (!user) {
                return res.status(404).json({ message: "Owner not registered" });
            }

            const project = new Project({
                owner: user._id,
                ownerWallet: walletAddress
                // trigger: trigger
            });

            const savedProject = await project.save();

            user.projects.push(savedProject._id);
            await user.save();

            res.status(200).json(savedProject);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

    router.delete('/deleteProject', async (req, res) => {
        const { walletAddress, projectId } = req.body;

        try {
            const user = await User.findOne({ walletAddress: walletAddress });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: "Project not found" });
            }

            if (project.owner.toString() !== user._id.toString()) {
                return res.status(403).json({ message: "User is not the owner of the project" });
            }

            await Project.findByIdAndDelete(projectId);

            user.projects = user.projects.filter(id => id.toString() !== projectId);
            await user.save();

            res.status(200).json({ message: "Project deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    app.use('/', router);

    app.listen(port, () => {
        console.log(`Server Started at ${port}`);
    });
};

main();
