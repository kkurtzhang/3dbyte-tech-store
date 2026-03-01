import { MedusaService } from "@medusajs/framework/utils";
import { AuthUser } from "./models/user";

class AuthModuleService extends MedusaService({
  AuthUser,
}) {
  async findOrCreateUser(googleId: string, email: string, profile: any) {
    // Check if user exists by google_id
    let user = await this.listAuthUsers({
      filters: {
        google_id: googleId,
      },
    });

    if (user && user.length > 0) {
      return user[0];
    }

    // Check if user exists by email
    user = await this.listAuthUsers({
      filters: {
        email: email,
      },
    });

    if (user && user.length > 0) {
      // Update existing user with google_id
      const updatedUser = await this.updateAuthUsers({
        id: user[0].id,
        google_id: googleId,
        avatar_url: profile.picture,
      });
      return updatedUser[0];
    }

    // Create new user
    const newUser = await this.createAuthUsers({
      email,
      first_name: profile.given_name,
      last_name: profile.family_name,
      google_id: googleId,
      avatar_url: profile.picture,
    });

    return newUser;
  }

  async generateToken(user: any) {
    const jwt = require("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "supersecret";
    
    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
      },
      secret,
      { expiresIn: "7d" }
    );

    return token;
  }
}

export default AuthModuleService;
