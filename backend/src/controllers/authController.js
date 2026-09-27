import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { cookie, createToken, parseCookies } from '../utils/security.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || 'Lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

function normalizedEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validatePassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 128
  );
}

function sendSession(res, user) {
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
      issuer: "bookestro-api",
      audience: "bookestro-web",
    }
  );

  const csrf = createToken(24);

  res.setHeader("Set-Cookie", [
    cookie("bb_token", token, cookieOptions()),

    cookie("bb_csrf", csrf, {
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.COOKIE_SAMESITE || "Lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }),
  ]);

  return res.json({
    user: publicUser(user),
  });
}

export function csrfToken(req, res) {
  const cookies = parseCookies(
    req.headers.cookie || ""
  );

  let token = cookies.bb_csrf;

  if (!token) {
    token = createToken(24);

    res.append(
      "Set-Cookie",
      cookie("bb_csrf", token, {
        secure:
          process.env.NODE_ENV === "production",
        sameSite:
          process.env.COOKIE_SAMESITE || "Lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
    );
  }

  res.set("Cache-Control", "no-store");

  res.json({
    csrfToken: token,
  });
}

export async function register(req, res) {
  const name = String(
    req.body?.name || ""
  ).trim();

  const email = normalizedEmail(
    req.body?.email
  );

  const password = req.body?.password;

  if (
    !name ||
    !email ||
    !validatePassword(password)
  ) {
    return res.status(400).json({
      message:
        "Name, valid email and a password of at least 8 characters are required.",
    });
  }

  if (name.length > 80 || email.length > 160) {
    return res.status(400).json({
      message:
        "Please keep your name and email within the allowed length.",
    });
  }

  if (await User.findOne({ email }).lean()) {
    return res.status(409).json({
      message:
        "Unable to create the account with these details.",
    });
  }

  const safeRole = [
    "customer",
    "seller",
  ].includes(req.body?.role)
    ? req.body.role
    : "customer";

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(
      password,
      12
    ),
    role: safeRole,
    isActive: true,
  });

  return sendSession(
    res.status(201),
    user
  );
}

export async function login(req, res) {
  const email = normalizedEmail(
    req.body?.email
  );

  const password = req.body?.password || "";

  if (
    !email ||
    !validatePassword(password)
  ) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  const user = await User.findOne({
    email,
  }).select("+password");

  if (
    !user ||
    !(await bcrypt.compare(
      password,
      user.password
    ))
  ) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      message:
        "This account is inactive. Please contact an administrator.",
    });
  }

  user.lastLogin = new Date();

  await user.save();

  return sendSession(res, user);
}

export async function me(req, res) {
  res.set("Cache-Control", "no-store");

  res.json({
    user: publicUser(req.user),
  });
}

export function logout(req, res) {
  const opts = {
    path: "/",
    secure:
      process.env.NODE_ENV === "production",
    sameSite:
      process.env.COOKIE_SAMESITE || "Lax",
    maxAge: 0,
  };

  res.setHeader("Set-Cookie", [
    cookie("bb_token", "", {
      ...opts,
      httpOnly: true,
    }),

    cookie("bb_csrf", "", opts),
  ]);

  res.json({
    ok: true,
  });
}