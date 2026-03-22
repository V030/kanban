import expressPkg from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js"; 
import protectedRoutes from "./routes/protectedRoutes.js"; 

dotenv.config();

const express = expressPkg;
const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api/protected", protectedRoutes);

app.get("/", (req, res) => {
//   res.send("API running");
  res.redirect("http://localhost:5000/login");
});

// app.get("/api/myname", (req, res) => {
//   res.json({
//       name: "Vee",
//       age: 1,
//       Loc: "Ket saan"
//     }
//   );
// });

// app.get("/api/multiply/:num1/:num2", (req, res) => {
//   // Get num1 and num2 from params
//   // Multiply them
//   // Return result
//   const digit1 = Number(req.params.num1);
//   const digit2 = Number(req.params.num2);

//   const total = digit1 * digit2;

//   res.json({
//     "total": total
//   });
// });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
