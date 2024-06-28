const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { default: axios } = require("axios");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      "mongodb+srv://kanishkchhabra23:buWhWbm1MRktFauy@test-1.oapsky5.mongodb.net/?retryWrites=true&w=majority&appName=TEST-1",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
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
      type: String,
    },
    email: {
      required: true,
      type: String,
    },
    phone: {
      required: true,
      type: String,
    },
    country: {
      required: true,
      type: String,
    },
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
    },
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
      country: req.body.country,
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
        trigger: [],
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
  router.get("/getProjectsByUser", async (req, res) => {
    const { walletAddress } = req.query;

    console.log("Inside Get Projects By User: ", walletAddress);

    try {
      const user = await User.findOne({ walletAddress }).populate("projects");
      console.log(user);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(user.projects);

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

  router.get("/getProjectDetails", async (req, res) => {
    const { projectId, apiKey } = req.query;

    try {
        const pageViewData = await Event.find({ apiKey, event: "page_view" });
        const sessionData = await Event.find({ apiKey, event: "session_end" });
        const heatMapData = await Event.find({ apiKey, event: "heat_map" });
        const errorTrackData = await Event.find({ apiKey, event: "error_track" });
        const performanceData = await Event.find({ apiKey, event: "performance_track" });

        const totalPageViews = pageViewData.length;
        const uniquePageViews = new Set(pageViewData.map(view => view.userId)).size;

        const urlPageViewCounts = {};
        const urlUserCounts = {};
        pageViewData.forEach(view => {
            const url = view.data.url;
            const userId = view.userId;
            if (urlPageViewCounts[url]) {
                urlPageViewCounts[url].views++;
                urlUserCounts[url].add(userId);
            } else {
                urlPageViewCounts[url] = { views: 1, uniqueViews: 0 };
                urlUserCounts[url] = new Set([userId]);
            }
        });

        for (const url in urlUserCounts) {
            urlPageViewCounts[url].uniqueViews = urlUserCounts[url].size;
        }

        const urlPageViewArray = Object.entries(urlPageViewCounts).map(([link, data]) => ({
            link,
            views: data.views,
            uniqueViews: data.uniqueViews
        }));

        const pageViewsPerDayCounts = {};
        pageViewData.forEach(view => {
            const date = new Date(view.date).toISOString().split('T')[0];
            if (pageViewsPerDayCounts[date]) {
                pageViewsPerDayCounts[date]++;
            } else {
                pageViewsPerDayCounts[date] = 1;
            }
        });

        const pageViewsPerDay = Object.entries(pageViewsPerDayCounts)
            .map(([date, views]) => ({ date, views }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const averagePageViewsPerUser = totalPageViews / uniquePageViews;

        const mostViewedPages = urlPageViewArray.sort((a, b) => b.views - a.views);

        const userPageViewCounts = {};
        pageViewData.forEach(view => {
            const userId = view.userId;
            if (userPageViewCounts[userId]) {
                userPageViewCounts[userId]++;
            } else {
                userPageViewCounts[userId] = 1;
            }
        });

        const uniqueUsers = Object.entries(userPageViewCounts).map(([userId, count]) => ({ userId, count }));

        const now = new Date();
        const oneDayAgo = new Date(now);
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let totalPageStayDuration = 0;
        let last24HoursPageStayDuration = 0;
        let last7DaysPageStayDuration = 0;

        sessionData.forEach(session => {
            const duration = session.data.duration || 0;
            totalPageStayDuration += duration;

            const sessionDate = new Date(session.date);
            if (sessionDate >= oneDayAgo) {
                last24HoursPageStayDuration += duration;
            }
            if (sessionDate >= sevenDaysAgo) {
                last7DaysPageStayDuration += duration;
            }
        });

        const averageStayDurationPerUser = totalPageStayDuration / uniquePageViews;

        const userSessionDurations = {};
        sessionData.forEach(session => {
            const userId = session.userId;
            const duration = session.data.duration || 0;
            if (userSessionDurations[userId]) {
                userSessionDurations[userId] += duration;
            } else {
                userSessionDurations[userId] = duration;
            }
        });

        uniqueUsers.forEach(user => {
            const userId = user.userId;
            user.stayDuration = userSessionDurations[userId] || 0;

            const userPageViewsLast24Hours = pageViewData.filter(view => 
                view.userId === userId && new Date(view.date) >= oneDayAgo
            ).length;

            const userPageViewsLast7Days = pageViewData.filter(view => 
                view.userId === userId && new Date(view.date) >= sevenDaysAgo
            ).length;

            user.pageViewsLast24Hours = userPageViewsLast24Hours;
            user.pageViewsLast7Days = userPageViewsLast7Days;
        });

        const sessionDataPerDayCounts = {};
        sessionData.forEach(session => {
            const date = new Date(session.date).toISOString().split('T')[0];
            if (sessionDataPerDayCounts[date]) {
                sessionDataPerDayCounts[date] += session.data.duration || 0;
            } else {
                sessionDataPerDayCounts[date] = session.data.duration || 0;
            }
        });

        const sessionDataPerDay = Object.entries(sessionDataPerDayCounts)
            .map(([date, duration]) => ({ date, duration }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        let totalClicks = [];
        let totalScrolls = [];
        heatMapData.forEach(heatMap => {
            totalClicks = totalClicks.concat(heatMap.data.clicks || []);
            totalScrolls = totalScrolls.concat(heatMap.data.scrolls || []);
        });

        const totalInteractions = { clicks: totalClicks, scrolls: totalScrolls };

        const userInteractions = {};
        heatMapData.forEach(heatMap => {
            const userId = heatMap.userId;
            const clicks = heatMap.data.clicks || [];
            const scrolls = heatMap.data.scrolls || [];

            if (!userInteractions[userId]) {
                userInteractions[userId] = { clicks: [], scrolls: [] };
            }

            userInteractions[userId].clicks = userInteractions[userId].clicks.concat(clicks);
            userInteractions[userId].scrolls = userInteractions[userId].scrolls.concat(scrolls);
        });

        uniqueUsers.forEach(user => {
            const userId = user.userId;
            user.clicks = userInteractions[userId]?.clicks || [];
            user.scrolls = userInteractions[userId]?.scrolls || [];
        });

        const userErrorCounts = {};
        errorTrackData.forEach(error => {
            const userId = error.userId;
            if (userErrorCounts[userId]) {
                userErrorCounts[userId]++;
            } else {
                userErrorCounts[userId] = 1;
            }
        });

        uniqueUsers.forEach(user => {
            const userId = user.userId;
            user.errors = userErrorCounts[userId] || 0;
        });

        const errorsFacedByUser = errorTrackData.length;

        // Performance data analysis
        let totalLoadTime = 0;
        let loadTimes = [];
        const screenWidthCounts = {};

        performanceData.forEach(perf => {
            const loadTime = perf.data.performance.firstContentfulPaint || 0;
            const screenWidth = perf.data.performance.width || 0;

            loadTimes.push(loadTime);
            totalLoadTime += loadTime;

            if (screenWidthCounts[screenWidth]) {
                screenWidthCounts[screenWidth]++;
            } else {
                screenWidthCounts[screenWidth] = 1;
            }
        });

        const fastestLoadTime = Math.min(...loadTimes);
        const slowestLoadTime = Math.max(...loadTimes);
        const averageLoadTime = totalLoadTime / loadTimes.length;

        const screenWidthArray = Object.entries(screenWidthCounts).map(([width, count]) => ({
            width: parseInt(width),
            count
        }));

        const userLoadTimes = {};
        const userScreenWidths = {};

        performanceData.forEach(perf => {
            const userId = perf.userId;
            const loadTime = perf.data.performance.firstContentfulPaint || 0;
            const screenWidth = perf.data.performance.width || 0;

            if (!userLoadTimes[userId]) {
                userLoadTimes[userId] = [];
            }
            if (!userScreenWidths[userId]) {
                userScreenWidths[userId] = [];
            }

            userLoadTimes[userId].push(loadTime);
            userScreenWidths[userId].push(screenWidth);
        });

        uniqueUsers.forEach(user => {
            const userId = user.userId;
            const userTimes = userLoadTimes[userId] || [];
            const userWidths = userScreenWidths[userId] || [];

            const userFastestLoadTime = Math.min(...userTimes);
            const userSlowestLoadTime = Math.max(...userTimes);
            const userAverageLoadTime = userTimes.reduce((sum, time) => sum + time, 0) / userTimes.length;
            const userAverageScreenWidth = userWidths.reduce((sum, width) => sum + width, 0) / userWidths.length;

            user.fastestLoadTime = userFastestLoadTime;
            user.slowestLoadTime = userSlowestLoadTime;
            user.averageLoadTime = userAverageLoadTime;
            user.averageScreenWidth = userAverageScreenWidth;
            user.screenWidths = userWidths;
        });

        res.status(200).json({ 
            totalPageViews, 
            uniquePageViews, 
            urlPageViewCounts: urlPageViewArray,
            pageViewsPerDay,
            averagePageViewsPerUser,
            mostViewedPages,
            uniqueUsers,
            totalPageStayDuration,
            last24HoursPageStayDuration,
            last7DaysPageStayDuration,
            averageStayDurationPerUser,
            sessionDataPerDay,
            totalInteractions,
            pageViewData, 
            sessionData, 
            heatMapData, 
            errorTrackData,
            errorsFacedByUser,
            performanceData,
            fastestLoadTime,
            slowestLoadTime,
            averageLoadTime,
            screenWidthArray
        });
    } catch(e) {
        res.status(500).json({ message: e.message });
    }
  });

  app.use("/", router);

  app.listen(port, () => {
    console.log(`Server Started at ${port}`);
  });
};

main();
