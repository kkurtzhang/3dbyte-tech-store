import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

interface GoogleAuthRequestBody {
  code: string;
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/auth/google/callback";

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      message: "Google OAuth not configured. Set GOOGLE_CLIENT_ID environment variable.",
    });
  }

  // Return the Google OAuth URL for the frontend
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL)}&response_type=code&scope=openid%20profile%20email`;

  res.json({
    auth_url: googleAuthUrl,
  });
}

export async function POST(
  req: MedusaRequest<GoogleAuthRequestBody>,
  res: MedusaResponse
) {
  const authModule = req.scope.resolve<any>("authModuleService");
  const { code } = req.body as GoogleAuthRequestBody;

  if (!code) {
    return res.status(400).json({
      message: "Authorization code is required",
    });
  }

  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:8000/auth/google/callback";

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        message: "Google OAuth not configured",
      });
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to exchange token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userInfo = await userInfoResponse.json();

    // Find or create user
    const user = await authModule.findOrCreateUser(
      userInfo.id,
      userInfo.email,
      userInfo
    );

    // Generate JWT token
    const token = await authModule.generateToken(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
      },
      token,
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).json({
      message: "Authentication failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
