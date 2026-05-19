import { userModel } from "./../models/user.model";
import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import { env } from "./config";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.BASE_URL}/auth/google/callback`,
    },

    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(null, false);

        // first check if the user exists with the googleId??
        let user = await userModel
          .findOne({
            googleId: profile.id,
          })
          .select("+googleId");
        if (user) return done(null, user);

        // if the user doesn't exists with the googleId, but exists with the same email, then update the user's data by setting up googleId and user's profile-picture!
        user = await userModel.findOne({
          email,
        });
        if (user) {
          user.googleId = profile.id;
          user.avatar = profile.photos?.[0]?.value;
          await user.save();
          return done(null, user);
        }

        // if user doesn't exists with neither googleId nor email, create a completely new user from start

        user = await userModel.create({
          email,
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value,
          isEmailVerified: true,
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    },
  ),
);

export default passport;
