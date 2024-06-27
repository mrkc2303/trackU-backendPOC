const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');


const connectDB = async () => {
  try {
    const conn = await mongoose.connect("mongodb+srv://kanishkchhabra23:buWhWbm1MRktFauy@test-1.oapsky5.mongodb.net/?retryWrites=true&w=majority&appName=TEST-1", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Mongo db connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      required: true,
      type: String,
      unique: true,
    },
    projects: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
      default: [],
    },
    apiKey: {
      required: true,
      type: String
    },
    email: {
      required: true,
      type: String
    },
    phone: {
      required: true,
      type: String
    },
    country: {
      required: true,
      type: String
    }
  },
  {
    timestamps: true,
  }
);

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    trigger: {
      type: Array,
      default: [],
    },
    projectName: {
      type: String,
      required: true,
    },
    estimatedUsers: {
      type: String,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

const eventSchema = new mongoose.Schema(
  {
    //company project id
    apiKey: {
      type: String,
    },
    //mongo user id
    userId: {
      type: String,
    },
    event: {
      type: String,
    },
    data: {
      type: Object,
    },
    date: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
const Project = mongoose.model("Project", projectSchema);
const Event = mongoose.model("Event", eventSchema);

const main = async () => {
  await connectDB();

  const app = express();
  const port = 5050;

  app.use(cors());

  app.use(express.json());

  const router = express.Router();

  router.post("/registerUser", async (req, res) => {
    // const apiKey = ;

    const data = new User({
      walletAddress: req.body.walletAddress,
      apiKey: uuidv4(),
      email: req.body.email,
      phone: req.body.phone, 
      country: req.body.country
    });

    try {
      const dataToSave = await data.save();
      res.status(200).json(dataToSave);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.get("/checkUser", async (req, res) => {
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

  router.post("/addProject", async (req, res) => {
    const { walletAddress, projectName, estimatedUsers } = req.body;
  
    try {
      const user = await User.findOne({ walletAddress: walletAddress });
      if (!user) {
        return res.status(404).json({ message: "Owner not registered" });
      }
  
      console.log("Inside Add Project - User Found: ", user);
  
      const project = new Project({
        owner: user._id,
        walletAddress: walletAddress,
        projectName: projectName,
        estimatedUsers: estimatedUsers,
        trigger: []
      });
  
      console.log("Inside Add Project - Project to Save: ", project);
  
      const savedProject = await project.save();
  
      console.log("Inside Add Project - Saved Project: ", savedProject);
  
      user.projects.push(savedProject._id);
      await user.save();
  
      res.status(200).json(savedProject);
    } catch (error) {
      console.error("Error inside Add Project:", error);
      res.status(400).json({ message: error.message });
    }
  });

  router.delete("/deleteProject", async (req, res) => {
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
        return res
          .status(403)
          .json({ message: "User is not the owner of the project" });
      }

      await Project.findByIdAndDelete(projectId);

      user.projects = user.projects.filter((id) => id.toString() !== projectId);
      await user.save();

      res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // New route to get projects by user
  router.get('/getProjectsByUser', async (req, res) => {
    const { walletAddress } = req.query;

    console.log("Inside Get Projects By User: ", walletAddress)

    try {
        const user = await User.findOne({ walletAddress }).populate('projects');
        console.log(user)

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(user.projects)

        res.status(200).json(user.projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
  });

  router.post("/submitEvent", async (req, res) => {
    // extract token api key
    const authHeader = req.headers["authorization"];
    console.log("hitt yes");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7, authHeader.length);
      req.token = token;
    } else {
      req.token = null;
    }

    const { userId, event, data, date } = req.body;
    const token = req.token;
    // check and verify api key from db

    // save all the events in db
    try {
      const eventToSave = new Event({
        apiKey: token,
        userId,
        event,
        data,
        date,
      });
      const savedEvent = await eventToSave.save();
      res.status(200).json(savedEvent);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.get("/", async (req, res) => {
    res.send("Hello world");
  });

  app.use("/", router);

  app.listen(port, () => {
    console.log(`Server Started at ${port}`);
  });
};

main();
