// 1. IMPORTS
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

// 2. CREATE APP
const app = express();
app.use(express.json());
app.use(cors());

// 3. DB CONNECTION
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "jimyiscutie",
  database: "diet_app"
});

db.connect((err) => {
  if (err) {
    console.log("Connection failed ❌", err);
  } else {
    console.log("Connected to MySQL ✅");
  }
});


// 4. GET ALL FOODS
app.get("/foods", (req, res) => {
  db.query("SELECT * FROM Food", (err, result) => {
    if (err) return res.send(err);
    res.send(result);
  });
});


// 5. ADD USER (FIXED)
app.post("/addUser", (req, res) => {
  const { name, age, weight, height, goal, diet_type, budget, maintenance_calories } = req.body;

  const sql = `
    INSERT INTO Users 
    (name, age, weight, height, goal, diet_type, budget, maintenance_calories)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [name, age, weight, height, goal, diet_type, budget, maintenance_calories], (err, result) => {
    if (err) return res.send(err);
    res.send("User added successfully ✅");
  });
});


// 6. GET USERS
app.get("/users", (req, res) => {
  db.query("SELECT * FROM Users", (err, result) => {
    if (err) return res.send(err);
    res.send(result);
  });
});


// 7. GENERATE DIET (FULLY FIXED)
app.get("/generateDiet/:userId", (req, res) => {
  const userId = req.params.userId;

  db.query("SELECT * FROM Users WHERE user_id = ?", [userId], (err, userResult) => {
    if (err || userResult.length === 0) {
      return res.send("User not found ❌");
    }

    const user = userResult[0];
    const budget = user.budget;

    // 🔥 PROTEIN CALCULATION
    let requiredProtein = 0;

    if (user.goal === "Muscle Gain") {
      requiredProtein = user.weight * 1.5;
    } else if (user.goal === "Fat Loss") {
      requiredProtein = user.weight * 1.2;
    } else {
      requiredProtein = user.weight * 1.0;
    }

    // 🔥 CALORIE TARGET
    let maintenanceCalories = user.maintenance_calories || 2000;
    let targetCalories = maintenanceCalories;

    if (user.goal === "Muscle Gain") {
      targetCalories += 300;
    } else if (user.goal === "Fat Loss") {
      targetCalories -= 300;
    }

    // GET FOOD DATA
 db.query("SELECT * FROM Food WHERE type = ? OR type = 'Veg'", [user.diet_type === 'Non-Veg' ? 'Non-Veg' : 'Veg'], (err, foods) => {
      if (err) return res.send(err);

      let totalCost = 0;
      let totalProtein = 0;
      let totalCalories = 0;
      let selectedFoods = [];

      // 🔥 SORT BY PROTEIN
      foods.sort((a, b) => b.protein - a.protein);

      // 🔥 SMART LOOP
      for (let food of foods) {
        if (user.goal === "Fat Loss" && food.fats > 10) continue;

        if (totalCost + food.cost <= budget) {
          selectedFoods.push({
            name: food.name,
            protein: food.protein,
            calories: food.calories,
            cost: food.cost
          });

          totalCost += food.cost;
          totalProtein += food.protein;
          totalCalories += food.calories;
        }
      }

      // 🔥 DEFICIT CHECK
      let deficit = requiredProtein - totalProtein;
      let suggestions = [];

      if (deficit > 0) {
        suggestions.push("Increase protein intake");

        for (let food of foods) {
          if (food.protein > 10) {
            suggestions.push(`Add ${food.name}`);
            break;
          }
        }
      } else {
        suggestions.push("Protein goal achieved ✅");
      }

      // 🔥 FINAL RESPONSE
      res.send({
        user: user.name,
        goal: user.goal,
        targetCalories: targetCalories,
        totalCalories: totalCalories,
        requiredProtein: requiredProtein,
        totalProtein: totalProtein,
        deficit: deficit > 0 ? deficit : 0,
        diet: selectedFoods,
        totalCost: totalCost,
        suggestions: suggestions
      });
    });
  });
});


// 8. START SERVER (ALWAYS LAST)
app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});