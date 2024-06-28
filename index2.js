const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { default: axios } = require("axios");

const main = async () => {
  const BASE_URL = "https://ap-south-1.aws.data.mongodb-api.com/app/data-zpawudj/endpoint/data/v1";
  const API_KEY = "CGZhyqhav7fV563WKHepfZziJTEKbXvwws8WLgPasK3Gk0IDeUMzwrmFkgyhvdfl";
  const app = express();
  const port = 5050;

  app.use(cors());

  app.use(express.json());

  const router = express.Router();

  router.post("/registerUser", async (req, res) => {
    try {
      let data = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "users",
        document: {
          walletAddress: req.body.walletAddress,
          apiKey: uuidv4(),
          email: req.body.email,
          phone: req.body.phone,
          country: req.body.country,
        },
      });

      let config = {
        method: "post",
        url: `${BASE_URL}/action/insertOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data,
      };

      let createdUser = await axios(config);
      res.status(200).json(createdUser.data);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.get("/checkUser", async (req, res) => {
    const { walletAddress } = req.query;
    try {
      let data = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "users",
        filter: { walletAddress: walletAddress },
      });

      let config = {
        method: "post",
        url: `${BASE_URL}/action/findOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data,
      };

      let foundUser = await axios(config);

      if (foundUser) {
        res.status(200).json(foundUser.data.document);
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
      let data = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "users",
        filter: { walletAddress: walletAddress },
      });

      let config = {
        method: "post",
        url: `${BASE_URL}/action/findOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data,
      };

      let user = await axios(config);
      if (!user) {
        return res.status(404).json({ message: "Owner not registered" });
      }
      console.log("Inside Add Project - User Found: ", user.data.document);

      let dataProject = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "projects",
        document: {
          owner: user.data.document._id,
          walletAddress: walletAddress,
          projectName: projectName,
          estimatedUsers: estimatedUsers,
          trigger: [],
        },
      });

      let configProject = {
        method: "post",
        url: `${BASE_URL}/action/insertOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataProject,
      };

      let projectCreated = await axios(configProject);

      console.log("DATAA", projectCreated);

      //////////////
      let dataProjectFetched = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "projects",
        filter: { _id: { $oid: projectCreated.data.insertedId } },
      });

      let configProjectFetched = {
        method: "post",
        url: `${BASE_URL}/action/findOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataProjectFetched,
      };
      let projectFetched = await axios(configProjectFetched);
      ///////////////
      console.log(
        "Inside Add Project - Project to Save: ",
        projectFetched.data.document
      );

      let dataUserUpdated = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "users",
        filter: { walletAddress: walletAddress },
        update: { $push: { projects: projectFetched.data.document._id } },
      });

      let configUserUpdated = {
        method: "post",
        url: `${BASE_URL}/action/updateOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataUserUpdated,
      };

      let userUpdated = await axios(configUserUpdated);

      res.status(200).json(projectFetched.data.document);
    } catch (error) {
      console.error("Error inside Add Project:", error);
      res.status(400).json({ message: error.message });
    }
  });

  router.delete("/deleteProject", async (req, res) => {
    const { walletAddress, projectId } = req.body;

    try {
      let dataUser = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "users",
        filter: { walletAddress: walletAddress },
      });

      let configUser = {
        method: "post",
        url: `${BASE_URL}/action/findOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataUser,
      };

      let dataProject = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "projects",
        filter: { _id: { $oid: projectId } },
      });

      let configProject = {
        method: "post",
        url: `${BASE_URL}/action/findOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataProject,
      };
      let user = await axios(configUser);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let project = await axios(configProject);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (
        project.data.document.owner.toString() !==
        user.data.document._id.toString()
      ) {
        return res
          .status(403)
          .json({ message: "User is not the owner of the project" });
      }

      let dataProjectDeleted = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "projects",
        filter: { _id: { $oid: projectId } },
      });

      let configProjectDeleted = {
        method: "post",
        url: `${BASE_URL}/action/deleteOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataProjectDeleted,
      };

      let deletedProject = await axios(configProjectDeleted);

      const filteredProjects = user.data.document.projects.filter(
        (id) => id.toString() !== projectId
      );

      let dataUserUpdate = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "users",
        filter: { walletAddress: walletAddress },
        update: {
          $set: {
            projects: filteredProjects,
          },
        },
      });

      let configUserUpdate = {
        method: "post",
        url: `${BASE_URL}/action/updateOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataUserUpdate,
      };

      let updatedUser = await axios(configUserUpdate);

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
      let dataUser = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "users",
        filter: { walletAddress: walletAddress },
      });

      let configUser = {
        method: "post",
        url: `${BASE_URL}/action/findOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataUser,
      };

      let userResponse = await axios(configUser);

      // console.log(userResponse.data)

      const user = userResponse.data.document;

      if (!user) {
        console.log("User not found");
        return;
      }

      const projectIds = user.projects.map((projectId) => ({
        _id: { $oid: projectId },
      }));

      let dataProjects = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "projects",
        filter: { $or: projectIds },
      });

      let configProjects = {
        method: "post",
        url: `${BASE_URL}/action/find`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataProjects,
      };

      const projectsResponse = await axios(configProjects);

      const projects = projectsResponse.data.documents;

      // console.log(projects)

      user.projects = projects;

      res.status(200).json(projects);
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
      let dataEvents = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "events",
        document: {
          apiKey: token,
          userId,
          event,
          data,
          date,
        },
      });

      let configEvents = {
        method: "post",
        url: `${BASE_URL}/action/insertOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data: dataEvents,
      };

      const eventsResponse = axios(configEvents);

      res.status(200).json(eventsResponse.data.document);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // dummy mongodb api
  router.get("/", async (req, res) => {
    console.log("hello");
    // res.send("hello world");
    try {
      //////////////////
      let data = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "users",
        // filter: { walletAddress: "0xDaD9D7C2f8395E0A0036526F46Cf2ba03BEA7a11" },
        filter: { _id: { $oid: "667ce4747d67ce4bdb429fe8" } },
      });

      let config = {
        method: "post",
        url: `${BASE_URL}/action/findOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data,
      };

      let foundUser = await axios(config);
      //////////////////
      // let dataProjectFetched = JSON.stringify({
      //   dataSource: "TEST-1",
      //   database: "test",
      //   collection: "users",
      //   // filter: { _id: { $oid: "667c6532111255574b2d6c10" } },
      //   filter: {
      //     walletAddress: "0xDaD9D7C2f8395E0A0036526F46Cf2ba03BEA7a11",
      //   },
      // });

      // let configProjectFetched = {
      //   method: "post",
      //   url: `${BASE_URL}/action/findOne`,
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Access-Control-Request-Headers": "*",
      //     apiKey: API_KEY,
      //   },
      //   dataProjectFetched,
      // };
      // let projectFetched = await axios(configProjectFetched);
      // console.log(projectFetched);
      res.json(foundUser.data.document);
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message });
    }
  });

  const fetchData = async (filter) => {
    try {
      // console.log(filter);
      let data = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "events",
        filter: filter,
      });

      let config = {
        method: "post",
        url: `${BASE_URL}/action/find`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        data,
      };

      let response = await axios(config);
      // console.log(response.data);

      return response.data.documents;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  };

  router.get("/getProjectDetails", async (req, res) => {
    try {
      const [
        pageViewData,
        sessionData,
        heatMapData,
        errorTrackData,
        performanceData,
      ] = await Promise.all([
        fetchData({ event: "page_view" }),
        fetchData({ event: "session_end" }),
        fetchData({ event: "heat_map" }),
        fetchData({ event: "error_track" }),
        fetchData({ event: "performance_track" }),
      ]);

      // console.log(
      //   pageViewData,
      //   sessionData,
      //   heatMapData,
      //   errorTrackData,
      //   performanceData
      // );

      const totalPageViews = pageViewData.length;
      const uniquePageViews = new Set(pageViewData.map((view) => view.userId))
        .size;

      const urlPageViewCounts = {};
      const urlUserCounts = {};
      pageViewData.forEach((view) => {
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

      const urlPageViewArray = Object.entries(urlPageViewCounts).map(
        ([link, data]) => ({
          link,
          views: data.views,
          uniqueViews: data.uniqueViews,
        })
      );

      const pageViewsPerDayCounts = {};
      pageViewData.forEach((view) => {
        const date = new Date(view.date).toISOString().split("T")[0];
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

      const mostViewedPages = urlPageViewArray.sort(
        (a, b) => b.views - a.views
      );

      const userPageViewCounts = {};
      pageViewData.forEach((view) => {
        const userId = view.userId;
        if (userPageViewCounts[userId]) {
          userPageViewCounts[userId]++;
        } else {
          userPageViewCounts[userId] = 1;
        }
      });

      const uniqueUsers = Object.entries(userPageViewCounts).map(
        ([userId, count]) => ({ userId, count })
      );

      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let totalPageStayDuration = 0;
      let last24HoursPageStayDuration = 0;
      let last7DaysPageStayDuration = 0;

      sessionData.forEach((session) => {
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

      const averageStayDurationPerUser =
        totalPageStayDuration / uniquePageViews;

      const userSessionDurations = {};
      sessionData.forEach((session) => {
        const userId = session.userId;
        const duration = session.data.duration || 0;
        if (userSessionDurations[userId]) {
          userSessionDurations[userId] += duration;
        } else {
          userSessionDurations[userId] = duration;
        }
      });

      uniqueUsers.forEach((user) => {
        const userId = user.userId;
        user.stayDuration = userSessionDurations[userId] || 0;

        const userPageViewsLast24Hours = pageViewData.filter(
          (view) => view.userId === userId && new Date(view.date) >= oneDayAgo
        ).length;

        const userPageViewsLast7Days = pageViewData.filter(
          (view) =>
            view.userId === userId && new Date(view.date) >= sevenDaysAgo
        ).length;

        user.pageViewsLast24Hours = userPageViewsLast24Hours;
        user.pageViewsLast7Days = userPageViewsLast7Days;
      });

      const sessionDataPerDayCounts = {};
      sessionData.forEach((session) => {
        const date = new Date(session.date).toISOString().split("T")[0];
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
      heatMapData.forEach((heatMap) => {
        totalClicks = totalClicks.concat(heatMap.data.clicks || []);
        totalScrolls = totalScrolls.concat(heatMap.data.scrolls || []);
      });

      const totalInteractions = { clicks: totalClicks, scrolls: totalScrolls };

      const userInteractions = {};
      heatMapData.forEach((heatMap) => {
        const userId = heatMap.userId;
        const clicks = heatMap.data.clicks || [];
        const scrolls = heatMap.data.scrolls || [];

        if (!userInteractions[userId]) {
          userInteractions[userId] = { clicks: [], scrolls: [] };
        }

        userInteractions[userId].clicks =
          userInteractions[userId].clicks.concat(clicks);
        userInteractions[userId].scrolls =
          userInteractions[userId].scrolls.concat(scrolls);
      });

      uniqueUsers.forEach((user) => {
        const userId = user.userId;
        user.clicks = userInteractions[userId]?.clicks || [];
        user.scrolls = userInteractions[userId]?.scrolls || [];
      });

      const userErrorCounts = {};
      errorTrackData.forEach((error) => {
        const userId = error.userId;
        if (userErrorCounts[userId]) {
          userErrorCounts[userId]++;
        } else {
          userErrorCounts[userId] = 1;
        }
      });

      uniqueUsers.forEach((user) => {
        const userId = user.userId;
        user.errors = userErrorCounts[userId] || 0;
      });

      const errorsFacedByUser = errorTrackData.length;

      // Performance data analysis
      let totalLoadTime = 0;
      let loadTimes = [];
      const screenWidthCounts = {};

      performanceData.forEach((perf) => {
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

      const screenWidthArray = Object.entries(screenWidthCounts).map(
        ([width, count]) => ({
          width: parseInt(width),
          count,
        })
      );

      const userLoadTimes = {};
      const userScreenWidths = {};

      performanceData.forEach((perf) => {
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

      uniqueUsers.forEach((user) => {
        const userId = user.userId;
        const userTimes = userLoadTimes[userId] || [];
        const userWidths = userScreenWidths[userId] || [];

        const userFastestLoadTime = Math.min(...userTimes);
        const userSlowestLoadTime = Math.max(...userTimes);
        const userAverageLoadTime =
          userTimes.reduce((sum, time) => sum + time, 0) / userTimes.length;
        const userAverageScreenWidth =
          userWidths.reduce((sum, width) => sum + width, 0) / userWidths.length;

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
        screenWidthArray,
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  app.use("/", router);

  app.listen(port, () => {
    console.log(`Server Started at ${port}`);
  });
};

main();
