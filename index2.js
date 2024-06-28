const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { default: axios } = require("axios");

const main = async () => {
  const BASE_URL = "";
  const API_KEY = "";
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
        dataProject,
      };

      let projectCreated = await axios(configProject);

      //////////////
      let dataProjectFetched = JSON.stringify({
        dataSource: "TEST-1",
        database: "test",
        collection: "projects",
        filter: { _id: { $oid: projectCreated.insertedId } },
      });

      let configProjectFetched = {
        method: "post",
        url: `${BASE_URL}/action/findOne`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          apiKey: API_KEY,
        },
        dataProjectFetched,
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
        dataUserUpdated,
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
        dataUser,
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
        dataProject,
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
        dataProjectDeleted,
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
        dataUserUpdate,
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
        dataUser,
      };

      let userResponse = await axios(configUser);

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
        dataProjects,
      };

      const projectsResponse = axios(configProjects);

      const projects = projectsResponse.data.document;

      user.projects = projects;

      res.status(200).json(user);
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
        dataEvents,
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

  app.use("/", router);

  app.listen(port, () => {
    console.log(`Server Started at ${port}`);
  });
};

main();
