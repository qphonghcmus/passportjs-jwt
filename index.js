const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const morgan = require("morgan");
const connectDB = require("./utils/db");
const errorHandler = require("./middleware/errorHandler");
const asyncHandler = require("./middleware/asyncHandler");
const utils = require("./utils/jwtHelper");

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// logger
app.use(morgan("dev"));

// mongodb config
connectDB();

const passport = require("passport");
const passportJWT = require("passport-jwt");
const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;
const User = require("./model/user.model");
const jwt = require("jsonwebtoken");

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET_OR_KEY,
};

const strategy = new JwtStrategy(opts, async (payload, next) => {
  User.findById(payload.sub)
    .then((user) => {
      if (user) {
        return next(null, user);
      } else {
        return next(null, false);
      }
    })
    .catch((err) => {
      next(err, null);
    });
});

passport.use(strategy);
app.use(passport.initialize());

app.post("/login", (req, res, next) => {
  User.findOne({ username: req.body.username })
    .then((user) => {
      if (!user) {
        res.status(401).json({ success: false, msg: "could not find user" });
      }

      // Function defined at bottom of app.js
      const isValid = utils.validPassword(
        req.body.password,
        user.hash,
        user.salt
      );

      if (isValid) {
        const tokenObject = utils.issueJWT(user);

        res.status(200).json({
          success: true,
          token: tokenObject.token,
          expiresIn: tokenObject.expires,
        });
      } else {
        res
          .status(401)
          .json({ success: false, msg: "you entered the wrong password" });
      }
    })
    .catch((err) => {
      next(err);
    });
});

app.post("/register", (req, res, next) => {
  const saltHash = utils.genPassword(req.body.password);

  const salt = saltHash.salt;
  const hash = saltHash.hash;

  const newUser = new User({
    username: req.body.username,
    hash: hash,
    salt: salt,
  });

  try {
    newUser.save().then((user) => {
      const tokenObj = utils.issueJWT(user);
      res.json({
        success: true,
        user: user,
        token: tokenObj.token,
        expiresIn: tokenObj.expires,
      });
    });
  } catch (err) {
    res.json({ success: false, msg: err });
  }
});

app.get(
  "/protected",
  passport.authenticate("jwt", { session: false }),
  (req, res, next) => {
    res.status(200).json({
      success: true,
      msg: "You are successfully authenticated to this route!",
    });
  }
);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT);
